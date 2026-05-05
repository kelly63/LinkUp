export function StatusBar() {
  const now = new Date();
  const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return (
    <div className="bg-emerald-950 flex justify-between items-center px-6 py-1 flex-shrink-0">
      <span className="text-white text-xs font-semibold">{time}</span>
      <div className="flex items-center gap-1">
        <div className="w-4 h-2.5 border border-white/60 rounded-sm relative">
          <div className="absolute inset-0.5 right-1 bg-white/80 rounded-sm" />
          <div className="absolute -right-0.5 top-1/2 -translate-y-1/2 w-0.5 h-1 bg-white/60 rounded-r-sm" />
        </div>
      </div>
    </div>
  );
}
