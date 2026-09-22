import React from 'react';
import { ApplicationStage, JobStatus } from '../types';

interface StatusBadgeProps {
  status: ApplicationStage | JobStatus | string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const normalized = (status || '').trim();

  // Size styling
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs font-medium',
    md: 'px-2.5 py-1 text-xs font-semibold',
    lg: 'px-3 py-1.5 text-sm font-semibold',
  }[size];

  // Specific colors for application stages & job status
  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotColor = 'bg-slate-400';

  switch (normalized) {
    // Job statuses
    case 'Draft':
      colorClasses = 'bg-slate-100 text-slate-700 border-slate-300';
      dotColor = 'bg-slate-400';
      break;
    case 'Open':
      colorClasses = 'bg-emerald-50 text-emerald-800 border-emerald-300';
      dotColor = 'bg-emerald-500';
      break;
    case 'Closed':
      colorClasses = 'bg-zinc-100 text-zinc-700 border-zinc-300';
      dotColor = 'bg-zinc-500';
      break;

    // Application stages
    case 'Applied':
      colorClasses = 'bg-blue-50 text-blue-800 border-blue-200';
      dotColor = 'bg-blue-500';
      break;
    case 'Shortlisted':
      colorClasses = 'bg-indigo-50 text-indigo-800 border-indigo-200';
      dotColor = 'bg-indigo-500';
      break;
    case 'Interview':
      colorClasses = 'bg-amber-50 text-amber-800 border-amber-300';
      dotColor = 'bg-amber-500';
      break;
    case 'Offer':
      colorClasses = 'bg-cyan-50 text-cyan-800 border-cyan-300';
      dotColor = 'bg-cyan-500';
      break;
    case 'Hired':
      colorClasses = 'bg-emerald-100 text-emerald-900 border-emerald-400 font-bold';
      dotColor = 'bg-emerald-600 animate-pulse';
      break;
    case 'Rejected':
      colorClasses = 'bg-rose-50 text-rose-800 border-rose-300';
      dotColor = 'bg-rose-500';
      break;
    case 'Withdrawn':
      colorClasses = 'bg-slate-100 text-slate-600 border-slate-300 line-through decoration-slate-400';
      dotColor = 'bg-slate-400';
      break;
    default:
      colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';
      dotColor = 'bg-slate-400';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border tracking-wide whitespace-nowrap transition-colors ${sizeClasses} ${colorClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
      <span>{normalized || 'Unknown'}</span>
    </span>
  );
};
