import React from 'react';
import { Job } from '../types';
import { StatusBadge } from './StatusBadge';
import { X, MapPin, Building, Calendar, Users, Briefcase, FileCheck, CheckCircle2 } from 'lucide-react';

interface JobDetailsModalProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
  onApply?: (job: Job) => void;
  canApply?: boolean;
}

export const JobDetailsModal: React.FC<JobDetailsModalProps> = ({
  job,
  isOpen,
  onClose,
  onApply,
  canApply = true,
}) => {
  if (!isOpen || !job) return null;

  const isOpenStatus = job.status === 'Open';

  const formattedDate = job.last_date
    ? new Date(job.last_date).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Not specified';

  return (
    <div
      id="job-details-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
    >
      <div
        id="job-details-modal"
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                {job.job_type}
              </span>
              <StatusBadge status={job.status} size="sm" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">{job.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
            <div>
              <span className="text-slate-400 block mb-1">Department</span>
              <div className="font-semibold text-slate-800 flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-slate-500" />
                <span className="truncate">{job.department}</span>
              </div>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Location</span>
              <div className="font-semibold text-slate-800 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                <span className="truncate">{job.location}</span>
              </div>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Openings</span>
              <div className="font-semibold text-slate-800 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                <span>{job.openings} Available</span>
              </div>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Deadline</span>
              <div className="font-semibold text-slate-800 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span className="truncate">{formattedDate}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-blue-600" />
              Role Description
            </h3>
            <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-line bg-white p-4 rounded-xl border border-slate-200">
              {job.description || 'No detailed description provided.'}
            </div>
          </div>

          {/* Requirements */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              Requirements & Qualifications
            </h3>
            <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-line bg-white p-4 rounded-xl border border-slate-200">
              {job.requirements || 'No specific requirements listed.'}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
          {canApply && isOpenStatus && onApply && (
            <button
              type="button"
              id="job-details-modal-apply-btn"
              onClick={() => {
                onClose();
                onApply(job);
              }}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
            >
              Apply for this Position
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
