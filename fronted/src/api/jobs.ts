import { apiClient } from './client';
import { Job } from '../types';

export async function getJobs(): Promise<Job[]> {
  return apiClient<Job[]>('/jobs', {
    method: 'GET',
  });
}

export async function getJobById(jobId: string): Promise<Job> {
  return apiClient<Job>(`/jobs/${jobId}`, {
    method: 'GET',
  });
}

export async function applyForJob(
  jobId: string,
  file: File
): Promise<{ message: string; [key: string]: any }> {
  const formData = new FormData();
  formData.append('file', file);

  return apiClient(`/jobs/${jobId}/apply`, {
    method: 'POST',
    body: formData,
  });
}
