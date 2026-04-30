import { MobileFrame } from './components/MobileFrame';
import { AuthProvider } from './lib/auth';
import { Toaster } from './components/ui/sonner';
import { Capacitor } from '@capacitor/core';
import { useEffect, useState } from 'react';

export default function App() {
  const isNative = Capacitor.isNativePlatform();
  const [toastOffset, setToastOffset] = useState(16);

  useEffect(() => {
    if (!isNative) return;
    // Measure the actual safe-area-inset-top pixel value at runtime
    const div = document.createElement('div');
    div.style.cssText = 'position:fixed;top:env(safe-area-inset-top);height:1px;width:1px;opacity:0;pointer-events:none';
    document.body.appendChild(div);
    const inset = div.getBoundingClientRect().top;
    document.body.removeChild(div);
    setToastOffset(Math.max(inset + 8, 16));
  }, [isNative]);

  return (
    <AuthProvider>
      {isNative ? (
        <MobileFrame />
      ) : (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
          <MobileFrame />
        </div>
      )}
      <Toaster position="top-center" richColors offset={toastOffset} />
    </AuthProvider>
  );
}