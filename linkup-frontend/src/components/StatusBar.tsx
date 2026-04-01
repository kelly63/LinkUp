import { Wifi, Signal, Battery } from 'lucide-react';

export function StatusBar() {
  const currentTime = new Date().toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: false 
  });

  return (
    <div className="h-11 bg-zinc-950 px-8 flex items-center justify-between text-[13px] text-gray-100">
      {/* Left: Time */}
      <div className="font-semibold">
        {currentTime}
      </div>
      
      {/* Right: Status Icons */}
      <div className="flex items-center gap-1.5">
        <Signal className="w-4 h-4" strokeWidth={2.5} />
        <Wifi className="w-4 h-4" strokeWidth={2.5} />
        <Battery className="w-6 h-4" strokeWidth={2.5} />
      </div>
    </div>
  );
}