import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, auth as authApi } from './api';
import { getSocket, disconnectSocket } from './socket';
import { getBiometricEnabled, setBiometricEnabled, isBiometricAvailable, verifyBiometric } from './biometric';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLocked: boolean;
}

interface AuthContextValue extends AuthState {
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
  unlock: () => Promise<void>;
  enableBiometric: () => Promise<void>;
  disableBiometric: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = 'linkup_auth';

function readStorage(): { token: string; user: User } | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const stored = readStorage();

  // If we have a stored session, start locked (pessimistic). The mount effect
  // immediately unlocks if biometric is disabled, so the lock screen only
  // appears for users who actually have biometric enabled.
  const [state, setState] = useState<AuthState>({
    token: stored?.token ?? null,
    user: stored?.user ?? null,
    isAuthenticated: !!stored,
    isLocked: !!stored, // locked until we verify biometric preference
  });

  // On mount: check biometric preference and unlock immediately if not enabled
  useEffect(() => {
    if (!stored) return;
    getBiometricEnabled().then((enabled) => {
      if (!enabled) {
        setState((prev) => ({ ...prev, isLocked: false }));
      }
      // else stay locked — user must call unlock()
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // After unlock: reconnect socket and refresh user data
  useEffect(() => {
    if (state.token && !state.isLocked) {
      getSocket(state.token);
      authApi.getMe(state.token)
        .then(({ user }) => {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: state.token, user }));
          setState((prev) => ({ ...prev, user }));
        })
        .catch(() => {});
    }
  }, [state.isLocked]); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback((token: string, user: User) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
    getSocket(token);
    // Start locked; unlock immediately if biometric is not enabled.
    // This ensures Face ID is required even after a fresh sign-in.
    setState({ token, user, isAuthenticated: true, isLocked: true });
    getBiometricEnabled().then((enabled) => {
      if (!enabled) setState((prev) => ({ ...prev, isLocked: false }));
    });
  }, []);

  const logout = useCallback(() => {
    setState((prev) => {
      if (prev.token) authApi.logout(prev.token).catch(() => {});
      return { token: null, user: null, isAuthenticated: false, isLocked: false };
    });
    disconnectSocket();
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const updateUser = useCallback((user: User) => {
    setState((prev) => {
      if (prev.token) localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: prev.token, user }));
      return { ...prev, user };
    });
  }, []);

  const unlock = useCallback(async () => {
    await verifyBiometric();
    setState((prev) => ({ ...prev, isLocked: false }));
  }, []);

  const enableBiometric = useCallback(async () => {
    await verifyBiometric(); // confirm identity before enabling
    await setBiometricEnabled(true);
  }, []);

  const disableBiometric = useCallback(async () => {
    await setBiometricEnabled(false);
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, updateUser, unlock, enableBiometric, disableBiometric }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
