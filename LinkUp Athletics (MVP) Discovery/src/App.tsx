import { MobileFrame } from './components/MobileFrame';
import { AuthProvider } from './lib/auth';
import { Toaster } from './components/ui/sonner';

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <MobileFrame />
      </div>
      <Toaster position="top-center" richColors />
    </AuthProvider>
  );
}