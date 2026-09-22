import { apiClient } from './client';
import { AdminDashboardData, Job, JobCreatePayload, Recruiter } from '../types';

export async function getAdminDashboard(): Promise<AdminDashboardData> {
  return apiClient<AdminDashboardData>('/admin/dashboard', {
    method: 'GET',
  });
}

export async function getAdminJobs(): Promise<Job[]> {
  return apiClient<Job[]>('/admin/jobs', {
    method: 'GET',
  });
}

export async function createAdminJob(
  jobData: JobCreatePayload
): Promise<{ message: string; job?: Job; [key: string]: any }> {
  return apiClient('/admin/jobs', {
    method: 'POST',
    body: JSON.stringify(jobData),
  });
}

export async function openAdminJob(jobId: string): Promise<{ message: string; [key: string]: any }> {
  return apiClient(`/admin/jobs/${jobId}/open`, {
    method: 'POST',
  });
}

export async function closeAdminJob(jobId: string): Promise<{ message: string; [key: string]: any }> {
  return apiClient(`/admin/jobs/${jobId}/close`, {
    method: 'POST',
  });
}

export async function getAdminRecruiters(): Promise<Recruiter[]> {
  return apiClient<Recruiter[]>('/admin/recruiters', {
    method: 'GET',
  });
}

export async function deactivateRecruiter(
  userId: string
): Promise<{ message: string; [key: string]: any }> {
  return apiClient(`/admin/recruiters/${userId}/deactivate`, {
    method: 'POST',
  });
}

export async function promoteToRecruiter(
  userId: string
): Promise<{ message: string; [key: string]: any }> {
  return apiClient(`/admin/recruiters/${userId}`, {
    method: 'POST',
  });
}

export async function assignRecruiterToJob(
  jobId: string,
  recruiterId: string
): Promise<{ message: string; [key: string]: any }> {
  return apiClient(`/admin/jobs/${jobId}/recruiters/${recruiterId}`, {
    method: 'POST',
  });
}
