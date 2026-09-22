import React, { useState, useEffect, useMemo } from 'react';
import { Job } from '../types';
import { getJobs } from '../api/jobs';
import { extractErrorMessage } from '../api/client';
import { JobCard } from '../components/JobCard';
import { JobDetailsModal } from '../components/JobDetailsModal';
import { ApplyModal } from '../components/ApplyModal';
import { CardSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';
import { Search, Filter, RefreshCw, Briefcase, Sparkles, AlertCircle } from 'lucide-react';

interface PublicJobsPageProps {
  onNavigate: (view: string) => void;
}

export const PublicJobsPage: React.FC<PublicJobsPageProps> = ({ onNavigate }) => {
  const { isAuthenticated, role } = useAuth();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & search
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedJobType, setSelectedJobType] = useState<string>('all');

  // Modals state
  const [selectedJobForDetails, setSelectedJobForDetails] = useState<Job | null>(null);
  const [selectedJobForApply, setSelectedJobForApply] = useState<Job | null>(null);

  const fetchJobsList = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getJobs();
      setJobs(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobsList();
  }, []);

  // Compute unique departments and job types for filtering
  const departments = useMemo(() => {
    const set = new Set<string>();
    jobs.forEach((j) => {
      if (j.department) set.add(j.department);
    });
    return Array.from(set);
  }, [jobs]);

  const jobTypes = useMemo(() => {
    const set = new Set<string>();
    jobs.forEach((j) => {
      if (j.job_type) set.add(j.job_type);
    });
    return Array.from(set);
  }, [jobs]);

  // Frontend search and filter logic
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // Must be Open status according to backend PRD
      if (job.status && job.status !== 'Open') {
        return false;
      }

      // Search match
      const query = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !query ||
        job.title.toLowerCase().includes(query) ||
        job.department.toLowerCase().includes(query) ||
        job.location.toLowerCase().includes(query) ||
        job.description.toLowerCase().includes(query) ||
        (job.requirements && job.requirements.toLowerCase().includes(query));

      // Department filter
      const matchesDept =
        selectedDepartment === 'all' || job.department === selectedDepartment;

      // Job type filter
      const matchesType =
        selectedJobType === 'all' || job.job_type === selectedJobType;

      return matchesSearch && matchesDept && matchesType;
    });
  }, [jobs, searchTerm, selectedDepartment, selectedJobType]);

  const handleApplyClick = (job: Job) => {
    if (!isAuthenticated) {
      onNavigate('login');
      return;
    }
    if (role !== 'candidate') {
      alert('Only candidates can submit job applications. Please sign in as a candidate.');
      return;
    }
    setSelectedJobForApply(job);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-8 sm:p-12 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30 mb-4 backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5" />
              Live Career Opportunities
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Discover Your Next Career Move
            </h1>
            <p className="mt-3 text-slate-300 text-sm sm:text-base leading-relaxed">
              Explore open positions with verified recruitment pipelines. Apply with your PDF resume to receive direct updates on application stages and interviews.
            </p>
          </div>

          <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 opacity-10 pointer-events-none">
            <Briefcase className="w-96 h-96 text-white" />
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Search Input */}
            <div className="md:col-span-6 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                id="search-jobs-input"
                placeholder="Search by role title, keywords, tech stack, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>

            {/* Department Filter */}
            <div className="md:col-span-3">
              <select
                id="filter-department-select"
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            {/* Job Type Filter */}
            <div className="md:col-span-3 flex items-center gap-2">
              <select
                id="filter-jobtype-select"
                value={selectedJobType}
                onChange={(e) => setSelectedJobType(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Job Types</option>
                {jobTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>

              <button
                type="button"
                id="refresh-jobs-btn"
                onClick={fetchJobsList}
                disabled={isLoading}
                title="Refresh jobs"
                className="p-2.5 text-slate-500 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-xl transition-colors shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>
              Showing <strong>{filteredJobs.length}</strong> active position{filteredJobs.length === 1 ? '' : 's'}
            </span>
            {(searchTerm || selectedDepartment !== 'all' || selectedJobType !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedDepartment('all');
                  setSelectedJobType('all');
                }}
                className="text-blue-600 hover:underline font-medium"
              >
                Reset filters
              </button>
            )}
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-sm text-rose-800 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Unable to fetch open jobs from backend</p>
                <p className="text-xs text-rose-700 mt-0.5">{error}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={fetchJobsList}
              className="px-3 py-1.5 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700 shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* Jobs List Grid */}
        {isLoading ? (
          <CardSkeleton count={6} />
        ) : filteredJobs.length === 0 ? (
          <EmptyState
            title="No open jobs available"
            description="There are currently no active openings matching your criteria. Check back soon or try clearing filters."
            actionText={searchTerm || selectedDepartment !== 'all' || selectedJobType !== 'all' ? 'Clear Filters' : undefined}
            onAction={() => {
              setSearchTerm('');
              setSelectedDepartment('all');
              setSelectedJobType('all');
            }}
            icon="job"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onViewDetails={(j) => setSelectedJobForDetails(j)}
                onApply={(j) => handleApplyClick(j)}
                canApply={role === 'candidate' || !isAuthenticated}
              />
            ))}
          </div>
        )}
      </div>

      {/* Details Modal */}
      <JobDetailsModal
        job={selectedJobForDetails}
        isOpen={!!selectedJobForDetails}
        onClose={() => setSelectedJobForDetails(null)}
        onApply={(j) => handleApplyClick(j)}
        canApply={role === 'candidate' || !isAuthenticated}
      />

      {/* Apply Modal */}
      <ApplyModal
        job={selectedJobForApply}
        isOpen={!!selectedJobForApply}
        onClose={() => setSelectedJobForApply(null)}
        onSuccess={() => {
          onNavigate('my-applications');
        }}
      />
    </div>
  );
};
