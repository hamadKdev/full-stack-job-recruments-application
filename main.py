from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import (
    Security,
    Depends,
    FastAPI,
    UploadFile,
    File,
    HTTPException,
    Header
)
from fastapi.middleware.cors import CORSMiddleware

from database import supabase
from auth import hash_password, verify_password, create_token, get_user
from models import SignupData, LoginData, JobData, StageData, InterviewData

from datetime import date, datetime, timedelta

import os
import requests
import uuid
import secrets


app = FastAPI(
    title="Job Recruitment / Applicant Tracking System"
)

security = HTTPBearer()


# ===================================================
# CORS
# ===================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ===================================================
# HELPER FUNCTIONS
# ===================================================

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security)
):
    token = credentials.credentials

    user = get_user(token)

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

    return user


def require_role(user, role):

    if user.get("role") != role:
        raise HTTPException(
            status_code=403,
            detail=f"{role} access required"
        )


def send_n8n_email(event_type, application_id):
    """
    Send an event to the existing n8n webhook.

    The same webhook handles:
    - application_received
    - interview_scheduled
    - hired
    - rejected
    - ai_summary_retry

    For application_received / retry, extra application information is
    included so n8n can download the CV and run the AI summary workflow.
    """
    webhook = os.getenv("N8N_WEBHOOK_URL")

    if not webhook:
        print("N8N_WEBHOOK_URL is not configured")
        return False

    try:
        application_result = (
            supabase
            .table("applications")
            .select("*")
            .eq("id", application_id)
            .execute()
        )

        if not application_result.data:
            print("Application not found for n8n:", application_id)
            return False

        application = application_result.data[0]

        job_result = (
            supabase
            .table("jobs")
            .select("*")
            .eq("id", application["job_id"])
            .execute()
        )

        job = job_result.data[0] if job_result.data else {}

        candidate_result = (
            supabase
            .table("users")
            .select("id,name,email")
            .eq("id", application["candidate_id"])
            .execute()
        )

        candidate = candidate_result.data[0] if candidate_result.data else {}

        payload = {
            "event_type": event_type,
            "application_id": application_id,
            "candidate_id": application.get("candidate_id"),
            "candidate_name": candidate.get("name"),
            "email": candidate.get("email"),
            "job_id": application.get("job_id"),
            "job_title": job.get("title"),
            "job_requirements": job.get("requirements"),
            "job_qualifications": job.get("qualifications"),
            "cv_filename": application.get("cv_url"),
        }

        # Create a short-lived signed URL for n8n to download the CV.
        # The CV bucket can remain private.
        cv_filename = application.get("cv_url")
        if cv_filename:
            try:
                signed = (
                    supabase.storage
                    .from_("cvs")
                    .create_signed_url(cv_filename, 600)
                )

                if isinstance(signed, dict):
                    payload["cv_signed_url"] = (
                        signed.get("signedURL")
                        or signed.get("signedUrl")
                        or signed.get("signed_url")
                    )
            except Exception as e:
                print("Could not create CV signed URL:", e)

        response = requests.post(
            webhook,
            json=payload,
            timeout=10
        )

        response.raise_for_status()
        return True

    except Exception as e:
        print("n8n error:", e)
        return False


def trigger_ai_summary(application_id, event_type="ai_summary_retry"):
    """
    Trigger only the AI summary branch.

    This is deliberately separate from application_received so a retry
    never sends another application-received email.
    """
    return send_n8n_email(event_type, application_id)


def get_n8n_callback_secret():
    return os.getenv("N8N_CALLBACK_SECRET", "")


def verify_n8n_callback(secret_header):
    expected = get_n8n_callback_secret()

    if not expected or not secret_header:
        return False

    return secrets.compare_digest(
        str(secret_header),
        str(expected)
    )


def check_job_open(job):

    if job["status"] != "Open":
        return False

    if str(date.today()) > str(job["last_date"]):
        return False

    return True


# ===================================================
# ROOT
# ===================================================

@app.get("/")
def home():

    return {
        "message": "Job Recruitment / Applicant Tracking System API is running"
    }


# ===================================================
# AUTHENTICATION
# ===================================================

