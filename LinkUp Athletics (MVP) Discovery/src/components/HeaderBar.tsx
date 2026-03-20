import { Bell, Link2 } from 'lucide-react';

interface HeaderBarProps {
  onNavigate?: (view: string) => void;
  showNotifications?: boolean;
}

export function HeaderBar({ onNavigate, showNotifications = true }: HeaderBarProps) {
  return (
    <div className="h-14 bg-zinc-900/50 border-b border-zinc-800/50 px-6 flex items-center justify-between backdrop-blur-sm">
      {/* App Logo/Name */}
      <div className="flex items-center gap-2">
        
        <span className="font-semibold text-gray-100 font-[Magra]">LinkUp Athletics MVP </span>
      </div>
      
      {/* Notification Icon */}
      {showNotifications && (
        <button 
          onClick={() => onNavigate?.('activity')}
          className="relative p-2 hover:bg-zinc-800/50 rounded-full transition-colors"
        >
          <Bell className="w-5 h-5 text-gray-300" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full shadow-lg shadow-red-500/50"></span>
        </button>
      )}
    </div>
  );
}