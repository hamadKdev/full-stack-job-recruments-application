import React, { useState, useEffect } from 'react';
import { Recruiter } from '../types';
import {
  getAdminRecruiters,
  deactivateRecruiter,
  promoteToRecruiter,
} from '../api/admin';
import { extractErrorMessage } from '../api/client';
import { useToast } from '../context/ToastContext';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { TableSkeleton } from '../components/LoadingSkeleton';
import {
  Users,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Shield,
  RefreshCw,
  AlertCircle,
  PlusCircle,
  CheckCircle,
  UserPlus,
} from 'lucide-react';

export const AdminRecruitersPage: React.FC = () => {
  const { showToast } = useToast();

  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Promote User State
  const [promoteUserId, setPromoteUserId] = useState<string>('');
  const [isPromoting, setIsPromoting] = useState<boolean>(false);
  const [promoteError, setPromoteError] = useState<string | null>(null);

  // Deactivate State
  const [recruiterToDeactivate, setRecruiterToDeactivate] = useState<Recruiter | null>(null);
  const [isDeactivating, setIsDeactivating] = useState<boolean>(false);

  const fetchRecruiterDirectory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAdminRecruiters();
      setRecruiters(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecruiterDirectory();
  }, []);

  // Handle Promote
  const handlePromoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = promoteUserId.trim();
    if (!id) return;

    setIsPromoting(true);
    setPromoteError(null);
    try {
      const res = await promoteToRecruiter(id);
      showToast(res.message || 'User promoted to recruiter successfully!', 'success');
      setPromoteUserId('');
      await fetchRecruiterDirectory();
    } catch (err: any) {
      const msg = extractErrorMessage(err);
      setPromoteError(msg);
      showToast(msg, 'error');
    } finally {
      setIsPromoting(false);
    }
  };

  // Handle Deactivate Confirm
  const handleConfirmDeactivate = async () => {
    if (!recruiterToDeactivate) return;
    const userId = recruiterToDeactivate.user_id || recruiterToDeactivate.id;

    setIsDeactivating(true);
    try {
      const res = await deactivateRecruiter(userId);
      showToast(res.message || 'Recruiter deactivated successfully.', 'info');
      setRecruiterToDeactivate(null);
      await fetchRecruiterDirectory();
    } catch (err: any) {
      const msg = extractErrorMessage(err);
      showToast(msg, 'error');
    } finally {
      setIsDeactivating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                Admin Center
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500">Staff & Roles</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Recruiter Management
            </h1>
            <p className="mt-1 text-sm text-slate-500 max-w-xl">
              Authorize recruitment staff, promote registered users to recruiter status, and manage recruiter account active states.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              id="refresh-recruiters-btn"
              onClick={fetchRecruiterDirectory}
              disabled={isLoading}
              className="p-2.5 text-slate-500 hover:text-blue-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-blue-50 transition-colors"
              title="Refresh recruiter list"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Promote Form Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
            <UserPlus className="w-5 h-5 text-blue-600" />
            <span>Promote Registered User to Recruiter</span>
          </div>
          <p className="text-xs text-slate-500 max-w-xl">
            As enforced by system rules, there is no public recruiter registration form. Only administrators can promote a registered user ID to the recruiter role.
          </p>

          <form onSubmit={handlePromoteSubmit} className="flex flex-col sm:flex-row gap-3 pt-2">
            <input
              type="text"
              required
              id="promote-user-id-input"
              placeholder="Enter User ID (UUID) or registered ID..."
              value={promoteUserId}
              onChange={(e) => setPromoteUserId(e.target.value)}
              className="flex-1 px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
            <button
              type="submit"
              id="promote-user-submit-btn"
              disabled={isPromoting || !promoteUserId.trim()}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
            >
              {isPromoting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Promoting...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Grant Recruiter Role</span>
                </>
              )}
            </button>
          </form>

          {promoteError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{promoteError}</span>
            </div>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-sm text-rose-800 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Unable to fetch recruiter records</p>
                <p className="text-xs mt-0.5">{error}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={fetchRecruiterDirectory}
              className="px-3 py-1 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700 shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* Recruiters Table */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Authorized Recruitment Staff ({recruiters.length})
            </h2>
            <span className="text-xs text-slate-500">
              Only active recruiters can be assigned to job positions
            </span>
          </div>

          {isLoading ? (
            <div className="p-6">
              <TableSkeleton rows={4} />
            </div>
          ) : recruiters.length === 0 ? (
            <div className="p-10">
              <EmptyState
                title="No recruiters registered"
                description="No users currently have the recruiter role assigned. Enter a candidate user ID above to promote them."
                icon="user"
              />
            </div>
          ) : (
            <>
              {/* Desktop View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] font-semibold">
                      <th className="py-3.5 px-6">Recruiter Name</th>
                      <th className="py-3.5 px-6">Email Address</th>
                      <th className="py-3.5 px-6">Phone Number</th>
                      <th className="py-3.5 px-6">Status</th>
                      <th className="py-3.5 px-6">Role</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recruiters.map((r) => {
                      const id = r.user_id || r.id;
                      const isActive = r.is_active !== false && r.active !== false;

                      return (
                        <tr key={id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-4 px-6 font-bold text-slate-900">
                            {r.name || 'Unnamed Recruiter'}
                          </td>
                          <td className="py-4 px-6 text-slate-600">
                            <span className="flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-slate-400" />
                              {r.email}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-slate-600">
                            <span className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              {r.phone || 'N/A'}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            {isActive ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                Deactivated
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 uppercase">
                              {r.role || 'recruiter'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            {isActive ? (
                              <button
                                type="button"
                                id={`deactivate-recruiter-btn-${id}`}
                                onClick={() => setRecruiterToDeactivate(r)}
                                className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1 ml-auto"
                              >
                                <UserX className="w-3.5 h-3.5" />
                                <span>Deactivate</span>
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400 italic">Inactive</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="md:hidden divide-y divide-slate-100 p-4 space-y-3">
                {recruiters.map((r) => {
                  const id = r.user_id || r.id;
                  const isActive = r.is_active !== false && r.active !== false;

                  return (
                    <div
                      key={id}
                      className="p-4 bg-slate-50/50 rounded-2xl border border-slate-200 space-y-2"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm">{r.name || 'Recruiter'}</h3>
                          <p className="text-xs text-slate-500">{r.email}</p>
                        </div>
                        {isActive ? (
                          <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 rounded-full">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-200 text-slate-700 rounded-full">
                            Inactive
                          </span>
                        )}
                      </div>

                      {r.phone && <p className="text-xs text-slate-500">Phone: {r.phone}</p>}

                      {isActive && (
                        <div className="pt-2 border-t border-slate-200">
                          <button
                            type="button"
                            onClick={() => setRecruiterToDeactivate(r)}
                            className="w-full py-1.5 text-xs font-semibold text-rose-700 bg-rose-100 rounded-lg text-center"
                          >
                            Deactivate Recruiter
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Deactivate Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!recruiterToDeactivate}
        title="Deactivate Recruiter?"
        message={`Are you sure you want to deactivate ${recruiterToDeactivate?.name || recruiterToDeactivate?.email || 'this recruiter'}? They will no longer be able to manage job requisitions or applicant pipelines.`}
        confirmLabel="Deactivate Recruiter"
        cancelLabel="Keep Active"
        variant="danger"
        isLoading={isDeactivating}
        onConfirm={handleConfirmDeactivate}
        onCancel={() => setRecruiterToDeactivate(null)}
      />
    </div>
  );
};