@app.post("/signup")
def signup(data: SignupData):

    existing = (
        supabase
        .table("users")
        .select("*")
        .eq("email", data.email)
        .execute()
    )

    if existing.data:

        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    password_hash = hash_password(data.password)

    result = (
        supabase
        .table("users")
        .insert({
            "name": data.name,
            "email": data.email,
            "phone": data.phone,
            "password_hash": password_hash,
            "role": "candidate",
            "is_active": True
        })
        .execute()
    )

    return {
        "message": "Candidate account created successfully",
        "user": result.data[0]
    }


@app.post("/login")
def login(data: LoginData):

    result = (
        supabase
        .table("users")
        .select("*")
        .eq("email", data.email)
        .execute()
    )

    if not result.data:

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    user = result.data[0]

    if not user.get("is_active", True):

        raise HTTPException(
            status_code=403,
            detail="Account is inactive"
        )

    if not verify_password(
        data.password,
        user["password_hash"]
    ):

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    token = create_token(
        user["id"],
        user["role"]
    )

    return {
        "message": "Login successful",
        "access_token": token,
        "token_type": "bearer",
        "role": user["role"],
        "user_id": user["id"]
    }


# ===================================================
# PUBLIC JOBS
# ===================================================

@app.get("/jobs")
def get_jobs():

    result = (
        supabase
        .table("jobs")
        .select("*")
        .eq("status", "Open")
        .execute()
    )

    jobs = []

    for job in result.data:

        if str(date.today()) > str(job["last_date"]):

            try:

                supabase.table("jobs").update({
                    "status": "Closed"
                }).eq(
                    "id",
                    job["id"]
                ).execute()

            except:
                pass

            continue

        jobs.append(job)

    return jobs


@app.get("/jobs/{job_id}")
def get_job(job_id: str):

    result = (
        supabase
        .table("jobs")
        .select("*")
        .eq("id", job_id)
        .execute()
    )

    if not result.data:

        raise HTTPException(
            status_code=404,
            detail="Job not found"
        )

    return result.data[0]


# ===================================================
# ADMIN — JOBS
# ===================================================

@app.post("/admin/jobs")
def create_job(
    data: JobData,
    user: dict = Depends(get_current_user)
):

    require_role(user, "admin")

    result = (
        supabase
        .table("jobs")
        .insert({
            "title": data.title,
            "department": data.department,
            "location": data.location,
            "job_type": data.job_type,
            "description": data.description,
            "requirements": data.requirements,
            "last_date": data.last_date,
            "openings": data.openings,
            "status": "Draft"
        })
        .execute()
    )

    return {
        "message": "Job created as Draft",
        "job": result.data[0]
    }


@app.post("/admin/jobs/{job_id}/open")
def open_job(
    job_id: str,
    user: dict = Depends(get_current_user)
):

    require_role(user, "admin")

    result = (
        supabase
        .table("jobs")
        .update({
            "status": "Open"
        })
        .eq("id", job_id)
        .execute()
    )

    if not result.data:

        raise HTTPException(
            status_code=404,
            detail="Job not found"
        )

    return {
        "message": "Job opened successfully"
    }


@app.post("/admin/jobs/{job_id}/close")
def close_job(
    job_id: str,
    user: dict = Depends(get_current_user)
):

    require_role(user, "admin")

    result = (
        supabase
        .table("jobs")
        .update({
            "status": "Closed"
        })
        .eq("id", job_id)
        .execute()
    )

    if not result.data:

        raise HTTPException(
            status_code=404,
            detail="Job not found"
        )

    return {
        "message": "Job closed successfully"
    }


@app.get("/admin/jobs")
def admin_jobs(
    user: dict = Depends(get_current_user)
):

    require_role(user, "admin")

    result = (
        supabase
        .table("jobs")
        .select("*")
        .execute()
    )

    return result.data


# ===================================================
# ADMIN — RECRUITERS
# ===================================================

@app.post("/admin/recruiters/{user_id}")
def make_recruiter(
    user_id: str,
    user: dict = Depends(get_current_user)
):

    require_role(user, "admin")

    result = (
        supabase
        .table("users")
        .update({
            "role": "recruiter"
        })
        .eq("id", user_id)
        .execute()
    )

    if not result.data:

        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    return {
        "message": "User is now a recruiter"
    }


