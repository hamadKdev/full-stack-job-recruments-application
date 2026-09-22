import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserRole, UserSession } from '../types';
import { login as apiLogin, LoginPayload } from '../api/auth';
import { useToast } from './ToastContext';

interface AuthContextType {
  session: UserSession | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginUser: (payload: LoginPayload) => Promise<UserSession>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { showToast } = useToast();

  // Initialize session from localStorage on application load
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const role = localStorage.getItem('role') as UserRole | null;
    const userId = localStorage.getItem('user_id');
    const email = localStorage.getItem('user_email') || undefined;
    const name = localStorage.getItem('user_name') || undefined;

    if (token && role && userId) {
      setSession({
        token,
        role,
        userId,
        email,
        name,
      });
    }
    setIsLoading(false);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('role');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_name');
    setSession(null);
    showToast('You have been logged out.', 'info');
  }, [showToast]);

  // Listen for unauthorized 401 events from API client
  useEffect(() => {
    const handleUnauthorized = () => {
      setSession(null);
      showToast('Your session has expired. Please sign in again.', 'warning');
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [showToast]);

  const loginUser = async (payload: LoginPayload): Promise<UserSession> => {
    const res = await apiLogin(payload);
    
    // Store in localStorage
    localStorage.setItem('access_token', res.access_token);
    localStorage.setItem('role', res.role);
    localStorage.setItem('user_id', res.user_id);
    localStorage.setItem('user_email', payload.email);

    const userSession: UserSession = {
      token: res.access_token,
      role: res.role,
      userId: res.user_id,
      email: payload.email,
    };

    setSession(userSession);
    showToast(res.message || 'Logged in successfully!', 'success');
    return userSession;
  };

  const role = session ? session.role : null;
  const isAuthenticated = !!(session && session.token);

  return (
    <AuthContext.Provider
      value={{
        session,
        role,
        isAuthenticated,
        isLoading,
        loginUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
