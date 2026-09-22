import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { Navbar } from './components/Navbar';
import { PublicJobsPage } from './pages/PublicJobsPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { CandidateDashboard } from './pages/CandidateDashboard';
import { RecruiterDashboard } from './pages/RecruiterDashboard';
import { RecruiterApplicationsPage } from './pages/RecruiterApplicationsPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminJobsPage } from './pages/AdminJobsPage';
import { AdminRecruitersPage } from './pages/AdminRecruitersPage';

function AppContent() {
  const { session, role, isAuthenticated, isLoading } = useAuth();
  const { showToast } = useToast();

  // Get initial view from hash or role or default to 'jobs'
  const getInitialView = (): string => {
    const hash = window.location.hash.replace(/^#\/?/, '').trim();
    if (hash) return hash;
    if (isAuthenticated) {
      if (role === 'admin') return 'admin-dashboard';
      if (role === 'recruiter') return 'recruiter-dashboard';
      return 'candidate-dashboard';
    }
    return 'jobs';
  };

  const [currentView, setCurrentView] = useState<string>(getInitialView);
  const [selectedJobIdForRecruiter, setSelectedJobIdForRecruiter] = useState<string | null>(null);

  // Sync state with URL hash
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '').trim();
      if (hash && hash !== currentView) {
        setCurrentView(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentView]);

  const navigateTo = useCallback(
    (view: string, contextId?: string) => {
      if (contextId) {
        setSelectedJobIdForRecruiter(contextId);
      }
      setCurrentView(view);
      window.location.hash = `#${view}`;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    []
  );

  // Route protection logic
  useEffect(() => {
    if (isLoading) return;

    const candidateViews = ['candidate-dashboard', 'my-applications', 'profile'];
    const recruiterViews = ['recruiter-dashboard', 'recruiter-jobs', 'recruiter-applicants'];
    const adminViews = ['admin-dashboard', 'admin-jobs', 'admin-recruiters'];

    // If trying to access protected views without authentication
    if (!isAuthenticated) {
      if (
        candidateViews.includes(currentView) ||
        recruiterViews.includes(currentView) ||
        adminViews.includes(currentView)
      ) {
        showToast('Please sign in to access this page.', 'warning');
        navigateTo('login');
      }
      return;
    }

    // Role-based protection
    if (role === 'candidate') {
      if (recruiterViews.includes(currentView) || adminViews.includes(currentView)) {
        showToast('Access restricted: Candidates cannot view administrative portals.', 'warning');
        navigateTo('candidate-dashboard');
      }
    } else if (role === 'recruiter') {
      if (adminViews.includes(currentView)) {
        showToast('Access restricted: Admin permission required.', 'warning');
        navigateTo('recruiter-dashboard');
      }
    } else if (role === 'admin') {
      // Admin has access to admin portals and public jobs
    }
  }, [currentView, isAuthenticated, role, isLoading, navigateTo, showToast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-700">Connecting to Recruitment Hub...</p>
        </div>
      </div>
    );
  }

  // Render appropriate view based on route
  const renderCurrentView = () => {
    switch (currentView) {
      case 'login':
        return <LoginPage onNavigate={navigateTo} />;

      case 'signup':
        return <SignupPage onNavigate={navigateTo} />;

      case 'candidate-dashboard':
      case 'my-applications':
      case 'profile':
        return <CandidateDashboard onNavigate={navigateTo} />;

      case 'recruiter-dashboard':
      case 'recruiter-jobs':
        return (
          <RecruiterDashboard
            onNavigate={navigateTo}
            onSelectJobForApplicants={(jobId) => {
              setSelectedJobIdForRecruiter(jobId);
              navigateTo('recruiter-applicants');
            }}
          />
        );

      case 'recruiter-applicants':
        return (
          <RecruiterApplicationsPage
            initialJobId={selectedJobIdForRecruiter}
            onNavigate={navigateTo}
          />
        );

      case 'admin-dashboard':
        return <AdminDashboard onNavigate={navigateTo} />;

      case 'admin-jobs':
        return <AdminJobsPage onNavigate={navigateTo} />;

      case 'admin-recruiters':
        return <AdminRecruitersPage />;

      case 'jobs':
      default:
        return <PublicJobsPage onNavigate={navigateTo} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
      <Navbar currentView={currentView} onNavigate={navigateTo} />
      <main className="flex-1">{renderCurrentView()}</main>

      <footer className="border-t border-slate-200 bg-white py-6 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 Job Recruitment System. All rights reserved.</p>
          <div className="flex items-center gap-6 text-slate-500 font-medium">
            <span className="hover:text-slate-800 transition-colors cursor-pointer">Privacy Policy</span>
            <span className="hover:text-slate-800 transition-colors cursor-pointer">Terms of Service</span>
            <span className="hover:text-slate-800 transition-colors cursor-pointer">Support</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}
