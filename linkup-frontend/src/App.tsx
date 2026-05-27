import { MobileFrame } from './components/MobileFrame';
import { SplashOverlay } from './components/SplashOverlay';
import { AuthProvider } from './lib/auth';
import { Toaster } from './components/ui/sonner';
import { Capacitor } from '@capacitor/core';
import { useState, useEffect } from 'react';
import { Sentry } from './lib/sentry';

function CrashFallback() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-white font-semibold text-lg">Something went wrong</p>
      <p className="text-zinc-400 text-sm">Please restart the app. If it keeps happening, contact support.</p>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 px-6 py-2 bg-blue-600 text-white rounded-xl font-medium"
      >
        Reload
      </button>
    </div>
  );
}

export default function App() {
  const isNative = Capacitor.isNativePlatform();
  const [splashDone, setSplashDone] = useState(false);
  const [toastOffset, setToastOffset] = useState(16);

  useEffect(() => {
    if (!isNative) return;

    const readSafeArea = () => {
      const probe = document.createElement('div');
      probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;padding-top:env(safe-area-inset-top)';
      document.body.appendChild(probe);
      const sat = parseFloat(getComputedStyle(probe).paddingTop) || 0;
      document.body.removeChild(probe);
      // sat+24 gives breathing room below the Dynamic Island
      setToastOffset(sat > 0 ? sat + 24 : 100);
    };

    // Delay so WKWebView has time to populate env(safe-area-inset-top)
    const t = setTimeout(readSafeArea, 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <Sentry.ErrorBoundary fallback={<CrashFallback />}>
      <AuthProvider>
        {!splashDone && <SplashOverlay onDone={() => setSplashDone(true)} />}
        {isNative ? (
          <MobileFrame />
        ) : (
          <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
            <MobileFrame />
          </div>
        )}
        <Toaster position="top-center" richColors offset={toastOffset} />
      </AuthProvider>
    </Sentry.ErrorBoundary>
  );
}