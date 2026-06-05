import { Bell } from 'lucide-react';

interface HeaderBarProps {
  onBellClick?: () => void;
  onLogoClick?: () => void;
  showNotifications?: boolean;
  unreadCount?: number;
  panelOpen?: boolean;
}

export function HeaderBar({
  onBellClick,
  onLogoClick,
  showNotifications = true,
  unreadCount = 0,
  panelOpen = false,
}: HeaderBarProps) {
  return (
    <div className="safe-area-top bg-zinc-900/50 border-b border-zinc-800/50 backdrop-blur-sm">
    <div className="h-14 px-6 flex items-center justify-between">
      {/* App Logo/Name */}
      <button
        onClick={onLogoClick}
        className="flex items-center gap-2 active:opacity-70 transition-opacity"
        aria-label="Go to Locker Room"
      >
        <img src="https://i.imgur.com/LnXJJ04.png" alt="LinkUp Athletics" className="w-6 h-6 object-contain" />
        <span className="font-semibold text-gray-100 font-[Magra]">LinkUp Athletics</span>
      </button>

      {/* Notification Bell */}
      {showNotifications && (
        <button
          onClick={onBellClick}
          className={`relative p-2 rounded-full transition-all duration-200 ${
            panelOpen
              ? 'bg-zinc-700/70'
              : unreadCount > 0
                ? 'bg-emerald-400/20'
                : 'hover:bg-zinc-800/50'
          }`}
          aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
          aria-expanded={panelOpen}
        >
          <Bell
            className={`w-5 h-5 transition-colors ${
              panelOpen ? 'text-white' : unreadCount > 0 ? 'text-emerald-400' : 'text-gray-300'
            }`}
          />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-md shadow-red-500/60 ring-2 ring-zinc-900" />
          )}
        </button>
      )}
    </div>
    </div>
  );
}
