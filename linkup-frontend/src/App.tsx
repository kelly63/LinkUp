import { MobileFrame } from './components/MobileFrame';
import { AuthProvider } from './lib/auth';
import { Toaster } from './components/ui/sonner';
import { Capacitor } from '@capacitor/core';

export default function App() {
  const isNative = Capacitor.isNativePlatform();

  return (
    <AuthProvider>
      {isNative ? (
        <MobileFrame />
      ) : (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
          <MobileFrame />
        </div>
      )}
      <Toaster
        position="top-center"
        richColors
        offset={isNative ? 'calc(env(safe-area-inset-top) + 8px)' : '16px'}
      />
    </AuthProvider>
  );
}