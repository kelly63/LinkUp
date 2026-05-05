import { Bell } from 'lucide-react';

interface HeaderBarProps {
  onBellClick?: () => void;
  unreadCount?: number;
  showNotifications?: boolean;
}

export function HeaderBar({ onBellClick, unreadCount = 0, showNotifications = false }: HeaderBarProps) {
  return (
    <div className="bg-emerald-950 px-5 py-3 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-xs">NG</span>
        </div>
        <div>
          <span className="text-white font-bold text-sm leading-none">LinkUp</span>
          <span className="text-emerald-400 font-bold text-sm leading-none"> NextGen</span>
        </div>
      </div>

      {showNotifications && (
        <button onClick={onBellClick} className="relative p-2 hover:bg-white/10 rounded-full transition-colors">
          <Bell className="w-5 h-5 text-white" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-amber-400 text-amber-900 text-[9px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
