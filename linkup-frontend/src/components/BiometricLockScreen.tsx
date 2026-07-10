import { useState } from 'react';
import { useAuth } from '../lib/auth';
import logo from '/logo.png';

export function BiometricLockScreen() {
  const { unlock, logout } = useAuth();
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUnlock = async () => {
    setUnlocking(true);
    setError(null);
    try {
      await unlock();
    } catch (err: any) {
      // User cancelled or biometric failed — show gentle message
      const code = err?.message || '';
      if (!code.includes('cancel') && !code.includes('Cancel')) {
        setError('Biometric verification failed. Try again or sign in.');
      }
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col items-center justify-center gap-8 px-8">
      <img src={logo} alt="LinkUp" className="w-20 h-20 rounded-2xl" />

      <div className="text-center">
        <h1 className="text-white text-2xl font-bold mb-1">Welcome back</h1>
        <p className="text-zinc-400 text-sm">Verify your identity to continue</p>
      </div>

      {error && (
        <p className="text-red-400 text-sm text-center">{error}</p>
      )}

      <button
        onClick={handleUnlock}
        disabled={unlocking}
        className="flex flex-col items-center gap-2 disabled:opacity-50"
      >
        {/* Face ID icon */}
        <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center border border-emerald-500/30">
          <svg viewBox="0 0 24 24" className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 3H5a2 2 0 0 0-2 2v4" />
            <path d="M15 3h4a2 2 0 0 1 2 2v4" />
            <path d="M9 21H5a2 2 0 0 1-2-2v-4" />
            <path d="M15 21h4a2 2 0 0 0 2-2v-4" />
            <circle cx="9" cy="10" r=".5" fill="currentColor" />
            <circle cx="15" cy="10" r=".5" fill="currentColor" />
            <path d="M9 15c.83.83 1.5 1 3 1s2.17-.17 3-1" />
            <path d="M12 7v3" />
          </svg>
        </div>
        <span className="text-emerald-400 text-sm font-medium">
          {unlocking ? 'Verifying…' : 'Use Face ID'}
        </span>
      </button>

      <button
        onClick={logout}
        className="text-zinc-500 text-sm underline underline-offset-2 mt-4"
      >
        Sign in with a different account
      </button>
    </div>
  );
}
