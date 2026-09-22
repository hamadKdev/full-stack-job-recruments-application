import { apiClient } from './client';
import { Application, InterviewSchedulePayload, Job } from '../types';

export async function getRecruiterJobs(): Promise<Job[]> {
  return apiClient<Job[]>('/recruiter/jobs', {
    method: 'GET',
  });
}

export async function getRecruiterApplications(jobId: string): Promise<Application[]> {
  return apiClient<Application[]>(`/recruiter/jobs/${jobId}/applications`, {
    method: 'GET',
  });
}

export async function updateApplicationStage(
  applicationId: string,
  stage: string
): Promise<{ message: string; [key: string]: any }> {
  return apiClient(`/applications/${applicationId}/stage`, {
    method: 'POST',
    body: JSON.stringify({ stage }),
  });
}

export async function scheduleInterview(
  applicationId: string,
  data: InterviewSchedulePayload
): Promise<{ message: string; [key: string]: any }> {
  return apiClient(`/applications/${applicationId}/interview`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function addApplicationNote(
  applicationId: string,
  note: string
): Promise<{ message: string; [key: string]: any }> {
  // Pass note as query parameter
  return apiClient(`/applications/${applicationId}/notes`, {
    method: 'POST',
    params: { note },
  });
}

export { getAIApplicationSummary, retryAISummary } from './applications';

