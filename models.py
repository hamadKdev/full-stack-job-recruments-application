from pydantic import BaseModel, EmailStr


class SignupData(BaseModel):
    name: str
    email: EmailStr
    phone: str
    password: str


class LoginData(BaseModel):
    email: EmailStr
    password: str


class JobData(BaseModel):
    title: str
    department: str
    location: str
    job_type: str
    description: str
    requirements: str
    last_date: str
    openings: int


class StageData(BaseModel):
    stage: str


class InterviewData(BaseModel):
    interview_date: str
    start_time: str
    location: str = ""
    meeting_link: str = ""
    