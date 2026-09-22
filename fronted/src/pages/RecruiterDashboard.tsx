import React, { useState, useEffect } from 'react';
import { Job } from '../types';
import { getRecruiterJobs } from '../api/recruiter';
import { extractErrorMessage } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { CardSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';
import {
  Briefcase,
  Users,
  MapPin,
  Calendar,
  Building,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Clock,
} from 'lucide-react';

interface RecruiterDashboardProps {
  onNavigate: (view: string, contextId?: string) => void;
  onSelectJobForApplicants: (jobId: string, jobTitle: string) => void;
}

export const RecruiterDashboard: React.FC<RecruiterDashboardProps> = ({
  onNavigate,
  onSelectJobForApplicants,
}) => {
  const { session } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignedJobs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getRecruiterJobs();
      setJobs(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignedJobs();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50/50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Recruiter Header */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                Recruiter Portal
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-mono">
                {session?.email}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Assigned Job Openings
            </h1>
            <p className="mt-1 text-sm text-slate-500 max-w-xl">
              Manage candidate pipelines, conduct stage transitions, schedule 1-hour interview slots, and review candidate CVs for your assigned jobs.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              id="refresh-recruiter-jobs-btn"
              onClick={fetchAssignedJobs}
              disabled={isLoading}
              className="p-2.5 text-slate-500 hover:text-blue-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-blue-50 transition-colors"
              title="Refresh assigned jobs"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-sm text-rose-800 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Unable to fetch recruiter assignments</p>
              <p className="text-xs text-rose-700 mt-0.5">{error}</p>
            </div>
            <button
              type="button"
              onClick={fetchAssignedJobs}
              className="px-3 py-1 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* Assigned Jobs Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">
              Assigned Positions ({jobs.length})
            </h2>
            <span className="text-xs text-slate-500">
              Click any position to inspect applicants and manage stages
            </span>
          </div>

          {isLoading ? (
            <CardSkeleton count={4} />
          ) : jobs.length === 0 ? (
            <EmptyState
              title="No jobs are assigned to you"
              description="You currently do not have any job vacancies assigned to your recruiter profile. Please contact an administrator to be assigned to positions."
              icon="job"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map((job) => {
                const formattedDate = job.last_date
                  ? new Date(job.last_date).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : 'No deadline';

                return (
                  <div
                    key={job.id}
                    id={`recruiter-job-card-${job.id}`}
                    onClick={() => onSelectJobForApplicants(job.id, job.title)}
                    className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs hover:shadow-md hover:border-blue-300 transition-all duration-200 cursor-pointer flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                          {job.job_type}
                        </span>
                        <StatusBadge status={job.status} size="sm" />
                      </div>

                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {job.title}
                      </h3>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 my-4">
                        <div className="flex items-center gap-1.5 truncate">
                          <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{job.department}</span>
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{job.location}</span>
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{job.openings} Openings</span>
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{formattedDate}</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {job.description}
                      </p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600 group-hover:text-blue-700">
                      <span>Inspect Candidate Applications</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
