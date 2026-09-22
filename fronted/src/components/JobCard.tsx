import React from 'react';
import { Job } from '../types';
import { StatusBadge } from './StatusBadge';
import { MapPin, Building, Calendar, Users, Briefcase, ArrowRight } from 'lucide-react';

interface JobCardProps {
  job: Job;
  onViewDetails: (job: Job) => void;
  onApply?: (job: Job) => void;
  canApply?: boolean;
}

export const JobCard: React.FC<JobCardProps> = ({
  job,
  onViewDetails,
  onApply,
  canApply = true,
}) => {
  const isOpen = job.status === 'Open';

  // Format date nicely
  const formattedDate = job.last_date
    ? new Date(job.last_date).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'No deadline';

  return (
    <div
      id={`job-card-${job.id}`}
      className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
    >
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 mb-2">
              {job.job_type || 'Full-time'}
            </span>
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
              {job.title}
            </h3>
          </div>
          <StatusBadge status={job.status} size="sm" />
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mb-4">
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
            <span>{job.openings} {job.openings === 1 ? 'opening' : 'openings'}</span>
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">Deadline: {formattedDate}</span>
          </div>
        </div>

        <p className="text-sm text-slate-600 line-clamp-3 mb-4 leading-relaxed">
          {job.description}
        </p>
      </div>

      <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3 mt-auto">
        <button
          type="button"
          id={`view-job-details-btn-${job.id}`}
          onClick={() => onViewDetails(job)}
          className="text-xs font-semibold text-slate-700 hover:text-blue-600 transition-colors flex items-center gap-1 py-1.5"
        >
          View Details
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        {canApply && isOpen && onApply && (
          <button
            type="button"
            id={`apply-job-btn-${job.id}`}
            onClick={() => onApply(job)}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors"
          >
            Apply Now
          </button>
        )}
      </div>
    </div>
  );
};
