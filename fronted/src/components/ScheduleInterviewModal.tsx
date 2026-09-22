import React, { useState } from 'react';
import { Application, InterviewSchedulePayload } from '../types';
import { scheduleInterview } from '../api/recruiter';
import { extractErrorMessage } from '../api/client';
import { useToast } from '../context/ToastContext';
import { Calendar, Clock, MapPin, Video, X, AlertCircle, Info } from 'lucide-react';

interface ScheduleInterviewModalProps {
  application: Application | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ScheduleInterviewModal: React.FC<ScheduleInterviewModalProps> = ({
  application,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();

  // Set default minimum date to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDateStr = tomorrow.toISOString().split('T')[0];

  const [date, setDate] = useState<string>(minDateStr);
  const [startTime, setStartTime] = useState<string>('10:00');
  const [location, setLocation] = useState<string>('Headquarters / Virtual Meeting');
  const [meetingLink, setMeetingLink] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !application) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!date) {
      setErrorMessage('Please specify an interview date.');
      return;
    }

    if (!startTime) {
      setErrorMessage('Please specify a start time.');
      return;
    }

    // Basic client check for future date/time
    const selectedDateTime = new Date(`${date}T${startTime}`);
    if (selectedDateTime <= new Date()) {
      setErrorMessage('Interview time must be in the future.');
      return;
    }

    setIsSubmitting(true);

    const payload: InterviewSchedulePayload = {
      interview_date: date,
      start_time: startTime,
      location: location.trim(),
      meeting_link: meetingLink.trim(),
    };

    try {
      const res = await scheduleInterview(application.id, payload);
      showToast(res.message || 'Interview scheduled successfully!', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = extractErrorMessage(err);
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="schedule-interview-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
    >
      <div
        id="schedule-interview-modal"
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
              Recruiter Action
            </span>
            <h2 className="text-lg font-bold text-slate-900">Schedule Interview</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Candidate: <strong>{application.candidate_name || application.candidate_email || 'Candidate'}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Interview Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  id="interview-date-input"
                  required
                  min={minDateStr}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Start Time (HH:MM) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="time"
                  id="interview-time-input"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Location / Office
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                id="interview-location-input"
                placeholder="e.g. Conference Room B or Virtual"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Video Meeting Link (Optional)
            </label>
            <div className="relative">
              <Video className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="url"
                id="interview-link-input"
                placeholder="https://meet.google.com/..."
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="p-3 bg-blue-50/60 border border-blue-200/80 rounded-xl text-xs text-blue-800 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              The backend automatically establishes a 1-hour interview block, moves the stage to <strong>Interview</strong>, checks recruiter scheduling conflicts, and triggers calendar notifications.
            </div>
          </div>

          {errorMessage && (
            <div
              id="schedule-error-banner"
              className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="confirm-schedule-interview-btn"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Scheduling...</span>
                </>
              ) : (
                <span>Confirm Schedule</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
