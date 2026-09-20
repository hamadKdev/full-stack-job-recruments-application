
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import (
    Security,
    Depends,
    FastAPI,
    UploadFile,
    File,
    HTTPException
)
from fastapi.middleware.cors import CORSMiddleware

from database import supabase
from auth import hash_password, verify_password, create_token, get_user
from models import SignupData, LoginData, JobData, StageData, InterviewData

from datetime import date, datetime, timedelta

import os
import requests
import uuid


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

    webhook = os.getenv("N8N_WEBHOOK_URL")

    if not webhook:
        return

    try:
        requests.post(
            webhook,
            json={
                "event_type": event_type,
                "application_id": application_id
            },
            timeout=10
        )

    except Exception as e:
        print("n8n error:", e)


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

    recruiters = []

    for recruiter in recruiters_result.data:

        # Get jobs assigned to this recruiter
        assignments = (
            supabase
            .table("job_recruiters")
            .select("job_id")
            .eq(
                "recruiter_id",
                recruiter["id"]
            )
            .execute()
        )

        assigned_jobs = []

        for assignment in assignments.data:

            job_result = (
                supabase
                .table("jobs")
                .select("*")
                .eq(
                    "id",
                    assignment["job_id"]
                )
                .execute()
            )

            if job_result.data:
                assigned_jobs.append(
                    job_result.data[0]
                )

        recruiters.append({
            "id": recruiter["id"],
            "name": recruiter["name"],
            "email": recruiter["email"],
            "phone": recruiter["phone"],
            "is_active": recruiter["is_active"],
            "role": recruiter["role"],
            "assigned_jobs": assigned_jobs
        })

    return recruiters


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
# ADMIN — ASSIGN RECRUITER
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

    recruiter = (
        supabase
        .table("users")
        .select("*")
        .eq("id", recruiter_id)
        .eq("role", "recruiter")
        .execute()
    )

    if not recruiter.data:

        raise HTTPException(
            status_code=404,
            detail="Recruiter not found"
        )

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

    # Check job
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
        .eq("candidate_id", user["user_id"])
        .eq("job_id", job_id)
        .neq("stage", "Withdrawn")
        .execute()
    )

    if existing.data:
        raise HTTPException(
            status_code=400,
            detail="You already applied for this job"
        )

    # Generate unique CV filename
    filename = f"{uuid.uuid4()}.pdf"

    # Upload CV first
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

    # Create application with CV URL
    try:

        application = (
            supabase
            .table("applications")
            .insert({
                "candidate_id": user["user_id"],
                "job_id": job_id,
                "cv_url": filename,
                "stage": "Applied"
            })
            .execute()
        )

    except Exception as e:

        # Delete uploaded CV if database insert fails
        try:
            supabase.storage.from_("cvs").remove([filename])
        except:
            pass

        raise HTTPException(
            status_code=500,
            detail=f"Application could not be created: {str(e)}"
        )

    if not application.data:

        try:
            supabase.storage.from_("cvs").remove([filename])
        except:
            pass

        raise HTTPException(
            status_code=500,
            detail="Application could not be created"
        )

    application_id = application.data[0]["id"]

    # Send automation email
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
        .eq("candidate_id", user["user_id"])
        .execute()
    )

    return result.data


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
        .eq("id", application_id)
        .eq("candidate_id", user["user_id"])
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
        .eq("id", application_id)
        .execute()
    )

    return {
        "message": "Application withdrawn",
        "application": updated.data
    }


# ===================================================
# RECRUITER — ASSIGNED JOBS
# ===================================================

@app.get("/recruiter/jobs")
def recruiter_jobs(
    user: dict = Depends(get_current_user)
):

    require_role(user, "recruiter")

    result = (
        supabase
        .table("job_recruiters")
        .select("*, jobs(*)")
        .eq("recruiter_id", user["user_id"])
        .execute()
    )

    return result.data


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

    assignment = (
        supabase
        .table("job_recruiters")
        .select("*")
        .eq("job_id", job_id)
        .eq("recruiter_id", user["user_id"])
        .execute()
    )

    if not assignment.data:

        raise HTTPException(
            status_code=403,
            detail="You are not assigned to this job"
        )

    result = (
        supabase
        .table("applications")
        .select("*, users(*), jobs(*)")
        .eq("job_id", job_id)
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
        .eq("id", application_id)
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
        .eq("job_id", job_id)
        .eq("recruiter_id", user["user_id"])
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
        .eq("id", application_id)
        .execute()
    )

    if new_stage == "Interview":

        send_n8n_email(
            "interview_stage",
            application_id
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
            .eq("id", job_id)
            .execute()
        )

        if job_result.data:

            job = job_result.data[0]

            hired_result = (
                supabase
                .table("applications")
                .select("id")
                .eq("job_id", job_id)
                .eq("stage", "Hired")
                .execute()
            )

            hired_count = len(hired_result.data)

            if hired_count >= job["openings"]:

                supabase.table("jobs").update({
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

                    supabase.table("applications").update({
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
        .eq("id", application_id)
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
        .eq("job_id", job_id)
        .eq("recruiter_id", user["user_id"])
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
        .eq("recruiter_id", user["user_id"])
        .eq("interview_date", data.interview_date)
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

    supabase.table("applications").update({
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
        .eq("id", application_id)
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

    jobs = (
        supabase
        .table("jobs")
        .select("*")
        .execute()
    )

    applications = (
        supabase
        .table("applications")
        .select("*")
        .execute()
    )

    recruiters = (
        supabase
        .table("users")
        .select("id")
        .eq("role", "recruiter")
        .execute()
    )

    return {
        "total_jobs": len(jobs.data),

        "open_jobs": len([
            j for j in jobs.data
            if j["status"] == "Open"
        ]),

        "closed_jobs": len([
            j for j in jobs.data
            if j["status"] == "Closed"
        ]),

        "total_applications": len(
            applications.data
        ),

        "applied": len([
            a for a in applications.data
            if a["stage"] == "Applied"
        ]),

        "shortlisted": len([
            a for a in applications.data
            if a["stage"] == "Shortlisted"
        ]),

        "interview": len([
            a for a in applications.data
            if a["stage"] == "Interview"
        ]),

        "offer": len([
            a for a in applications.data
            if a["stage"] == "Offer"
        ]),

        "hired": len([
            a for a in applications.data
            if a["stage"] == "Hired"
        ]),

        "rejected": len([
            a for a in applications.data
            if a["stage"] == "Rejected"
        ]),

        "withdrawn": len([
            a for a in applications.data
            if a["stage"] == "Withdrawn"
        ]),

        "total_recruiters": len(
            recruiters.data
        )
    }



