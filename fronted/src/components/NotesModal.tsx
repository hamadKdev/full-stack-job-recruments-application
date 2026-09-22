import React, { useState } from 'react';
import { Application } from '../types';
import { addApplicationNote } from '../api/recruiter';
import { extractErrorMessage } from '../api/client';
import { useToast } from '../context/ToastContext';
import { StickyNote, X, Lock, AlertCircle } from 'lucide-react';

interface NotesModalProps {
  application: Application | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const NotesModal: React.FC<NotesModalProps> = ({
  application,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [noteText, setNoteText] = useState<string>(application?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !application) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!noteText.trim()) {
      setErrorMessage('Please type a note before saving.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await addApplicationNote(application.id, noteText.trim());
      showToast(res.message || 'Note saved securely!', 'success');
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
      id="notes-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
    >
      <div
        id="notes-modal"
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1">
              <Lock className="w-3.5 h-3.5" />
              Recruiter Private Notes
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Evaluation Notes
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Candidate: <strong>{application.candidate_name || application.candidate_email}</strong>
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
          <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2">
            <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Confidential internal note. This information is strictly hidden from candidates and only visible to assigned recruiters and administrators.
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Recruiter Observations & Assessment
            </label>
            <textarea
              id="recruiter-notes-textarea"
              rows={5}
              required
              placeholder="Record candidate strengths, technical assessment results, culture fit observations, salary expectations..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {errorMessage && (
            <div
              id="notes-error-banner"
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
              id="save-recruiter-notes-btn"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving Note...</span>
                </>
              ) : (
                <span>Save Note</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
