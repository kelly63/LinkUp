import { MobileFrame } from './components/MobileFrame';
import { AuthProvider } from './lib/auth';

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <MobileFrame />
      </div>
    </AuthProvider>
  );
}