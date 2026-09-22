import React, { useState, useEffect } from 'react';
import { Application, Job } from '../types';
import { getMyApplications, withdrawApplication } from '../api/applications';
import { getJobs } from '../api/jobs';
import { extractErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { StatusBadge } from '../components/StatusBadge';
import { PipelineIndicator } from '../components/PipelineIndicator';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { CardSkeleton, TableSkeleton } from '../components/LoadingSkeleton';
import { ApplyModal } from '../components/ApplyModal';
import {
  FileText,
  Calendar,
  Clock,
  MapPin,
  Video,
  AlertCircle,
  Briefcase,
  CheckCircle2,
  ExternalLink,
  Ban,
  RefreshCw,
  User,
  Shield,
  Layers,
} from 'lucide-react';

interface CandidateDashboardProps {
  onNavigate: (view: string) => void;
}

export const CandidateDashboard: React.FC<CandidateDashboardProps> = ({ onNavigate }) => {
  const { session } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'applications' | 'available-jobs' | 'profile'>('applications');
  const [applications, setApplications] = useState<Application[]>([]);
  const [availableJobs, setAvailableJobs] = useState<Job[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState<boolean>(true);
  const [isLoadingJobs, setIsLoadingJobs] = useState<boolean>(false);
  const [errorApps, setErrorApps] = useState<string | null>(null);

  // Application to withdraw
  const [appToWithdraw, setAppToWithdraw] = useState<Application | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState<boolean>(false);

  // Apply modal
  const [jobToApply, setJobToApply] = useState<Job | null>(null);

  const fetchApplications = async () => {
    setIsLoadingApps(true);
    setErrorApps(null);
    try {
      const data = await getMyApplications();
      setApplications(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setErrorApps(extractErrorMessage(err));
    } finally {
      setIsLoadingApps(false);
    }
  };

  const fetchOpenJobs = async () => {
    setIsLoadingJobs(true);
    try {
      const data = await getJobs();
      const openOnly = (Array.isArray(data) ? data : []).filter((j) => j.status === 'Open');
      setAvailableJobs(openOnly);
    } catch {
      // Handled silently for secondary tab
    } finally {
      setIsLoadingJobs(false);
    }
  };

  useEffect(() => {
    fetchApplications();
    fetchOpenJobs();
  }, []);

  const handleWithdrawConfirm = async () => {
    if (!appToWithdraw) return;

    setIsWithdrawing(true);
    try {
      const res = await withdrawApplication(appToWithdraw.id);
      showToast(res.message || 'Application successfully withdrawn.', 'info');
      setAppToWithdraw(null);
      await fetchApplications();
    } catch (err: any) {
      const msg = extractErrorMessage(err);
      showToast(msg, 'error');
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Welcome Banner */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                Candidate Portal
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-mono">
                {session?.email}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Welcome back, {session?.name || session?.email?.split('@')[0] || 'Candidate'}
            </h1>
            <p className="mt-1 text-sm text-slate-500 max-w-xl">
              Monitor your submitted applications, stage progressions, interview schedules, and explore active openings.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              id="candidate-explore-jobs-btn"
              onClick={() => onNavigate('jobs')}
              className="px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors flex items-center gap-2"
            >
              <Briefcase className="w-4 h-4" />
              <span>Browse All Jobs</span>
            </button>
          </div>
        </div>

        {/* Dashboard Tabs */}
        <div className="flex items-center border-b border-slate-200 gap-6 overflow-x-auto">
          <button
            type="button"
            id="tab-my-applications"
            onClick={() => setActiveTab('applications')}
            className={`pb-4 text-sm font-semibold whitespace-nowrap transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'applications'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>My Applications</span>
            <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-700">
              {applications.length}
            </span>
          </button>

          <button
            type="button"
            id="tab-available-jobs"
            onClick={() => setActiveTab('available-jobs')}
            className={`pb-4 text-sm font-semibold whitespace-nowrap transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'available-jobs'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Available Jobs</span>
            <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-700">
              {availableJobs.length}
            </span>
          </button>

          <button
            type="button"
            id="tab-my-profile"
            onClick={() => setActiveTab('profile')}
            className={`pb-4 text-sm font-semibold whitespace-nowrap transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'profile'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profile & Privacy</span>
          </button>
        </div>

        {/* Tab 1: My Applications */}
        {activeTab === 'applications' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Application History</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Stages are strictly enforced by the recruitment backend
                </p>
              </div>
              <button
                type="button"
                id="refresh-my-apps-btn"
                onClick={fetchApplications}
                disabled={isLoadingApps}
                className="p-2 text-slate-500 hover:text-blue-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                title="Refresh applications"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingApps ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            </div>

            {errorApps && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-sm text-rose-800 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">Failed to load your applications</p>
                  <p className="text-xs mt-0.5">{errorApps}</p>
                </div>
                <button
                  type="button"
                  onClick={fetchApplications}
                  className="px-3 py-1 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700"
                >
                  Retry
                </button>
              </div>
            )}

            {isLoadingApps ? (
              <div className="space-y-4">
                <TableSkeleton rows={4} />
              </div>
            ) : applications.length === 0 ? (
              <EmptyState
                title="No applications submitted yet"
                description="You haven't submitted any job applications yet. Browse the open positions to find a role that matches your skills."
                actionText="Explore Open Jobs"
                onAction={() => onNavigate('jobs')}
                icon="application"
              />
            ) : (
              <div className="space-y-4">
                {applications.map((app) => {
                  const canWithdraw =
                    app.stage !== 'Hired' &&
                    app.stage !== 'Rejected' &&
                    app.stage !== 'Withdrawn';

                  const hasInterview =
                    app.stage === 'Interview' ||
                    app.interview_date ||
                    app.interview_time;

                  return (
                    <div
                      key={app.id}
                      id={`application-card-${app.id}`}
                      className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all space-y-6"
                    >
                      {/* Top Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                              Application #{app.id.substring(0, 8)}
                            </span>
                            <StatusBadge status={app.stage} size="sm" />
                          </div>
                          <h3 className="text-xl font-bold text-slate-900">
                            {app.job_title || 'Position'}
                          </h3>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                            {app.department && (
                              <span className="flex items-center gap-1">
                                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                                {app.department}
                              </span>
                            )}
                            {app.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                {app.location}
                              </span>
                            )}
                            {app.created_at && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                Applied: {new Date(app.created_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>

                        {canWithdraw && (
                          <button
                            type="button"
                            id={`withdraw-btn-${app.id}`}
                            onClick={() => setAppToWithdraw(app)}
                            className="px-3.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-center"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>Withdraw Application</span>
                          </button>
                        )}
                      </div>

                      {/* Visual Pipeline Progress */}
                      <div className="pt-2 pb-1">
                        <PipelineIndicator currentStage={app.stage} size="sm" />
                      </div>

                      {/* Interview Details if Scheduled */}
                      {hasInterview && (
                        <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-2">
                          <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wider">
                            <Clock className="w-4 h-4 text-amber-600" />
                            <span>Interview Scheduled</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-amber-950 pt-1">
                            <div>
                              <span className="text-amber-700 block font-medium">Date & Time</span>
                              <span className="font-bold">
                                {app.interview_date || 'Date Pending'} at {app.interview_time || 'TBD'} (1 Hour)
                              </span>
                            </div>
                            <div>
                              <span className="text-amber-700 block font-medium">Location</span>
                              <span className="font-semibold">{app.interview_location || 'Headquarters'}</span>
                            </div>
                            <div>
                              <span className="text-amber-700 block font-medium">Meeting Link</span>
                              {app.meeting_link ? (
                                <a
                                  href={app.meeting_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-700 underline font-semibold flex items-center gap-1 hover:text-blue-900"
                                >
                                  Join Video Call
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <span className="text-slate-500">In-person or link pending</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Attached CV info */}
                      <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-400" />
                          <span>
                            CV File:{' '}
                            <span className="font-mono text-slate-700">
                              {app.cv_path ? app.cv_path.split('/').pop() : 'Submitted PDF Resume'}
                            </span>
                          </span>
                        </div>
                        {app.cv_url && (
                          <a
                            href={app.cv_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 font-semibold hover:underline flex items-center gap-1"
                          >
                            View CV
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Available Jobs Quick List */}
        {activeTab === 'available-jobs' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Current Open Positions</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Positions currently accepting applications
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('jobs')}
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                Go to full Job Board →
              </button>
            </div>

            {isLoadingJobs ? (
              <CardSkeleton count={3} />
            ) : availableJobs.length === 0 ? (
              <EmptyState
                title="No open jobs currently"
                description="Check back soon for new career openings."
                icon="job"
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableJobs.map((job) => (
                  <div
                    key={job.id}
                    className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                          {job.job_type}
                        </span>
                        <StatusBadge status={job.status} size="sm" />
                      </div>
                      <h3 className="text-base font-bold text-slate-900">{job.title}</h3>
                      <p className="text-xs text-slate-500 mt-1">
                        {job.department} • {job.location}
                      </p>
                      <p className="text-xs text-slate-600 mt-3 line-clamp-2">
                        {job.description}
                      </p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        {job.openings} opening{job.openings === 1 ? '' : 's'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setJobToApply(job)}
                        className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
                      >
                        Apply with CV
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Candidate Profile & Privacy */}
        {activeTab === 'profile' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs max-w-2xl space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Candidate Profile</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Your registered candidate credentials and data protection guarantees
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block mb-1">Email Address</span>
                  <span className="font-semibold text-slate-800">{session?.email || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Account Role</span>
                  <span className="font-semibold text-blue-700 uppercase tracking-wider">
                    {session?.role || 'candidate'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">User Identifier</span>
                  <span className="font-mono text-slate-700">{session?.userId || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Authentication Method</span>
                  <span className="font-semibold text-slate-700">Encrypted JWT Session</span>
                </div>
              </div>

              {/* Privacy Notice Required by Section 10 */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-xs text-emerald-900 space-y-2">
                <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-emerald-800">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span>Privacy & Confidentiality Standard</span>
                </div>
                <p className="leading-relaxed">
                  As mandated by ATS privacy specifications:
                </p>
                <ul className="list-disc list-inside space-y-1 text-emerald-800 pl-1">
                  <li>You only see applications and CV submissions created by your account.</li>
                  <li>Recruiter evaluation notes and internal candidate rankings remain completely confidential and hidden.</li>
                  <li>Other applicants cannot inspect your profile, application history, or attached CV files.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Withdraw Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!appToWithdraw}
        title="Withdraw Job Application?"
        message={`Are you sure you want to withdraw your application for "${appToWithdraw?.job_title || 'this position'}"? This action will set your application status to Withdrawn.`}
        confirmLabel="Yes, Withdraw"
        cancelLabel="Keep Application"
        variant="danger"
        isLoading={isWithdrawing}
        onConfirm={handleWithdrawConfirm}
        onCancel={() => setAppToWithdraw(null)}
      />

      {/* Apply Modal */}
      <ApplyModal
        job={jobToApply}
        isOpen={!!jobToApply}
        onClose={() => setJobToApply(null)}
        onSuccess={() => {
          setJobToApply(null);
          setActiveTab('applications');
          fetchApplications();
        }}
      />
    </div>
  );
};
