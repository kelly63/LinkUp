import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/auth';
import logo from '/logo.png';

export function BiometricLockScreen() {
  const { unlock, logout } = useAuth();
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const didAutoPrompt = useRef(false);

  const handleUnlock = async () => {
    if (unlocking) return;
    setUnlocking(true);
    setError(null);
    try {
      await unlock();
    } catch (err: any) {
      const msg = err?.message || '';
      console.error('[BiometricLockScreen] unlock error:', msg, err);
      const cancelled = msg.toLowerCase().includes('cancel') || msg.toLowerCase().includes('fallback');
      if (!cancelled) {
        const unavailable = msg.toLowerCase().includes('not available') || msg.toLowerCase().includes('not enrolled');
        setError(unavailable
          ? 'Face ID is not available on this device. Use the link below to sign in.'
          : 'Face ID failed. Tap to try again or use the link below.'
        );
      }
    } finally {
      setUnlocking(false);
    }
  };

  // Auto-trigger Face ID prompt as soon as the lock screen mounts
  useEffect(() => {
    if (didAutoPrompt.current) return;
    didAutoPrompt.current = true;
    handleUnlock();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 px-8" style={{ backgroundColor: '#09090b' }}>
      <img src={logo} alt="LinkUp" className="w-20 h-20 rounded-2xl" />

      <div className="text-center space-y-1">
        <h1 style={{ color: '#ffffff', fontSize: '1.5rem', fontWeight: 700 }}>Welcome back</h1>
        {!error && (
          <p style={{ color: '#d4d4d8', fontSize: '0.875rem' }}>Verify your identity to continue</p>
        )}
        {error && (
          <p style={{ color: '#fca5a5', fontSize: '0.875rem', lineHeight: '1.4' }}>{error}</p>
        )}
      </div>

      <button
        type="button"
        onClick={handleUnlock}
        disabled={unlocking}
        style={{ opacity: unlocking ? 0.5 : 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}
      >
        <div style={{
          width: '4rem', height: '4rem',
          backgroundColor: 'rgba(16,185,129,0.15)',
          borderRadius: '1rem',
          border: '1px solid rgba(16,185,129,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg viewBox="0 0 24 24" style={{ width: '2rem', height: '2rem', color: '#34d399' }} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
        <span style={{ color: '#34d399', fontSize: '0.875rem', fontWeight: 600 }}>
          {unlocking ? 'Verifying…' : 'Use Face ID'}
        </span>
      </button>

      <button
        type="button"
        onClick={logout}
        style={{ color: '#e4e4e7', fontSize: '0.875rem', textDecoration: 'underline', textUnderlineOffset: '3px', marginTop: '0.5rem', WebkitTextFillColor: '#e4e4e7' }}
      >
        Sign in with a different account
      </button>
    </div>
  );
}