# ===================================================
# GET ALL RECRUITERS + ASSIGNED JOBS
# ===================================================

@app.get("/admin/recruiters")
def get_recruiters(
    user: dict = Depends(get_current_user)
):

    require_role(user, "admin")

    # Get all recruiters
    recruiters_result = (
        supabase
        .table("users")
        .select(
            "id,name,email,phone,is_active,role"
        )
        .eq("role", "recruiter")
        .execute()
    )

    recruiters = recruiters_result.data or []

    if not recruiters:
        return []

    # Get recruiter IDs
    recruiter_ids = [
        recruiter["id"]
        for recruiter in recruiters
    ]

    # Get all assignments in one request
    assignments_result = (
        supabase
        .table("job_recruiters")
        .select("job_id,recruiter_id")
        .in_("recruiter_id", recruiter_ids)
        .execute()
    )

    assignments = assignments_result.data or []

    # Get all job IDs
    job_ids = list({
        assignment["job_id"]
        for assignment in assignments
    })

    jobs_by_id = {}

    # Get all assigned jobs in one request
    if job_ids:

        jobs_result = (
            supabase
            .table("jobs")
            .select("*")
            .in_("id", job_ids)
            .execute()
        )

        for job in jobs_result.data or []:

            jobs_by_id[job["id"]] = job

    # Build final recruiter response
    result = []

    for recruiter in recruiters:

        assigned_jobs = []

        for assignment in assignments:

            if assignment["recruiter_id"] == recruiter["id"]:

                job = jobs_by_id.get(
                    assignment["job_id"]
                )

                if job:
                    assigned_jobs.append(job)

        result.append({
            "id": recruiter["id"],
            "name": recruiter["name"],
            "email": recruiter["email"],
            "phone": recruiter["phone"],
            "is_active": recruiter["is_active"],
            "role": recruiter["role"],
            "assigned_jobs": assigned_jobs
        })

    return result


# ===================================================
# DEACTIVATE RECRUITER
# ===================================================

@app.post("/admin/recruiters/{user_id}/deactivate")
def deactivate_recruiter(
    user_id: str,
    user: dict = Depends(get_current_user)
):

    require_role(user, "admin")

    result = (
        supabase
        .table("users")
        .update({
            "is_active": False
        })
        .eq("id", user_id)
        .execute()
    )

    if not result.data:

        raise HTTPException(
            status_code=404,
            detail="Recruiter not found"
        )

    return {
        "message": "Recruiter deactivated"
    }


# ===================================================
# ADMIN — ASSIGN RECRUITER TO JOB
# ===================================================

@app.post(
    "/admin/jobs/{job_id}/recruiters/{recruiter_id}"
)
def assign_recruiter(
    job_id: str,
    recruiter_id: str,
    user: dict = Depends(get_current_user)
):

    require_role(user, "admin")

    # Check recruiter
    recruiter = (
        supabase
        .table("users")
        .select("id,name,email,role")
        .eq("id", recruiter_id)
        .eq("role", "recruiter")
        .execute()
    )

    if not recruiter.data:

        raise HTTPException(
            status_code=404,
            detail="Recruiter not found"
        )

    # Check job
    job = (
        supabase
        .table("jobs")
        .select("id,title")
        .eq("id", job_id)
        .execute()
    )

    if not job.data:

        raise HTTPException(
            status_code=404,
            detail="Job not found"
        )

    # Check duplicate assignment
    existing = (
        supabase
        .table("job_recruiters")
        .select("*")
        .eq("job_id", job_id)
        .eq("recruiter_id", recruiter_id)
        .execute()
    )

    if existing.data:

        return {
            "message": "Recruiter is already assigned to this job",
            "data": existing.data
        }

    # Create assignment
    result = (
        supabase
        .table("job_recruiters")
        .insert({
            "job_id": job_id,
            "recruiter_id": recruiter_id
        })
        .execute()
    )

    return {
        "message": "Recruiter assigned successfully",
        "data": result.data
    }


# ===================================================
# CANDIDATE — CV UPLOAD + APPLY
# ===================================================

