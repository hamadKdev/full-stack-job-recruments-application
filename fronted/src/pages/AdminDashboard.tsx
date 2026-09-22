import React, { useState, useEffect } from 'react';
import { AdminDashboardData } from '../types';
import { getAdminDashboard } from '../api/admin';
import { extractErrorMessage } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import {
  Briefcase,
  Users,
  FileText,
  UserCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Send,
  Award,
  RefreshCw,
  TrendingUp,
  ArrowRight,
  Shield,
  Layers,
} from 'lucide-react';

interface AdminDashboardProps {
  onNavigate: (view: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const stats = await getAdminDashboard();
      setData(stats || {});
    } catch (err: any) {
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const totalJobs = data?.total_jobs ?? 0;
  const openJobs = data?.open_jobs ?? 0;
  const closedJobs = data?.closed_jobs ?? 0;
  const totalApps = data?.total_applications ?? 0;
  const totalRecruiters = data?.total_recruiters ?? 0;

  // Stages count
  const appliedCount = data?.applied ?? 0;
  const shortlistedCount = data?.shortlisted ?? 0;
  const interviewCount = data?.interview ?? 0;
  const offerCount = data?.offer ?? 0;
  const hiredCount = data?.hired ?? 0;
  const rejectedCount = data?.rejected ?? 0;
  const withdrawnCount = data?.withdrawn ?? 0;

  return (
    <div className="min-h-screen bg-slate-50/50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Admin Header */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                Administrator
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500">System Command Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Recruitment Analytics & Control
            </h1>
            <p className="mt-1 text-sm text-slate-500 max-w-xl">
              Real-time pipeline metrics, stage distributions, recruiter assignments, and job requisition lifecycles.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              id="refresh-admin-dashboard-btn"
              onClick={fetchDashboardStats}
              disabled={isLoading}
              className="p-2.5 text-slate-500 hover:text-blue-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-blue-50 transition-colors"
              title="Refresh dashboard metrics"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
            <button
              type="button"
              id="admin-goto-create-job-btn"
              onClick={() => onNavigate('admin-jobs')}
              className="px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors flex items-center gap-2"
            >
              <Briefcase className="w-4 h-4" />
              <span>Manage Jobs</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-sm text-rose-800 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Dashboard Query Error</p>
                <p className="text-xs mt-0.5">{error}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={fetchDashboardStats}
              className="px-3 py-1 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700 shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* Top 4 KPI Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Total Jobs */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Total Positions
              </span>
              <span className="text-3xl font-extrabold text-slate-900">{totalJobs}</span>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                <span className="text-emerald-700 font-semibold">{openJobs} Open</span>
                <span>•</span>
                <span className="text-slate-500">{closedJobs} Closed</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Briefcase className="w-6 h-6" />
            </div>
          </div>

          {/* Total Applications */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Total Applications
              </span>
              <span className="text-3xl font-extrabold text-slate-900">{totalApps}</span>
              <div className="text-xs text-slate-500 mt-2">
                Across all requisitions
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
          </div>

          {/* Candidates Hired */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Candidates Hired
              </span>
              <span className="text-3xl font-extrabold text-emerald-700">{hiredCount}</span>
              <div className="text-xs text-slate-500 mt-2">
                Successfully onboarded
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Award className="w-6 h-6" />
            </div>
          </div>

          {/* Active Recruiters */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Assigned Recruiters
              </span>
              <span className="text-3xl font-extrabold text-slate-900">{totalRecruiters}</span>
              <div className="text-xs text-slate-500 mt-2">
                Active recruitment staff
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Detailed Application Funnel Breakdown */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <span>Application Pipeline Breakdown</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Distribution of candidate records across sequential pipeline stages
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full self-start sm:self-center">
              {totalApps} Total Candidates
            </span>
          </div>

          {/* Stages Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            {/* Applied */}
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 text-center">
              <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block mb-1">
                Applied
              </span>
              <span className="text-2xl font-extrabold text-blue-900">{appliedCount}</span>
              <span className="block text-[10px] text-blue-600 mt-1 font-medium">Initial Entry</span>
            </div>

            {/* Shortlisted */}
            <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 text-center">
              <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider block mb-1">
                Shortlisted
              </span>
              <span className="text-2xl font-extrabold text-indigo-900">{shortlistedCount}</span>
              <span className="block text-[10px] text-indigo-600 mt-1 font-medium">Screened</span>
            </div>

            {/* Interview */}
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 text-center">
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block mb-1">
                Interview
              </span>
              <span className="text-2xl font-extrabold text-amber-900">{interviewCount}</span>
              <span className="block text-[10px] text-amber-700 mt-1 font-medium">Scheduled</span>
            </div>

            {/* Offer */}
            <div className="p-4 rounded-xl border border-cyan-200 bg-cyan-50/50 text-center">
              <span className="text-[11px] font-bold text-cyan-800 uppercase tracking-wider block mb-1">
                Offer
              </span>
              <span className="text-2xl font-extrabold text-cyan-900">{offerCount}</span>
              <span className="block text-[10px] text-cyan-700 mt-1 font-medium">Negotiation</span>
            </div>

            {/* Hired */}
            <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/70 text-center">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">
                Hired
              </span>
              <span className="text-2xl font-extrabold text-emerald-900">{hiredCount}</span>
              <span className="block text-[10px] text-emerald-700 mt-1 font-bold">Offer Accepted</span>
            </div>

            {/* Rejected */}
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 text-center">
              <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block mb-1">
                Rejected
              </span>
              <span className="text-2xl font-extrabold text-rose-900">{rejectedCount}</span>
              <span className="block text-[10px] text-rose-600 mt-1 font-medium">Terminal</span>
            </div>

            {/* Withdrawn */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-100/70 text-center">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Withdrawn
              </span>
              <span className="text-2xl font-extrabold text-slate-800">{withdrawnCount}</span>
              <span className="block text-[10px] text-slate-500 mt-1 font-medium">By Candidate</span>
            </div>
          </div>
        </div>

        {/* Quick Management Shortcuts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div
            id="admin-card-jobs-shortcut"
            onClick={() => onNavigate('admin-jobs')}
            className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Briefcase className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                Job Requisition Management
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Create new Draft requisitions, transition them to Open status, assign authorized recruiters, and monitor deadline/capacity closures.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600">
              <span>View & Manage Requisitions</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          <div
            id="admin-card-recruiters-shortcut"
            onClick={() => onNavigate('admin-recruiters')}
            className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs hover:shadow-md hover:border-purple-300 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                Recruiter Staff & Roles
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Promote verified user accounts to recruiter role, review active statuses, manage staffing permissions, and perform account deactivations.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-purple-600">
              <span>Inspect Recruiter Directory</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
