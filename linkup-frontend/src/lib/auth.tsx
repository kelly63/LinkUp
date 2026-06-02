import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, auth as authApi } from './api';
import { getSocket, disconnectSocket } from './socket';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = 'linkup_auth';

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

  // Reconnect socket if we restored a token from localStorage,
  // and refresh user data so verification status / profile changes are always current
  useEffect(() => {
    if (state.token) {
      getSocket(state.token);
      authApi.getMe(state.token)
        .then(({ user }) => {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: state.token, user }));
          setState((prev) => ({ ...prev, user }));
        })
        .catch(() => {}); // silently ignore — stale cached data is still usable
    }
  }, []);

  const login = (token: string, user: User) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
    getSocket(token);
    setState({ token, user, isAuthenticated: true });
  };

  const logout = () => {
    if (state.token) {
      authApi.logout(state.token).catch(() => {});
    }
    disconnectSocket();
    localStorage.removeItem(STORAGE_KEY);
    setState({ token: null, user: null, isAuthenticated: false });
  };

  const updateUser = (user: User) => {
    if (state.token) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: state.token, user }));
    }
    setState((prev) => ({ ...prev, user }));
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
