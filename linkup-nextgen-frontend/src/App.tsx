import { AuthProvider } from './lib/auth';
import { MobileFrame } from './components/MobileFrame';

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gradient-to-br from-emerald-950 to-slate-900 flex items-center justify-center p-4">
        <MobileFrame />
      </div>
    </AuthProvider>
  );
}
