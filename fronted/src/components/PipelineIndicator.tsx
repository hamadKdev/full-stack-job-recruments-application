import React from 'react';
import { ApplicationStage } from '../types';
import { Check, XCircle, AlertOctagon } from 'lucide-react';

interface PipelineIndicatorProps {
  currentStage: ApplicationStage | string;
  size?: 'sm' | 'md';
}

const STAGES: ApplicationStage[] = ['Applied', 'Shortlisted', 'Interview', 'Offer', 'Hired'];

export const PipelineIndicator: React.FC<PipelineIndicatorProps> = ({
  currentStage,
  size = 'md',
}) => {
  const isRejected = currentStage === 'Rejected';
  const isWithdrawn = currentStage === 'Withdrawn';
  const currentIndex = STAGES.indexOf(currentStage as ApplicationStage);

  if (isRejected) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
        <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
        <span>Application concluded: <strong>Rejected</strong> (Final stage)</span>
      </div>
    );
  }

  if (isWithdrawn) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium">
        <AlertOctagon className="w-4 h-4 text-slate-500 shrink-0" />
        <span>Application was withdrawn by candidate (Final stage)</span>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between relative">
        {/* Connecting background bar */}
        <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-0.5 bg-slate-200 z-0" />

        {/* Dynamic progress bar fill */}
        <div
          className="absolute top-1/2 left-0 -translate-y-1/2 h-0.5 bg-blue-600 transition-all duration-300 z-0"
          style={{
            width: `${currentIndex >= 0 ? (currentIndex / (STAGES.length - 1)) * 100 : 0}%`,
          }}
        />

        {STAGES.map((stage, index) => {
          const isPassed = currentIndex > index;
          const isCurrent = currentIndex === index;

          const dotSize = size === 'sm' ? 'w-5 h-5 text-[10px]' : 'w-7 h-7 text-xs';
          const labelSize = size === 'sm' ? 'text-[10px]' : 'text-xs';

          return (
            <div key={stage} className="relative z-10 flex flex-col items-center group">
              <div
                className={`rounded-full flex items-center justify-center font-bold transition-all duration-200 ${dotSize} ${
                  isPassed
                    ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-100'
                    : isCurrent
                      ? 'bg-blue-700 text-white shadow-md ring-4 ring-blue-200 ring-offset-1 scale-110'
                      : 'bg-white border-2 border-slate-300 text-slate-400'
                }`}
              >
                {isPassed ? (
                  <Check className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <span
                className={`mt-1.5 whitespace-nowrap font-medium tracking-tight ${labelSize} ${
                  isCurrent
                    ? 'text-blue-900 font-bold'
                    : isPassed
                      ? 'text-slate-700'
                      : 'text-slate-400'
                }`}
              >
                {stage}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
