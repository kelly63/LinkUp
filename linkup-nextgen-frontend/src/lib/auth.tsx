import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Parent, Coach, auth as authApi } from './api';
import { getSocket, disconnectSocket } from './socket';

type AppUser = Parent | Coach;

interface AuthState {
  token: string | null;
  user: AppUser | null;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (token: string, user: AppUser) => void;
  logout: () => void;
  updateUser: (user: AppUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = 'linkup_nextgen_auth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { token: parsed.token, user: parsed.user, isAuthenticated: true };
      }
    } catch {}
    return { token: null, user: null, isAuthenticated: false };
  });

  useEffect(() => {
    if (state.token) getSocket(state.token);
  }, []);

  const login = (token: string, user: AppUser) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
    getSocket(token);
    setState({ token, user, isAuthenticated: true });
  };

  const logout = () => {
    if (state.token) authApi.logout(state.token).catch(() => {});
    disconnectSocket();
    localStorage.removeItem(STORAGE_KEY);
    setState({ token: null, user: null, isAuthenticated: false });
  };

  const updateUser = (user: AppUser) => {
    if (state.token) localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: state.token, user }));
    setState(prev => ({ ...prev, user }));
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
