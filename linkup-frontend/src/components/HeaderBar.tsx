import { Bell } from 'lucide-react';

interface HeaderBarProps {
  onBellClick?: () => void;
  showNotifications?: boolean;
  unreadCount?: number;
  panelOpen?: boolean;
}

export function HeaderBar({
  onBellClick,
  showNotifications = true,
  unreadCount = 0,
  panelOpen = false,
}: HeaderBarProps) {
  return (
    <div className="h-14 bg-zinc-900/50 border-b border-zinc-800/50 px-6 flex items-center justify-between backdrop-blur-sm">
      {/* App Logo/Name */}
      <div className="flex items-center gap-2">
        <span className="font-semibold text-gray-100 font-[Magra]">LinkUp Athletics MVP </span>
      </div>

      {/* Notification Bell */}
      {showNotifications && (
        <button
          onClick={onBellClick}
          className={`relative p-2 rounded-full transition-colors ${
            panelOpen ? 'bg-zinc-700/70' : 'hover:bg-zinc-800/50'
          }`}
          aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
          aria-expanded={panelOpen}
        >
          <Bell className={`w-5 h-5 ${panelOpen ? 'text-white' : 'text-gray-300'}`} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full shadow-md shadow-red-500/60 ring-2 ring-zinc-900" />
          )}
        </button>
      )}
    </div>
  );
}
