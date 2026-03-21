import { Bell, Link2 } from 'lucide-react';

interface HeaderBarProps {
  onNavigate?: (view: string) => void;
  showNotifications?: boolean;
  unreadCount?: number;
}

export function HeaderBar({ onNavigate, showNotifications = true, unreadCount = 0 }: HeaderBarProps) {
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
          aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
        >
          <Bell className="w-5 h-5 text-gray-300" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 rounded-full shadow-lg shadow-red-500/50 flex items-center justify-center px-1">
              <span className="text-[10px] font-bold text-white leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            </span>
          )}
        </button>
      )}
    </div>
  );
}
