export type UserRole = 'candidate' | 'recruiter' | 'admin';

export interface AuthResponse {
  message: string;
  access_token: string;
  token_type: string;
  role: UserRole;
  user_id: string;
}

export interface UserSession {
  token: string;
  role: UserRole;
  userId: string;
  email?: string;
  name?: string;
}

export type JobStatus = 'Draft' | 'Open' | 'Closed';

export type JobType = 'Full-time' | 'Part-time' | 'Internship' | string;

export interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  job_type: JobType;
  description: string;
  requirements: string;
  last_date: string;
  openings: number;
  status: JobStatus;
  created_at?: string;
  assigned_recruiters?: string[];
}

export type ApplicationStage =
  | 'Applied'
  | 'Shortlisted'
  | 'Interview'
  | 'Offer'
  | 'Hired'
  | 'Rejected'
  | 'Withdrawn';

export type AISummaryStatus = 'pending' | 'completed' | 'failed' | string;

export interface AISummary {
  short_profile?: string[];
  requirements_mentioned?: string[];
  requirements_not_found?: string[];
  interview_questions?: string[];
}

export interface Application {
  id: string;
  job_id: string;
  user_id?: string;
  job_title?: string;
  department?: string;
  location?: string;
  candidate_name?: string;
  candidate_email?: string;
  candidate_phone?: string;
  stage: ApplicationStage;
  cv_url?: string;
  cv_path?: string;
  notes?: string;
  interview_date?: string;
  interview_time?: string;
  interview_location?: string;
  meeting_link?: string;
  created_at?: string;
  status?: string;
  ai_summary_status?: AISummaryStatus;
  ai_summary?: AISummary | null;
  ai_summary_generated_at?: string;
}

export interface Recruiter {
  id: string;
  user_id?: string;
  name: string;
  email: string;
  phone?: string;
  is_active?: boolean;
  active?: boolean;
  role: string;
}

export interface AdminDashboardData {
  total_jobs?: number;
  open_jobs?: number;
  closed_jobs?: number;
  total_applications?: number;
  applied?: number;
  shortlisted?: number;
  interview?: number;
  offer?: number;
  hired?: number;
  rejected?: number;
  withdrawn?: number;
  total_recruiters?: number;
  [key: string]: any;
}

export interface InterviewSchedulePayload {
  interview_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  location?: string;
  meeting_link?: string;
}

export interface JobCreatePayload {
  title: string;
  department: string;
  location: string;
  job_type: string;
  description: string;
  requirements: string;
  last_date: string;
  openings: number;
}