@app.post("/jobs/{job_id}/apply")
async def apply_job(
    job_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):

    require_role(user, "candidate")

    # Check file type
    if file.content_type != "application/pdf":

        raise HTTPException(
            status_code=400,
            detail="Only PDF CV is allowed"
        )

    # Read CV
    cv_data = await file.read()

    # Maximum 2 MB
    if len(cv_data) > 2 * 1024 * 1024:

        raise HTTPException(
            status_code=400,
            detail="CV must be 2 MB or smaller"
        )

    # Get job
    job_result = (
        supabase
        .table("jobs")
        .select("*")
        .eq("id", job_id)
        .execute()
    )

    if not job_result.data:

        raise HTTPException(
            status_code=404,
            detail="Job not found"
        )

    job = job_result.data[0]

    # Check job status
    if not check_job_open(job):

        raise HTTPException(
            status_code=400,
            detail="This job is closed or expired"
        )

    # Check duplicate application
    existing = (
        supabase
        .table("applications")
        .select("*")
        .eq(
            "candidate_id",
            user["user_id"]
        )
        .eq(
            "job_id",
            job_id
        )
        .neq(
            "stage",
            "Withdrawn"
        )
        .execute()
    )

    if existing.data:

        raise HTTPException(
            status_code=400,
            detail="You already applied for this job"
        )

    # Generate unique filename
    filename = f"{uuid.uuid4()}.pdf"

    # Upload CV
    try:

        supabase.storage.from_("cvs").upload(
            filename,
            cv_data,
            {
                "content-type": "application/pdf"
            }
        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"CV upload failed: {str(e)}"
        )

    # Create application
    try:

        application = (
            supabase
            .table("applications")
            .insert({
                "candidate_id": user["user_id"],
                "job_id": job_id,
                "cv_url": filename,
                "stage": "Applied",
                "ai_summary": None,
                "ai_summary_status": "pending",
                "ai_summary_generated_at": None
            })
            .execute()
        )

    except Exception as e:

        try:

            supabase.storage.from_(
                "cvs"
            ).remove([filename])

        except:
            pass

        raise HTTPException(
            status_code=500,
            detail=f"Application could not be created: {str(e)}"
        )

    if not application.data:

        try:

            supabase.storage.from_(
                "cvs"
            ).remove([filename])

        except:
            pass

        raise HTTPException(
            status_code=500,
            detail="Application could not be created"
        )

    application_id = application.data[0]["id"]

    # Send email automation
    send_n8n_email(
        "application_received",
        application_id
    )

    return {
        "message": "Application submitted successfully",
        "application_id": application_id,
        "stage": "Applied",
        "cv_url": filename
    }


# ===================================================
# CANDIDATE — MY APPLICATIONS
# ===================================================

@app.get("/my-applications")
def my_applications(
    user: dict = Depends(get_current_user)
):

    require_role(user, "candidate")

    result = (
        supabase
        .table("applications")
        .select("*, jobs(*)")
        .eq(
            "candidate_id",
            user["user_id"]
        )
        .execute()
    )

    applications = result.data or []

    # AI summaries are private to admins and assigned recruiters.
    for application in applications:
        application.pop("ai_summary", None)
        application.pop("ai_summary_status", None)
        application.pop("ai_summary_generated_at", None)

    return applications


# ===================================================
# CANDIDATE — WITHDRAW
# ===================================================

@app.post(
    "/applications/{application_id}/withdraw"
)
def withdraw_application(
    application_id: str,
    user: dict = Depends(get_current_user)
):

    require_role(user, "candidate")

    result = (
        supabase
        .table("applications")
        .select("*")
        .eq(
            "id",
            application_id
        )
        .eq(
            "candidate_id",
            user["user_id"]
        )
        .execute()
    )

    if not result.data:

        raise HTTPException(
            status_code=404,
            detail="Application not found"
        )

    application = result.data[0]

    if application["stage"] in [
        "Hired",
        "Rejected"
    ]:

        raise HTTPException(
            status_code=400,
            detail="This application cannot be withdrawn"
        )

    updated = (
        supabase
        .table("applications")
        .update({
            "stage": "Withdrawn"
        })
        .eq(
            "id",
            application_id
        )
        .execute()
    )

    return {
        "message": "Application withdrawn",
        "application": updated.data
    }


