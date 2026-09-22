import React, { useState, useEffect } from 'react';
import { Job, JobCreatePayload, Recruiter } from '../types';
import {
  getAdminJobs,
  createAdminJob,
  openAdminJob,
  closeAdminJob,
  getAdminRecruiters,
  assignRecruiterToJob,
} from '../api/admin';
import { extractErrorMessage } from '../api/client';
import { useToast } from '../context/ToastContext';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { TableSkeleton } from '../components/LoadingSkeleton';
import {
  Briefcase,
  Plus,
  PlayCircle,
  StopCircle,
  UserPlus,
  RefreshCw,
  AlertCircle,
  Calendar,
  Building,
  MapPin,
  Users,
  X,
  FileCheck,
} from 'lucide-react';

interface AdminJobsPageProps {
  onNavigate?: (view: string, contextId?: string) => void;
}

export const AdminJobsPage: React.FC<AdminJobsPageProps> = ({ onNavigate }) => {
  const { showToast } = useToast();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [jobToAssignRecruiter, setJobToAssignRecruiter] = useState<Job | null>(null);
  const [jobToClose, setJobToClose] = useState<Job | null>(null);

  // Submitting states
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isClosing, setIsClosing] = useState<boolean>(false);
  const [isAssigning, setIsAssigning] = useState<boolean>(false);
  const [selectedRecruiterId, setSelectedRecruiterId] = useState<string>('');

  // Create Form State
  const defaultCreateState: JobCreatePayload = {
    title: '',
    department: 'Engineering',
    location: 'Remote / HQ',
    job_type: 'Full-time',
    description: '',
    requirements: '',
    last_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    openings: 1,
  };
  const [createForm, setCreateForm] = useState<JobCreatePayload>(defaultCreateState);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchJobs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAdminJobs();
      setJobs(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecruiters = async () => {
    try {
      const list = await getAdminRecruiters();
      setRecruiters(Array.isArray(list) ? list : []);
    } catch {
      // Ignored here
    }
  };

  useEffect(() => {
    fetchJobs();
    fetchRecruiters();
  }, []);

  // Handle Create Job
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsCreating(true);

    try {
      const res = await createAdminJob({
        ...createForm,
        openings: Number(createForm.openings),
      });
      showToast(res.message || 'Job created successfully as Draft!', 'success');
      setIsCreateModalOpen(false);
      setCreateForm(defaultCreateState);
      await fetchJobs();
    } catch (err: any) {
      const msg = extractErrorMessage(err);
      setFormError(msg);
      showToast(msg, 'error');
    } finally {
      setIsCreating(false);
    }
  };

  // Handle Open Job (Draft -> Open)
  const handleOpenJob = async (jobId: string) => {
    try {
      const res = await openAdminJob(jobId);
      showToast(res.message || 'Job is now Open for candidate applications.', 'success');
      await fetchJobs();
    } catch (err: any) {
      const msg = extractErrorMessage(err);
      showToast(msg, 'error');
    }
  };

  // Handle Close Job (Open -> Closed)
  const handleConfirmClose = async () => {
    if (!jobToClose) return;
    setIsClosing(true);
    try {
      const res = await closeAdminJob(jobToClose.id);
      showToast(res.message || 'Job closed successfully.', 'info');
      setJobToClose(null);
      await fetchJobs();
    } catch (err: any) {
      const msg = extractErrorMessage(err);
      showToast(msg, 'error');
    } finally {
      setIsClosing(false);
    }
  };

  // Handle Assign Recruiter
  const handleAssignRecruiter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobToAssignRecruiter || !selectedRecruiterId) return;

    setIsAssigning(true);
    try {
      const res = await assignRecruiterToJob(jobToAssignRecruiter.id, selectedRecruiterId);
      showToast(res.message || 'Recruiter assigned successfully!', 'success');
      setJobToAssignRecruiter(null);
      setSelectedRecruiterId('');
      await fetchJobs();
    } catch (err: any) {
      const msg = extractErrorMessage(err);
      showToast(msg, 'error');
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                Admin Center
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500">Job Requisitions</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Job Management
            </h1>
            <p className="mt-1 text-sm text-slate-500 max-w-xl">
              Create Draft requisitions, open positions to candidates, close expired listings, and assign recruiters.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              id="refresh-admin-jobs-btn"
              onClick={fetchJobs}
              disabled={isLoading}
              className="p-2.5 text-slate-500 hover:text-blue-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-blue-50 transition-colors"
              title="Refresh jobs"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
            <button
              type="button"
              id="create-new-job-btn"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Job</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-sm text-rose-800 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Failed to query jobs</p>
              <p className="text-xs mt-0.5">{error}</p>
            </div>
            <button
              type="button"
              onClick={fetchJobs}
              className="px-3 py-1 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* Jobs Table & Mobile Cards */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              All Job Requisitions ({jobs.length})
            </h2>
            <span className="text-xs text-slate-500">
              Drafts remain hidden from candidate job board until opened
            </span>
          </div>

          {isLoading ? (
            <div className="p-6">
              <TableSkeleton rows={5} />
            </div>
          ) : jobs.length === 0 ? (
            <div className="p-10">
              <EmptyState
                title="No jobs created yet"
                description="Start by creating a new job opening. Newly created jobs will be stored as Draft."
                actionText="Create Job"
                onAction={() => setIsCreateModalOpen(true)}
                icon="job"
              />
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] font-semibold">
                      <th className="py-3.5 px-6">Title & Dept</th>
                      <th className="py-3.5 px-6">Location</th>
                      <th className="py-3.5 px-6">Type</th>
                      <th className="py-3.5 px-6">Openings</th>
                      <th className="py-3.5 px-6">Deadline</th>
                      <th className="py-3.5 px-6">Status</th>
                      <th className="py-3.5 px-6 text-right">Lifecycle Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {jobs.map((job) => {
                      const isDraft = job.status === 'Draft';
                      const isOpen = job.status === 'Open';

                      return (
                        <tr key={job.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-4 px-6">
                            <span className="font-bold text-slate-900 block">{job.title}</span>
                            <span className="text-xs text-slate-500">{job.department}</span>
                          </td>
                          <td className="py-4 px-6 text-slate-700">{job.location}</td>
                          <td className="py-4 px-6">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-medium">
                              {job.job_type}
                            </span>
                          </td>
                          <td className="py-4 px-6 font-semibold text-slate-800">{job.openings}</td>
                          <td className="py-4 px-6 text-slate-600">
                            {job.last_date ? new Date(job.last_date).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="py-4 px-6">
                            <StatusBadge status={job.status} size="sm" />
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Open Job Button */}
                              {isDraft && (
                                <button
                                  type="button"
                                  id={`open-job-btn-${job.id}`}
                                  onClick={() => handleOpenJob(job.id)}
                                  className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors flex items-center gap-1"
                                >
                                  <PlayCircle className="w-3.5 h-3.5" />
                                  <span>Open Job</span>
                                </button>
                              )}

                              {/* Close Job Button */}
                              {isOpen && (
                                <button
                                  type="button"
                                  id={`close-job-btn-${job.id}`}
                                  onClick={() => setJobToClose(job)}
                                  className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1"
                                >
                                  <StopCircle className="w-3.5 h-3.5" />
                                  <span>Close Job</span>
                                </button>
                              )}

                              {/* View Applicants (AI CV Summaries) Button */}
                              {onNavigate && (
                                <button
                                  type="button"
                                  id={`view-applicants-btn-${job.id}`}
                                  onClick={() => onNavigate('recruiter-applicants', job.id)}
                                  className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors flex items-center gap-1"
                                  title="View applicants and AI CV summaries"
                                >
                                  <Users className="w-3.5 h-3.5" />
                                  <span>Applicants</span>
                                </button>
                              )}

                              {/* Assign Recruiter Button */}
                              <button
                                type="button"
                                id={`assign-recruiter-btn-${job.id}`}
                                onClick={() => {
                                  setJobToAssignRecruiter(job);
                                  setSelectedRecruiterId(
                                    recruiters.length > 0 ? (recruiters[0].user_id || recruiters[0].id) : ''
                                  );
                                }}
                                className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors flex items-center gap-1"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>Assign Recruiter</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View */}
              <div className="lg:hidden divide-y divide-slate-100 p-4 space-y-4">
                {jobs.map((job) => {
                  const isDraft = job.status === 'Draft';
                  const isOpen = job.status === 'Open';

                  return (
                    <div
                      key={job.id}
                      className="p-4 bg-slate-50/50 rounded-2xl border border-slate-200 space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm">{job.title}</h3>
                          <p className="text-xs text-slate-500">{job.department} • {job.location}</p>
                        </div>
                        <StatusBadge status={job.status} size="sm" />
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                        <span>Openings: <strong>{job.openings}</strong></span>
                        <span>Type: <strong>{job.job_type}</strong></span>
                        <span className="col-span-2">
                          Deadline: {job.last_date ? new Date(job.last_date).toLocaleDateString() : 'None'}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-200/80 flex flex-wrap gap-2">
                        {isDraft && (
                          <button
                            type="button"
                            onClick={() => handleOpenJob(job.id)}
                            className="flex-1 py-1.5 px-3 text-xs font-semibold text-emerald-700 bg-emerald-100 rounded-lg text-center"
                          >
                            Open Job
                          </button>
                        )}
                        {isOpen && (
                          <button
                            type="button"
                            onClick={() => setJobToClose(job)}
                            className="flex-1 py-1.5 px-3 text-xs font-semibold text-rose-700 bg-rose-100 rounded-lg text-center"
                          >
                            Close Job
                          </button>
                        )}
                        {onNavigate && (
                          <button
                            type="button"
                            onClick={() => onNavigate('recruiter-applicants', job.id)}
                            className="py-1.5 px-3 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg text-center"
                          >
                            Applicants
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setJobToAssignRecruiter(job);
                            setSelectedRecruiterId(
                              recruiters.length > 0 ? (recruiters[0].user_id || recruiters[0].id) : ''
                            );
                          }}
                          className="flex-1 py-1.5 px-3 text-xs font-semibold text-blue-700 bg-blue-100 rounded-lg text-center"
                        >
                          Assign Recruiter
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create Job Modal */}
      {isCreateModalOpen && (
        <div
          id="create-job-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
        >
          <div
            id="create-job-modal"
            className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col"
            role="dialog"
            aria-modal="true"
          >
            <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                  Admin Action
                </span>
                <h2 className="text-xl font-bold text-slate-900">Create New Job Position</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Initial status will be set to <strong>Draft</strong>. You can open it whenever ready.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={isCreating}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 overflow-y-auto space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">{formError}</div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Job Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    id="create-job-title"
                    placeholder="e.g. Senior Full-Stack Engineer"
                    value={createForm.title}
                    onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Department <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    id="create-job-dept"
                    placeholder="e.g. Engineering"
                    value={createForm.department}
                    onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Location <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    id="create-job-loc"
                    placeholder="e.g. New York, NY / Hybrid"
                    value={createForm.location}
                    onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Job Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="create-job-type"
                    value={createForm.job_type}
                    onChange={(e) => setCreateForm({ ...createForm, job_type: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Internship">Internship</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Number of Openings <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    id="create-job-openings"
                    value={createForm.openings}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, openings: parseInt(e.target.value) || 1 })
                    }
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Application Deadline (Last Date) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    id="create-job-lastdate"
                    value={createForm.last_date}
                    onChange={(e) => setCreateForm({ ...createForm, last_date: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Job Description <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    id="create-job-description"
                    placeholder="Provide overview of role, team objectives, day-to-day responsibilities..."
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Requirements & Qualifications <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    id="create-job-requirements"
                    placeholder="Skills, experience, technical stack, degree requirements..."
                    value={createForm.requirements}
                    onChange={(e) => setCreateForm({ ...createForm, requirements: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isCreating}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="confirm-create-job-submit"
                  disabled={isCreating}
                  className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Saving Draft...</span>
                    </>
                  ) : (
                    <span>Create Draft Job</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Recruiter Modal */}
      {jobToAssignRecruiter && (
        <div
          id="assign-recruiter-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
        >
          <div
            id="assign-recruiter-modal"
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                  Admin Delegation
                </span>
                <h2 className="text-lg font-bold text-slate-900">Assign Recruiter</h2>
                <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">
                  Position: <strong>{jobToAssignRecruiter.title}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setJobToAssignRecruiter(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignRecruiter} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Select Recruiter
                </label>
                {recruiters.length === 0 ? (
                  <p className="text-xs text-amber-700 p-3 bg-amber-50 rounded-xl border border-amber-200">
                    No active recruiters found in system. Please promote a user to recruiter first in the Recruiter Management tab.
                  </p>
                ) : (
                  <select
                    id="select-recruiter-to-assign"
                    required
                    value={selectedRecruiterId}
                    onChange={(e) => setSelectedRecruiterId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    {recruiters.map((r) => {
                      const id = r.user_id || r.id;
                      return (
                        <option key={id} value={id}>
                          {r.name || r.email} ({r.email})
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setJobToAssignRecruiter(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="confirm-assign-recruiter-btn"
                  disabled={isAssigning || !selectedRecruiterId}
                  className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isAssigning ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Job Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!jobToClose}
        title="Close Job Requisition?"
        message={`Closing "${jobToClose?.title || 'this job'}" will prevent new candidates from applying. Are you sure you wish to close it?`}
        confirmLabel="Yes, Close Job"
        cancelLabel="Keep Open"
        variant="warning"
        isLoading={isClosing}
        onConfirm={handleConfirmClose}
        onCancel={() => setJobToClose(null)}
      />
    </div>
  );
};
