import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, auth as authApi, UNAUTHORIZED_EVENT } from './api';
import { getSocket, disconnectSocket } from './socket';
import { getBiometricEnabled, setBiometricEnabled, isBiometricAvailable, verifyBiometric } from './biometric';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

// Re-lock after this many ms in background (0 = every foreground, 60000 = 1 min)
const RELOCK_AFTER_MS = 60_000;

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
// Proactively logout if the app hasn't been opened in this many ms (matches JWT expiry)
const MAX_IDLE_MS = 90 * 24 * 60 * 60 * 1000;

function readStorage(): { token: string; user: User } | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // If we have an idle timestamp and it's too old, clear the session now
      // so the user sees the login screen immediately instead of getting 401 errors
      if (parsed.lastActiveAt && Date.now() - parsed.lastActiveAt > MAX_IDLE_MS) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return parsed;
    }
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

  // Re-lock when app returns to foreground after >RELOCK_AFTER_MS in background
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let backgroundedAt: number | null = null;
    const sub = CapApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) {
        backgroundedAt = Date.now();
        return;
      }
      const elapsed = backgroundedAt ? Date.now() - backgroundedAt : 0;
      backgroundedAt = null;
      if (elapsed < RELOCK_AFTER_MS) return;
      getBiometricEnabled().then((enabled) => {
        if (enabled) setState((prev) => prev.isAuthenticated ? { ...prev, isLocked: true } : prev);
      });
    });
    return () => { sub.then((h) => h.remove()); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-logout when any API call gets a 401 (expired/invalid token)
  useEffect(() => {
    const handle = () => {
      localStorage.removeItem(STORAGE_KEY);
      disconnectSocket();
      setState({ token: null, user: null, isAuthenticated: false, isLocked: false });
      // Clear any pending error toasts — the login screen is coming, not a server error
      toast.dismiss();
    };
    window.addEventListener(UNAUTHORIZED_EVENT, handle);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handle);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // After unlock: reconnect socket and refresh user data
  useEffect(() => {
    if (state.token && !state.isLocked) {
      getSocket(state.token);
      authApi.getMe(state.token)
        .then(({ user }) => {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: state.token, user, lastActiveAt: Date.now() }));
          setState((prev) => ({ ...prev, user }));
        })
        .catch(() => {});
    }
  }, [state.isLocked]); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback((token: string, user: User) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user, lastActiveAt: Date.now() }));
    getSocket(token);
    // Password login already proves identity — unlock immediately.
    // Face ID is used on subsequent cold launches and background re-locks.
    setState({ token, user, isAuthenticated: true, isLocked: false });
  }, []);

  const logout = useCallback(() => {
    // Read token from localStorage before clearing state so we can fire the logout API
    // call as a plain statement rather than inside a setState updater (which must be pure)
    const stored = readStorage();
    if (stored?.token) authApi.logout(stored.token).catch(() => {});
    setState({ token: null, user: null, isAuthenticated: false, isLocked: false });
    disconnectSocket();
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const updateUser = useCallback((user: User) => {
    setState((prev) => {
      if (prev.token) localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: prev.token, user, lastActiveAt: Date.now() }));
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
