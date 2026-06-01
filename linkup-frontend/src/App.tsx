import { MobileFrame } from './components/MobileFrame';
import { SplashOverlay } from './components/SplashOverlay';
import { AuthProvider } from './lib/auth';
import { Toaster } from './components/ui/sonner';
import { Capacitor } from '@capacitor/core';
import { useState } from 'react';
import { Sentry } from './lib/sentry';

function CrashFallback({ error, componentStack }: any) {
  const msg = error?.stack || error?.message || (typeof error === 'string' ? error : null) || JSON.stringify(error) || 'no error info';
  return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32, textAlign: 'center' }}>
      <p style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>DEBUG BUILD v4</p>
      <p style={{ color: 'red', fontSize: 12, fontFamily: 'monospace', wordBreak: 'break-all', maxWidth: 320 }}>{msg}</p>
      {componentStack && <p style={{ color: '#aaa', fontSize: 10, fontFamily: 'monospace', wordBreak: 'break-all', maxWidth: 320 }}>{componentStack.slice(0, 400)}</p>}
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