# ===================================================
# AI CV SUMMARY — INTERNAL n8n CALLBACK
# ===================================================

@app.post("/internal/ai-summary")
def save_ai_summary(
    payload: dict,
    x_n8n_secret: str = Header(default="")
):
    """
    n8n calls this endpoint after the AI creates the summary.

    n8n must send the secret in:
    X-N8N-Secret: <N8N_CALLBACK_SECRET>

    Expected JSON:
    {
        "application_id": "...",
        "status": "completed",
        "summary": {
            "short_profile": ["...", "..."],
            "requirements_mentioned": ["..."],
            "requirements_not_found": ["..."],
            "interview_questions": ["...", "...", "..."]
        }
    }

    No JWT is used here because n8n is a server-to-server caller.
    The secret protects this endpoint.
    """
    if not verify_n8n_callback(x_n8n_secret):
        raise HTTPException(
            status_code=401,
            detail="Invalid n8n callback secret"
        )

    application_id = payload.get("application_id")
    status = payload.get("status", "completed")

    if not application_id:
        raise HTTPException(
            status_code=400,
            detail="application_id is required"
        )

    if status == "failed":
        result = (
            supabase
            .table("applications")
            .update({
                "ai_summary": None,
                "ai_summary_status": "failed"
            })
            .eq("id", application_id)
            .execute()
        )

        if not result.data:
            raise HTTPException(
                status_code=404,
                detail="Application not found"
            )

        return {
            "message": "AI summary marked as failed",
            "application_id": application_id
        }

    summary = payload.get("summary")

    if not summary:
        raise HTTPException(
            status_code=400,
            detail="summary is required"
        )

    # Keep the stored structure limited to the exact 3 PRD sections.
    clean_summary = {
        "short_profile": summary.get("short_profile", []),
        "requirements_mentioned": summary.get(
            "requirements_mentioned",
            []
        ),
        "requirements_not_found": summary.get(
            "requirements_not_found",
            []
        ),
        "interview_questions": summary.get(
            "interview_questions",
            []
        )
    }

    # Exactly 3 interview questions are required by the PRD.
    questions = clean_summary["interview_questions"][:3]

    while len(questions) < 3:
        questions.append("")

    clean_summary["interview_questions"] = questions

    result = (
        supabase
        .table("applications")
        .update({
            "ai_summary": clean_summary,
            "ai_summary_status": "completed",
            "ai_summary_generated_at": datetime.utcnow().isoformat()
        })
        .eq("id", application_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=404,
            detail="Application not found"
        )

    return {
        "message": "AI summary saved successfully",
        "application_id": application_id,
        "ai_summary_status": "completed"
    }


# ===================================================
# AI CV SUMMARY — RETRY
# ===================================================

@app.post("/applications/{application_id}/ai-summary/retry")
def retry_ai_summary(
    application_id: str,
    user: dict = Depends(get_current_user)
):
    """
    Retry AI summary for an assigned recruiter or admin.

    This endpoint ONLY triggers ai_summary_retry.
    It does NOT send application_received again.
    """
    if user.get("role") not in ["recruiter", "admin"]:
        raise HTTPException(
            status_code=403,
            detail="Recruiter or admin access required"
        )

    application_result = (
        supabase
        .table("applications")
        .select("*")
        .eq("id", application_id)
        .execute()
    )

    if not application_result.data:
        raise HTTPException(
            status_code=404,
            detail="Application not found"
        )

    application = application_result.data[0]

    if user.get("role") == "recruiter":
        assignment = (
            supabase
            .table("job_recruiters")
            .select("*")
            .eq("job_id", application["job_id"])
            .eq("recruiter_id", user["user_id"])
            .execute()
        )

        if not assignment.data:
            raise HTTPException(
                status_code=403,
                detail="You are not assigned to this job"
            )

    # Mark pending before triggering n8n.
    supabase.table("applications").update({
        "ai_summary": None,
        "ai_summary_status": "pending",
        "ai_summary_generated_at": None
    }).eq("id", application_id).execute()

    sent = trigger_ai_summary(
        application_id,
        "ai_summary_retry"
    )

    if not sent:
        supabase.table("applications").update({
            "ai_summary_status": "failed"
        }).eq("id", application_id).execute()

        raise HTTPException(
            status_code=502,
            detail="Could not trigger AI summary workflow"
        )

    return {
        "message": "AI summary retry started",
        "application_id": application_id,
        "ai_summary_status": "pending"
    }


# ===================================================
# ADMIN — APPLICATION / AI SUMMARY
# ===================================================

@app.get("/admin/applications/{application_id}")
def admin_application(
    application_id: str,
    user: dict = Depends(get_current_user)
):
    require_role(user, "admin")

    result = (
        supabase
        .table("applications")
        .select("*, jobs(*)")
        .eq("id", application_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=404,
            detail="Application not found"
        )

    return result.data[0]


# ===================================================
# RECRUITER — ASSIGNED JOBS
# ===================================================

@app.get("/recruiter/jobs")
def recruiter_jobs(
    user: dict = Depends(get_current_user)
):

    require_role(user, "recruiter")

    recruiter_id = user["user_id"]

    # Get assigned job IDs
    assignments_result = (
        supabase
        .table("job_recruiters")
        .select("job_id")
        .eq(
            "recruiter_id",
            recruiter_id
        )
        .execute()
    )

    assignments = assignments_result.data or []

    if not assignments:
        return []

    # Get job IDs
    job_ids = list({
        assignment["job_id"]
        for assignment in assignments
    })

    # Get all jobs in one request
    jobs_result = (
        supabase
        .table("jobs")
        .select("*")
        .in_(
            "id",
            job_ids
        )
        .execute()
    )

    return jobs_result.data or []


# ===================================================
# RECRUITER — APPLICATIONS
# ===================================================

@app.get(
    "/recruiter/jobs/{job_id}/applications"
)
def recruiter_applications(
    job_id: str,
    user: dict = Depends(get_current_user)
):

    require_role(user, "recruiter")

    recruiter_id = user["user_id"]

    # Check assignment
    assignment = (
        supabase
        .table("job_recruiters")
        .select(
            "job_id,recruiter_id"
        )
        .eq(
            "job_id",
            job_id
        )
        .eq(
            "recruiter_id",
            recruiter_id
        )
        .execute()
    )

    if not assignment.data:

        raise HTTPException(
            status_code=403,
            detail="You are not assigned to this job"
        )

    # Get applications
    result = (
        supabase
        .table("applications")
        .select("*")
        .eq(
            "job_id",
            job_id
        )
        .execute()
    )

    return result.data


# ===================================================
# RECRUITER — APPLICATION STAGE
# ===================================================

@app.post(
    "/applications/{application_id}/stage"
)
def change_stage(
    application_id: str,
    data: StageData,
    user: dict = Depends(get_current_user)
):

    require_role(user, "recruiter")

    application_result = (
        supabase
        .table("applications")
        .select("*")
        .eq(
            "id",
            application_id
        )
        .execute()
    )

    if not application_result.data:

        raise HTTPException(
            status_code=404,
            detail="Application not found"
        )

    application = application_result.data[0]

    job_id = application["job_id"]

    assignment = (
        supabase
        .table("job_recruiters")
        .select("*")
        .eq(
            "job_id",
            job_id
        )
        .eq(
            "recruiter_id",
            user["user_id"]
        )
        .execute()
    )

    if not assignment.data:

        raise HTTPException(
            status_code=403,
            detail="You are not assigned to this job"
        )

    current_stage = application["stage"]
    new_stage = data.stage

    allowed_stages = [
        "Applied",
        "Shortlisted",
        "Interview",
        "Offer",
        "Hired",
        "Rejected"
    ]

    if new_stage not in allowed_stages:

        raise HTTPException(
            status_code=400,
            detail="Invalid stage"
        )

    if new_stage == "Rejected":

        if current_stage in [
            "Hired",
            "Rejected"
        ]:

            raise HTTPException(
                status_code=400,
                detail="Final stage cannot be changed"
            )

    elif new_stage == "Hired":

        if current_stage != "Offer":

            raise HTTPException(
                status_code=400,
                detail="Application must be in Offer stage before Hired"
            )

    else:

        stages = {
            "Applied": 1,
            "Shortlisted": 2,
            "Interview": 3,
            "Offer": 4,
            "Hired": 5,
            "Rejected": 5
        }

        if current_stage not in stages:

            raise HTTPException(
                status_code=400,
                detail="Invalid current stage"
            )

        if stages[new_stage] != stages[current_stage] + 1:

            raise HTTPException(
                status_code=400,
                detail="You can only move forward one stage at a time"
            )

    updated = (
        supabase
        .table("applications")
        .update({
            "stage": new_stage
        })
        .eq(
            "id",
            application_id
        )
        .execute()
    )


    if new_stage == "Hired":

        send_n8n_email(
            "hired",
            application_id
        )

        job_result = (
            supabase
            .table("jobs")
            .select("*")
            .eq(
                "id",
                job_id
            )
            .execute()
        )

        if job_result.data:

            job = job_result.data[0]

            hired_result = (
                supabase
                .table("applications")
                .select("id")
                .eq(
                    "job_id",
                    job_id
                )
                .eq(
                    "stage",
                    "Hired"
                )
                .execute()
            )

            hired_count = len(
                hired_result.data
            )

            if hired_count >= job["openings"]:

                supabase.table(
                    "jobs"
                ).update({
                    "status": "Closed"
                }).eq(
                    "id",
                    job_id
                ).execute()

                remaining = (
                    supabase
                    .table("applications")
                    .select("id")
                    .not_.in_(
                        "stage",
                        [
                            "Hired",
                            "Rejected",
                            "Withdrawn"
                        ]
                    )
                    .eq(
                        "job_id",
                        job_id
                    )
                    .execute()
                )

                for app in remaining.data:

                    supabase.table(
                        "applications"
                    ).update({
                        "stage": "Rejected"
                    }).eq(
                        "id",
                        app["id"]
                    ).execute()

                    send_n8n_email(
                        "rejected",
                        app["id"]
                    )

    if new_stage == "Rejected":

        send_n8n_email(
            "rejected",
            application_id
        )

    return {
        "message": "Application stage updated",
        "application": updated.data
    }


# ===================================================
# RECRUITER — INTERVIEW
# ===================================================

@app.post(
    "/applications/{application_id}/interview"
)
def schedule_interview(
    application_id: str,
    data: InterviewData,
    user: dict = Depends(get_current_user)
):

    require_role(user, "recruiter")

    app_result = (
        supabase
        .table("applications")
        .select("*")
        .eq(
            "id",
            application_id
        )
        .execute()
    )

    if not app_result.data:

        raise HTTPException(
            status_code=404,
            detail="Application not found"
        )

    application = app_result.data[0]

    if application["stage"] not in [
        "Shortlisted",
        "Interview"
    ]:

        raise HTTPException(
            status_code=400,
            detail="Applicant must be Shortlisted before interview"
        )

    job_id = application["job_id"]

    assignment = (
        supabase
        .table("job_recruiters")
        .select("*")
        .eq(
            "job_id",
            job_id
        )
        .eq(
            "recruiter_id",
            user["user_id"]
        )
        .execute()
    )

    if not assignment.data:

        raise HTTPException(
            status_code=403,
            detail="You are not assigned to this job"
        )

    interview_date = datetime.strptime(
        data.interview_date,
        "%Y-%m-%d"
    ).date()

    start_time = datetime.strptime(
        data.start_time,
        "%H:%M"
    )

    interview_start = datetime.combine(
        interview_date,
        start_time.time()
    )

    if interview_start <= datetime.now():

        raise HTTPException(
            status_code=400,
            detail="Interview time must be in the future"
        )

    interview_end = (
        interview_start +
        timedelta(hours=1)
    )

    existing = (
        supabase
        .table("interviews")
        .select("*")
        .eq(
            "recruiter_id",
            user["user_id"]
        )
        .eq(
            "interview_date",
            data.interview_date
        )
        .execute()
    )

    for interview in existing.data:

        existing_start = datetime.strptime(
            interview["start_time"][:5],
            "%H:%M"
        )

        existing_date = datetime.strptime(
            interview["interview_date"],
            "%Y-%m-%d"
        ).date()

        existing_datetime = datetime.combine(
            existing_date,
            existing_start.time()
        )

        existing_end = (
            existing_datetime +
            timedelta(hours=1)
        )

        if (
            interview_start < existing_end
            and interview_end > existing_datetime
        ):

            raise HTTPException(
                status_code=400,
                detail="Recruiter already has an interview at this time"
            )

    result = (
        supabase
        .table("interviews")
        .insert({
            "application_id": application_id,
            "recruiter_id": user["user_id"],
            "interview_date": data.interview_date,
            "start_time": data.start_time,
            "end_time": interview_end.strftime("%H:%M"),
            "location": data.location,
            "meeting_link": data.meeting_link
        })
        .execute()
    )

    supabase.table(
        "applications"
    ).update({
        "stage": "Interview"
    }).eq(
        "id",
        application_id
    ).execute()

    send_n8n_email(
        "interview_scheduled",
        application_id
    )

    return {
        "message": "Interview scheduled successfully",
        "interview": result.data
    }


# ===================================================
# RECRUITER — NOTES
# ===================================================

@app.post(
    "/applications/{application_id}/notes"
)
def add_note(
    application_id: str,
    note: str,
    user: dict = Depends(get_current_user)
):

    require_role(user, "recruiter")

    application_result = (
        supabase
        .table("applications")
        .select("*")
        .eq(
            "id",
            application_id
        )
        .execute()
    )

    if not application_result.data:

        raise HTTPException(
            status_code=404,
            detail="Application not found"
        )

    application = application_result.data[0]

    assignment = (
        supabase
        .table("job_recruiters")
        .select("*")
        .eq(
            "job_id",
            application["job_id"]
        )
        .eq(
            "recruiter_id",
            user["user_id"]
        )
        .execute()
    )

    if not assignment.data:

        raise HTTPException(
            status_code=403,
            detail="You are not assigned to this job"
        )

    result = (
        supabase
        .table("recruiter_notes")
        .insert({
            "application_id": application_id,
            "recruiter_id": user["user_id"],
            "note": note
        })
        .execute()
    )

    return {
        "message": "Note added successfully",
        "note": result.data
    }


# ===================================================
# ADMIN DASHBOARD
# ===================================================

@app.get("/admin/dashboard")
def admin_dashboard(
    user: dict = Depends(get_current_user)
):

    require_role(user, "admin")

    # Get all jobs
    jobs_result = (
        supabase
        .table("jobs")
        .select("id,status")
        .execute()
    )

    # Get all applications
    applications_result = (
        supabase
        .table("applications")
        .select("id,stage")
        .execute()
    )

    # Get all recruiters
    recruiters_result = (
        supabase
        .table("users")
        .select("id")
        .eq(
            "role",
            "recruiter"
        )
        .execute()
    )

    jobs = jobs_result.data or []
    applications = applications_result.data or []
    recruiters = recruiters_result.data or []

    return {
        "total_jobs": len(jobs),

        "open_jobs": sum(
            1
            for job in jobs
            if job.get("status") == "Open"
        ),

        "closed_jobs": sum(
            1
            for job in jobs
            if job.get("status") == "Closed"
        ),

        "total_applications": len(
            applications
        ),

        "applied": sum(
            1
            for app in applications
            if app.get("stage") == "Applied"
        ),

        "shortlisted": sum(
            1
            for app in applications
            if app.get("stage") == "Shortlisted"
        ),

        "interview": sum(
            1
            for app in applications
            if app.get("stage") == "Interview"
        ),

        "offer": sum(
            1
            for app in applications
            if app.get("stage") == "Offer"
        ),

        "hired": sum(
            1
            for app in applications
            if app.get("stage") == "Hired"
        ),

        "rejected": sum(
            1
            for app in applications
            if app.get("stage") == "Rejected"
        ),

        "withdrawn": sum(
            1
            for app in applications
            if app.get("stage") == "Withdrawn"
        ),

        "total_recruiters": len(
            recruiters
        )
    }

