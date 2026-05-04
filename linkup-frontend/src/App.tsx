import { MobileFrame } from './components/MobileFrame';
import { SplashOverlay } from './components/SplashOverlay';
import { AuthProvider } from './lib/auth';
import { Toaster } from './components/ui/sonner';
import { Capacitor } from '@capacitor/core';
import { useState } from 'react';

export default function App() {
  const isNative = Capacitor.isNativePlatform();
  const [splashDone, setSplashDone] = useState(false);

  return (
    <AuthProvider>
      {!splashDone && <SplashOverlay onDone={() => setSplashDone(true)} />}
      {isNative ? (
        <MobileFrame />
      ) : (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
          <MobileFrame />
        </div>
      )}
      <Toaster position="top-center" richColors offset={isNative ? 120 : 16} />
    </AuthProvider>
  );
}