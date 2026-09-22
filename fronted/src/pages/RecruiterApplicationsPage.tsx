import React, { useState, useEffect } from 'react';
import { Application, Job, ApplicationStage } from '../types';
import {
  getRecruiterJobs,
  getRecruiterApplications,
  updateApplicationStage,
} from '../api/recruiter';
import { getAdminJobs } from '../api/admin';
import { extractErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { StatusBadge } from '../components/StatusBadge';
import { PipelineIndicator } from '../components/PipelineIndicator';
import { ScheduleInterviewModal } from '../components/ScheduleInterviewModal';
import { NotesModal } from '../components/NotesModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { TableSkeleton } from '../components/LoadingSkeleton';
import { AISummaryCard } from '../components/AISummaryCard';
import {
  User,
  Mail,
  Phone,
  FileText,
  Calendar,
  Clock,
  MapPin,
  ExternalLink,
  Lock,
  ChevronRight,
  XCircle,
  CheckCircle,
  RefreshCw,
  AlertCircle,
  Briefcase,
  ArrowUpRight,
} from 'lucide-react';

interface RecruiterApplicationsPageProps {
  initialJobId?: string | null;
  onNavigate: (view: string) => void;
}

export const RecruiterApplicationsPage: React.FC<RecruiterApplicationsPageProps> = ({
  initialJobId,
  onNavigate,
}) => {
  const { role } = useAuth();
  const { showToast } = useToast();

  const [assignedJobs, setAssignedJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>(initialJobId || '');
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState<boolean>(true);
  const [isLoadingApps, setIsLoadingApps] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active Modals
  const [interviewApp, setInterviewApp] = useState<Application | null>(null);
  const [notesApp, setNotesApp] = useState<Application | null>(null);

  // Confirmation dialogs for stage changes
  const [stageChangeAction, setStageChangeAction] = useState<{
    app: Application;
    newStage: ApplicationStage;
    title: string;
    message: string;
    variant: 'danger' | 'primary' | 'warning';
  } | null>(null);
  const [isProcessingStage, setIsProcessingStage] = useState<boolean>(false);

  // Load recruiter's assigned jobs (or all jobs for admin)
  useEffect(() => {
    const loadJobs = async () => {
      setIsLoadingJobs(true);
      try {
        let jobs: Job[] = [];
        if (role === 'admin') {
          try {
            jobs = await getAdminJobs();
          } catch {
            jobs = await getRecruiterJobs();
          }
        } else {
          jobs = await getRecruiterJobs();
        }
        const list = Array.isArray(jobs) ? jobs : [];
        setAssignedJobs(list);
        if (list.length > 0) {
          const matchInitial = initialJobId && list.some((j) => j.id === initialJobId);
          if (matchInitial) {
            setSelectedJobId(initialJobId);
          } else if (!selectedJobId) {
            setSelectedJobId(list[0].id);
          }
        }
      } catch (err: any) {
        setErrorMessage(extractErrorMessage(err));
      } finally {
        setIsLoadingJobs(false);
      }
    };
    loadJobs();
  }, [role, initialJobId]);

  // Load applicants whenever selected job changes
  const fetchApplicationsForJob = async (jobId: string) => {
    if (!jobId) return;
    setIsLoadingApps(true);
    setErrorMessage(null);
    try {
      const data = await getRecruiterApplications(jobId);
      setApplications(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setErrorMessage(extractErrorMessage(err));
      setApplications([]);
    } finally {
      setIsLoadingApps(false);
    }
  };

  useEffect(() => {
    if (selectedJobId) {
      fetchApplicationsForJob(selectedJobId);
    }
  }, [selectedJobId]);

  const selectedJob = assignedJobs.find((j) => j.id === selectedJobId);

  // Handle stage change request
  const handleExecuteStageChange = async () => {
    if (!stageChangeAction) return;

    setIsProcessingStage(true);
    try {
      const res = await updateApplicationStage(
        stageChangeAction.app.id,
        stageChangeAction.newStage
      );
      showToast(
        res.message || `Application transitioned to ${stageChangeAction.newStage}`,
        'success'
      );
      setStageChangeAction(null);
      if (selectedJobId) {
        await fetchApplicationsForJob(selectedJobId);
      }
    } catch (err: any) {
      const msg = extractErrorMessage(err);
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsProcessingStage(false);
    }
  };

  // Determine next permitted stage in pipeline
  const getNextStageInfo = (currentStage: ApplicationStage) => {
    switch (currentStage) {
      case 'Applied':
        return {
          nextStage: 'Shortlisted' as ApplicationStage,
          label: 'Move to Shortlisted',
          variant: 'primary' as const,
        };
      case 'Shortlisted':
        return {
          nextStage: 'Interview' as ApplicationStage,
          label: 'Schedule Interview',
          action: 'interview',
          variant: 'primary' as const,
        };
      case 'Interview':
        return {
          nextStage: 'Offer' as ApplicationStage,
          label: 'Extend Job Offer',
          variant: 'primary' as const,
        };
      case 'Offer':
        return {
          nextStage: 'Hired' as ApplicationStage,
          label: 'Hire Candidate',
          variant: 'primary' as const,
        };
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header & Job Selector */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                Recruiter Pipeline
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500">Applicant Tracking</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Applicants for Position
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Review candidates, verify CVs, write confidential notes, schedule interviews, and progress candidate stages according to strict pipeline rules.
            </p>
          </div>

          {/* Job Select Dropdown */}
          <div className="w-full md:w-80">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Assigned Job
            </label>
            <div className="flex gap-2">
              <select
                id="select-recruiter-job"
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                disabled={isLoadingJobs || assignedJobs.length === 0}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
              >
                {assignedJobs.length === 0 ? (
                  <option value="">No jobs assigned</option>
                ) : (
                  assignedJobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title} ({job.status})
                    </option>
                  ))
                )}
              </select>

              <button
                type="button"
                id="refresh-applicants-btn"
                onClick={() => selectedJobId && fetchApplicationsForJob(selectedJobId)}
                disabled={isLoadingApps || !selectedJobId}
                className="p-2.5 text-slate-500 hover:text-blue-600 bg-slate-50 border border-slate-200 rounded-xl transition-colors shrink-0"
                title="Refresh applicants"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingApps ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Selected Job Summary Pill */}
        {selectedJob && (
          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-semibold border border-blue-400/20">
                  {selectedJob.job_type}
                </span>
                <StatusBadge status={selectedJob.status} size="sm" />
                <span className="text-xs text-slate-400">
                  {selectedJob.openings} opening{selectedJob.openings === 1 ? '' : 's'}
                </span>
              </div>
              <h2 className="text-lg font-bold text-white mt-1">{selectedJob.title}</h2>
              <p className="text-xs text-slate-300">
                {selectedJob.department} • {selectedJob.location}
              </p>
            </div>

            <div className="text-xs text-slate-400">
              Total Applicants: <strong className="text-white text-sm">{applications.length}</strong>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-sm text-rose-800 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Recruiter Request Notice</p>
                <p className="text-xs mt-0.5">{errorMessage}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => selectedJobId && fetchApplicationsForJob(selectedJobId)}
              className="px-3 py-1 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700 shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* Applicants List */}
        <div>
          {isLoadingApps ? (
            <TableSkeleton rows={4} />
          ) : !selectedJobId ? (
            <EmptyState
              title="No job selected"
              description="Please select one of your assigned jobs from the dropdown to review applicant submissions."
              icon="job"
            />
          ) : applications.length === 0 ? (
            <EmptyState
              title="No applicants yet"
              description="There are currently no candidate applications submitted for this job."
              icon="application"
            />
          ) : (
            <div className="space-y-4">
              {applications.map((app) => {
                const nextStep = getNextStageInfo(app.stage);
                const isFinal =
                  app.stage === 'Hired' ||
                  app.stage === 'Rejected' ||
                  app.stage === 'Withdrawn';
                const canReject = !isFinal;

                return (
                  <div
                    key={app.id}
                    id={`applicant-card-${app.id}`}
                    className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all space-y-6"
                  >
                    {/* Header */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <StatusBadge status={app.stage} size="md" />
                          <span className="text-xs text-slate-400 font-mono">
                            App ID: {app.id.substring(0, 8)}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-400" />
                          <span>{app.candidate_name || 'Candidate Name Pending'}</span>
                        </h3>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-1">
                          {app.candidate_email && (
                            <span className="flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-slate-400" />
                              <a
                                href={`mailto:${app.candidate_email}`}
                                className="hover:underline text-slate-700"
                              >
                                {app.candidate_email}
                              </a>
                            </span>
                          )}
                          {app.candidate_phone && (
                            <span className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              <a
                                href={`tel:${app.candidate_phone}`}
                                className="hover:underline text-slate-700"
                              >
                                {app.candidate_phone}
                              </a>
                            </span>
                          )}
                          {app.created_at && (
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              Applied: {new Date(app.created_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Top Action Buttons (CV & Notes) */}
                      <div className="flex flex-wrap items-center gap-2.5">
                        {/* CV View Button */}
                        {app.cv_url ? (
                          <a
                            href={app.cv_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            id={`view-cv-btn-${app.id}`}
                            className="px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors flex items-center gap-1.5"
                          >
                            <FileText className="w-4 h-4" />
                            <span>View / Open CV</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <span
                            className="px-3 py-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-1.5"
                            title="CV document on record"
                          >
                            <FileText className="w-4 h-4 text-slate-400" />
                            <span>CV Attached</span>
                          </span>
                        )}

                        {/* Private Notes Button */}
                        <button
                          type="button"
                          id={`open-notes-btn-${app.id}`}
                          onClick={() => setNotesApp(app)}
                          className={`px-3.5 py-2 text-xs font-semibold rounded-xl border transition-colors flex items-center gap-1.5 ${
                            app.notes
                              ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>{app.notes ? 'View / Edit Note' : 'Add Note'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Pipeline Progress Indicator */}
                    <div className="pt-2 pb-1">
                      <PipelineIndicator currentStage={app.stage} size="sm" />
                    </div>

                    {/* AI CV Summary (Recruiter & Admin Only) */}
                    <div className="pt-2">
                      <AISummaryCard
                        applicationId={app.id}
                        status={app.ai_summary_status}
                        summary={app.ai_summary}
                        generatedAt={app.ai_summary_generated_at}
                        onSummaryUpdated={(updatedData) => {
                          setApplications((prev) =>
                            prev.map((a) =>
                              a.id === app.id
                                ? {
                                    ...a,
                                    ai_summary_status: updatedData.ai_summary_status,
                                    ai_summary: updatedData.ai_summary,
                                    ai_summary_generated_at: updatedData.ai_summary_generated_at,
                                  }
                                : a
                            )
                          );
                        }}
                      />
                    </div>

                    {/* Interview info block if scheduled */}
                    {(app.interview_date || app.interview_time) && (
                      <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-amber-100 text-amber-700 shrink-0">
                            <Clock className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-amber-900 block">
                              Scheduled Interview: {app.interview_date} at {app.interview_time} (1 Hour)
                            </span>
                            <span className="text-amber-800">
                              Location: {app.interview_location || 'Headquarters / Online'}
                            </span>
                          </div>
                        </div>

                        {app.meeting_link && (
                          <a
                            href={app.meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-white border border-amber-300 text-amber-900 rounded-lg hover:bg-amber-50 font-semibold flex items-center gap-1 shrink-0"
                          >
                            <span>Open Meeting Room</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    )}

                    {/* Recruiter Private Note Preview (Internal Only) */}
                    {app.notes && (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 flex items-start gap-2">
                        <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <span className="font-semibold text-slate-800 block mb-0.5">
                            Private Recruiter Note:
                          </span>
                          <p className="italic text-slate-600 leading-relaxed whitespace-pre-wrap">
                            "{app.notes}"
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Stage Transition Control Bar */}
                    <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs text-slate-500">
                        {isFinal ? (
                          <span className="font-medium text-slate-600">
                            Candidate application has reached final status ({app.stage}).
                          </span>
                        ) : (
                          <span>
                            Current Stage: <strong className="text-slate-800">{app.stage}</strong> • Next permitted progression is enforced.
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Reject Button (Allowed before Hired) */}
                        {canReject && (
                          <button
                            type="button"
                            id={`reject-btn-${app.id}`}
                            onClick={() =>
                              setStageChangeAction({
                                app,
                                newStage: 'Rejected',
                                title: 'Reject Candidate?',
                                message: `Are you sure you want to mark ${app.candidate_name || 'this candidate'} as Rejected? This is a terminal state.`,
                                variant: 'danger',
                              })
                            }
                            className="px-3.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        )}

                        {/* Next Stage Progression Button */}
                        {nextStep && (
                          <>
                            {nextStep.action === 'interview' ? (
                              <button
                                type="button"
                                id={`schedule-interview-btn-${app.id}`}
                                onClick={() => setInterviewApp(app)}
                                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                              >
                                <Calendar className="w-3.5 h-3.5" />
                                <span>Schedule Interview</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                id={`advance-stage-btn-${app.id}`}
                                onClick={() =>
                                  setStageChangeAction({
                                    app,
                                    newStage: nextStep.nextStage,
                                    title: `Advance to ${nextStep.nextStage}?`,
                                    message: `Move candidate ${app.candidate_name || ''} from ${app.stage} to ${nextStep.nextStage}? Stages cannot be skipped or moved backwards.`,
                                    variant: nextStep.nextStage === 'Hired' ? 'primary' : 'primary',
                                  })
                                }
                                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>{nextStep.label}</span>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Schedule Interview Modal */}
      <ScheduleInterviewModal
        application={interviewApp}
        isOpen={!!interviewApp}
        onClose={() => setInterviewApp(null)}
        onSuccess={() => {
          setInterviewApp(null);
          if (selectedJobId) fetchApplicationsForJob(selectedJobId);
        }}
      />

      {/* Recruiter Notes Modal */}
      <NotesModal
        application={notesApp}
        isOpen={!!notesApp}
        onClose={() => setNotesApp(null)}
        onSuccess={() => {
          setNotesApp(null);
          if (selectedJobId) fetchApplicationsForJob(selectedJobId);
        }}
      />

      {/* Stage Change Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!stageChangeAction}
        title={stageChangeAction?.title || 'Confirm Stage Change'}
        message={stageChangeAction?.message || ''}
        confirmLabel={`Confirm ${stageChangeAction?.newStage || ''}`}
        cancelLabel="Cancel"
        variant={stageChangeAction?.variant || 'primary'}
        isLoading={isProcessingStage}
        onConfirm={handleExecuteStageChange}
        onCancel={() => setStageChangeAction(null)}
      />
    </div>
  );
};
