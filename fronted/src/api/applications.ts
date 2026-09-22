import { apiClient } from './client';
import { Application, AISummary, AISummaryStatus } from '../types';

export async function getMyApplications(): Promise<Application[]> {
  return apiClient<Application[]>('/my-applications', {
    method: 'GET',
  });
}

export async function withdrawApplication(
  applicationId: string
): Promise<{ message: string; [key: string]: any }> {
  return apiClient(`/applications/${applicationId}/withdraw`, {
    method: 'POST',
  });
}

export async function getRecruiterApplications(jobId: string): Promise<Application[]> {
  return apiClient<Application[]>(`/recruiter/jobs/${jobId}/applications`, {
    method: 'GET',
  });
}

export async function getAIApplicationSummary(applicationId: string): Promise<{
  ai_summary_status: AISummaryStatus;
  ai_summary?: AISummary | null;
  ai_summary_generated_at?: string;
  [key: string]: any;
}> {
  return apiClient(`/applications/${applicationId}/ai-summary`, {
    method: 'GET',
  });
}

export async function retryAISummary(applicationId: string): Promise<{
  message?: string;
  ai_summary_status?: AISummaryStatus;
  [key: string]: any;
}> {
  return apiClient(`/applications/${applicationId}/ai-summary/retry`, {
    method: 'POST',
  });
}

