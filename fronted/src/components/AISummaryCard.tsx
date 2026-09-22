import React, { useState, useEffect, useRef } from 'react';
import { AISummary, AISummaryStatus } from '../types';
import { retryAISummary, getAIApplicationSummary } from '../api/applications';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RefreshCw,
  AlertTriangle,
  UserCheck,
} from 'lucide-react';

interface AISummaryCardProps {
  applicationId: string;
  status?: AISummaryStatus;
  summary?: AISummary | null;
  generatedAt?: string;
  onSummaryUpdated?: (summaryData: {
    ai_summary_status: AISummaryStatus;
    ai_summary?: AISummary | null;
    ai_summary_generated_at?: string;
  }) => void;
}

export const AISummaryCard: React.FC<AISummaryCardProps> = ({
  applicationId,
  status: initialStatus,
  summary: initialSummary,
  generatedAt,
  onSummaryUpdated,
}) => {
  const { role } = useAuth();
  const { showToast } = useToast();

  const [currentStatus, setCurrentStatus] = useState<AISummaryStatus>(
    initialStatus || (initialSummary ? 'completed' : 'pending')
  );
  const [currentSummary, setCurrentSummary] = useState<AISummary | null | undefined>(
    initialSummary
  );
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [pollError, setPollError] = useState<string | null>(null);

  const pollIntervalRef = useRef<any>(null);
  const pollCountRef = useRef<number>(0);

  // Strictly enforce role-based access: never render for candidates
  if (role === 'candidate') {
    return null;
  }

  // Synchronize internal state when props change
  useEffect(() => {
    if (initialStatus) {
      setCurrentStatus(initialStatus);
    } else if (initialSummary) {
      setCurrentStatus('completed');
    }
    setCurrentSummary(initialSummary);
  }, [initialStatus, initialSummary]);

  // Polling helper when in 'pending' state
  useEffect(() => {
    if (currentStatus === 'pending') {
      pollCountRef.current = 0;
      setPollError(null);

      const checkSummary = async () => {
        pollCountRef.current += 1;
        try {
          const res = await getAIApplicationSummary(applicationId);
          if (res && res.ai_summary_status) {
            if (res.ai_summary_status === 'completed') {
              setCurrentStatus('completed');
              setCurrentSummary(res.ai_summary);
              if (onSummaryUpdated) {
                onSummaryUpdated(res);
              }
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
              }
            } else if (res.ai_summary_status === 'failed') {
              setCurrentStatus('failed');
              if (onSummaryUpdated) {
                onSummaryUpdated(res);
              }
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
              }
            }
          }
        } catch {
          // Silent catch during polling to prevent disruption
          if (pollCountRef.current >= 15) {
            // Stop polling after ~50 seconds if unresponsive
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
          }
        }
      };

      // Initial check after 1.5 seconds, then every 3.5 seconds
      const initialTimer = setTimeout(checkSummary, 1500);
      pollIntervalRef.current = setInterval(checkSummary, 3500);

      return () => {
        clearTimeout(initialTimer);
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      };
    } else {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }
  }, [currentStatus, applicationId, onSummaryUpdated]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const handleRetry = async () => {
    if (isRetrying) return;
    setIsRetrying(true);
    setPollError(null);

    try {
      await retryAISummary(applicationId);
      setCurrentStatus('pending');
      setCurrentSummary(null);
      showToast('AI Summary generation started.', 'info');
      if (onSummaryUpdated) {
        onSummaryUpdated({
          ai_summary_status: 'pending',
          ai_summary: null,
        });
      }
    } catch {
      showToast('AI summary could not be generated. Please try again.', 'error');
      setCurrentStatus('failed');
    } finally {
      setIsRetrying(false);
    }
  };

  // 1. Loading State
  if (currentStatus === 'pending') {
    return (
      <div
        id={`ai-summary-pending-${applicationId}`}
        className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/60 to-indigo-50/40 p-5 text-sm text-slate-700 shadow-2xs"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">AI CV Summary</span>
                <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-100/70 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
                  Processing
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-600">
                AI Summary is being generated...
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 shadow-2xs">
              <UserCheck className="h-3 w-3 text-slate-400" />
              AI-generated summary — Human decision required
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Failed State or Fallback
  if (currentStatus === 'failed' || (!currentSummary && currentStatus !== 'completed')) {
    return (
      <div
        id={`ai-summary-failed-${applicationId}`}
        className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 text-sm text-slate-700 shadow-2xs"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-200 text-slate-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">AI CV Summary</span>
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                  Status
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-600">
                Summary not available
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              id={`retry-ai-summary-btn-${applicationId}`}
              onClick={handleRetry}
              disabled={isRetrying}
              className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
              <span>{isRetrying ? 'Starting Generation...' : 'Try Again'}</span>
            </button>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 shadow-2xs">
              Human decision required
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 3. Completed State
  const shortProfile = Array.isArray(currentSummary?.short_profile)
    ? currentSummary.short_profile
    : [];
  const reqsMentioned = Array.isArray(currentSummary?.requirements_mentioned)
    ? currentSummary.requirements_mentioned
    : [];
  const reqsNotFound = Array.isArray(currentSummary?.requirements_not_found)
    ? currentSummary.requirements_not_found
    : [];
  const questions = Array.isArray(currentSummary?.interview_questions)
    ? currentSummary.interview_questions
    : [];

  const hasAnyData =
    shortProfile.length > 0 ||
    reqsMentioned.length > 0 ||
    reqsNotFound.length > 0 ||
    questions.length > 0;

  if (!hasAnyData) {
    return (
      <div
        id={`ai-summary-empty-${applicationId}`}
        className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 text-sm text-slate-700 shadow-2xs"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-200 text-slate-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900">AI CV Summary</span>
              <p className="text-xs text-slate-500">Summary not available</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            disabled={isRetrying}
            className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      id={`ai-summary-card-${applicationId}`}
      className="rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50/40 via-white to-slate-50/30 p-5 sm:p-6 text-sm text-slate-800 shadow-xs space-y-5"
    >
      {/* Top Header & Human Decision Requirement Label */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-indigo-100/70">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
            <Sparkles className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-base font-bold text-slate-900">AI CV Summary</h4>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                Ready
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Assistant overview extracted from candidate's resume
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Mandatory AI Label */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900 shadow-2xs">
            <UserCheck className="h-3.5 w-3.5 text-amber-700" />
            AI-generated summary — Human decision required
          </span>

          {/* Optional Refresh/Regenerate */}
          <button
            type="button"
            onClick={handleRetry}
            disabled={isRetrying}
            title="Regenerate summary"
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRetrying ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Grid of Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Section 1: Short Profile */}
        <div className="md:col-span-2 rounded-xl bg-white/80 border border-slate-200/80 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-500" />
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Short Profile
            </h5>
          </div>
          {shortProfile.length > 0 ? (
            <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-700 pl-1 leading-relaxed">
              {shortProfile.map((bullet, idx) => (
                <li key={`profile-${idx}`} className="text-slate-800 font-normal">
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-400 italic">Summary not available</p>
          )}
        </div>

        {/* Section 2: Requirements Mentioned */}
        <div className="rounded-xl bg-white/80 border border-slate-200/80 p-4 space-y-2.5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Requirements Mentioned
            </h5>
          </div>
          {reqsMentioned.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {reqsMentioned.map((req, idx) => (
                <span
                  key={`req-mention-${idx}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50/80 px-2.5 py-1 text-xs font-medium text-emerald-900"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {req}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">None noted in CV</p>
          )}
        </div>

        {/* Section 3: Requirements Not Found */}
        <div className="rounded-xl bg-white/80 border border-slate-200/80 p-4 space-y-2.5">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-slate-400" />
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Requirements Not Found
            </h5>
          </div>
          {reqsNotFound.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {reqsNotFound.map((req, idx) => (
                <span
                  key={`req-missing-${idx}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100/90 px-2.5 py-1 text-xs font-medium text-slate-700"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                  {req}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-emerald-700 font-medium">All core requirements identified</p>
          )}
        </div>

        {/* Section 4: Interview Questions */}
        <div className="md:col-span-2 rounded-xl bg-white/80 border border-slate-200/80 p-4 space-y-2.5">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-indigo-600" />
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Interview Questions
            </h5>
          </div>
          {questions.length > 0 ? (
            <ol className="space-y-2 text-xs text-slate-800 list-none pl-0">
              {questions.map((question, idx) => (
                <li
                  key={`question-${idx}`}
                  className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50/70 border border-slate-100"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-800 font-bold text-[11px]">
                    {idx + 1}
                  </span>
                  <span className="pt-0.5 leading-relaxed font-medium text-slate-800">
                    {question}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-xs text-slate-400 italic">Summary not available</p>
          )}
        </div>
      </div>
    </div>
  );
};
