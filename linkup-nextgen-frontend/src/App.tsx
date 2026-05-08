import { Sentry } from './lib/sentry';
import { AuthProvider } from './lib/auth';
import { MobileFrame } from './components/MobileFrame';

function CrashFallback() {
  return (
    <div className="min-h-screen bg-emerald-950 flex flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-white font-semibold text-lg">Something went wrong</p>
      <p className="text-emerald-300 text-sm">Please restart the app. If it keeps happening, contact support.</p>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 px-6 py-2 bg-emerald-600 text-white rounded-xl font-medium"
      >
        Reload
      </button>
    </div>
  );
}

export default function App() {
  return (
    <Sentry.ErrorBoundary fallback={<CrashFallback />}>
      <AuthProvider>
        <div className="min-h-screen bg-gradient-to-br from-emerald-950 to-slate-900 flex items-center justify-center p-4">
          <MobileFrame />
        </div>
      </AuthProvider>
    </Sentry.ErrorBoundary>
  );
}
