import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Briefcase,
  LayoutDashboard,
  FileText,
  User,
  Users,
  LogOut,
  LogIn,
  UserPlus,
  Menu,
  X,
  Building2,
  ChevronRight,
} from 'lucide-react';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const { session, role, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (view: string) => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    onNavigate('jobs');
    setMobileMenuOpen(false);
  };

  // Define navigation items according to current role
  const getNavLinks = () => {
    if (!isAuthenticated) {
      return [
        { id: 'jobs', label: 'Explore Jobs', icon: Briefcase },
        { id: 'login', label: 'Sign In', icon: LogIn },
        { id: 'signup', label: 'Register', icon: UserPlus },
      ];
    }

    if (role === 'candidate') {
      return [
        { id: 'candidate-dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'jobs', label: 'Browse Jobs', icon: Briefcase },
        { id: 'my-applications', label: 'My Applications', icon: FileText },
        { id: 'profile', label: 'My Profile', icon: User },
      ];
    }

    if (role === 'recruiter') {
      return [
        { id: 'recruiter-dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'recruiter-jobs', label: 'My Jobs', icon: Briefcase },
        { id: 'recruiter-applicants', label: 'Applicants', icon: Users },
      ];
    }

    if (role === 'admin') {
      return [
        { id: 'admin-dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'admin-jobs', label: 'Job Management', icon: Briefcase },
        { id: 'recruiter-applicants', label: 'Applications & AI', icon: FileText },
        { id: 'admin-recruiters', label: 'Recruiters', icon: Users },
      ];
    }

    return [{ id: 'jobs', label: 'Jobs', icon: Briefcase }];
  };

  const navLinks = getNavLinks();

  const getRoleBadge = () => {
    if (!role) return null;
    const styles = {
      candidate: 'bg-blue-100 text-blue-800 border-blue-200',
      recruiter: 'bg-purple-100 text-purple-800 border-purple-200',
      admin: 'bg-amber-100 text-amber-900 border-amber-300 font-semibold',
    }[role] || 'bg-slate-100 text-slate-700 border-slate-200';

    return (
      <span
        className={`px-2 py-0.5 text-xs rounded-full border capitalize font-medium ${styles}`}
      >
        {role}
      </span>
    );
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleNavClick(isAuthenticated ? (role === 'admin' ? 'admin-dashboard' : role === 'recruiter' ? 'recruiter-dashboard' : 'candidate-dashboard') : 'jobs')}
              className="flex items-center gap-2.5 text-left group transition-transform focus:outline-hidden"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:bg-blue-700 transition-colors">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-slate-900 text-lg leading-tight tracking-tight flex items-center gap-1.5">
                  TalentTrack
                  <span className="text-xs px-1.5 py-0.5 rounded font-mono font-medium bg-blue-50 text-blue-700 border border-blue-200">
                    ATS
                  </span>
                </span>
                <span className="block text-[11px] text-slate-500 font-medium">
                  Recruitment Portal
                </span>
              </div>
            </button>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  id={`nav-link-${item.id}`}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User Section & Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-800 max-w-[140px] truncate">
                      {session?.email || session?.name || 'Logged User'}
                    </span>
                    {getRoleBadge()}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ID: {session?.userId?.substring(0, 8)}...
                  </span>
                </div>
                <button
                  type="button"
                  id="nav-logout-btn"
                  onClick={handleLogout}
                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="nav-login-cta-btn"
                  onClick={() => handleNavClick('login')}
                  className="px-3.5 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  id="nav-signup-cta-btn"
                  onClick={() => handleNavClick('signup')}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs shadow-blue-500/20 transition-all"
                >
                  Register
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            {isAuthenticated && getRoleBadge()}
            <button
              type="button"
              id="mobile-menu-toggle-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-hidden"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3 shadow-lg">
          {isAuthenticated && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Signed in as</p>
                <p className="text-sm font-bold text-slate-800 truncate">
                  {session?.email || 'User'}
                </p>
              </div>
              {getRoleBadge()}
            </div>
          )}

          <div className="space-y-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              );
            })}
          </div>

          {isAuthenticated ? (
            <div className="pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <LogOut className="w-5 h-5 text-rose-500" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleNavClick('login')}
                className="w-full py-2.5 text-center text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('signup')}
                className="w-full py-2.5 text-center text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-xs"
              >
                Register
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
