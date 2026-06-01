import { MobileFrame } from './components/MobileFrame';
import { SplashOverlay } from './components/SplashOverlay';
import { AuthProvider } from './lib/auth';
import { Toaster } from './components/ui/sonner';
import { Capacitor } from '@capacitor/core';
import { useState } from 'react';
import { Sentry } from './lib/sentry';

function CrashFallback({ error, componentStack }: any) {
  const name = error?.name || 'Error';
  const message = error?.message || '(no message)';
  const stack = error?.stack || '(no stack)';
  return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32, textAlign: 'center' }}>
      <p style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>DEBUG BUILD v5</p>
      <p style={{ color: 'yellow', fontSize: 14, fontWeight: 700 }}>{name}</p>
      <p style={{ color: 'orange', fontSize: 13, wordBreak: 'break-all', maxWidth: 320 }}>{message}</p>
      <p style={{ color: 'red', fontSize: 10, fontFamily: 'monospace', wordBreak: 'break-all', maxWidth: 320 }}>{stack.slice(0, 500)}</p>
      <button onClick={() => window.location.reload()} style={{ marginTop: 8, padding: '10px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 600 }}>Reload</button>
    </div>
  );
}

export default function App() {
  const isNative = Capacitor.isNativePlatform();
  const [splashDone, setSplashDone] = useState(false);

  return (
    <Sentry.ErrorBoundary fallback={(errorData: any) => <CrashFallback error={errorData?.error} componentStack={errorData?.componentStack} />}>
      <AuthProvider>
        {!splashDone && <SplashOverlay onDone={() => setSplashDone(true)} />}
        {isNative ? (
          <MobileFrame />
        ) : (
          <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
            <MobileFrame />
          </div>
        )}
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </Sentry.ErrorBoundary>
  );
}