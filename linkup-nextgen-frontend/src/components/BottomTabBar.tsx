import { Home, Search, CalendarDays, MessageSquare, User } from 'lucide-react';

interface BottomTabBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  badges?: { messages?: number };
}

const TABS = [
  { id: 'home', label: 'Home', Icon: Home },
  { id: 'coaches', label: 'Coaches', Icon: Search },
  { id: 'clinics', label: 'Clinics', Icon: CalendarDays },
  { id: 'messages', label: 'Messages', Icon: MessageSquare },
  { id: 'profile', label: 'Profile', Icon: User },
];

export function BottomTabBar({ activeTab, onTabChange, badges = {} }: BottomTabBarProps) {
  return (
    <div
      className="bg-white border-t border-slate-200 flex items-stretch flex-shrink-0"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {TABS.map(({ id, label, Icon }) => {
        const isActive = activeTab === id;
        const badge = id === 'messages' ? badges.messages : 0;
        return (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors relative ${
              isActive ? 'text-emerald-700' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className="relative">
              <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-700' : ''}`} />
              {badge != null && badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-400 text-amber-900 text-[9px] font-bold rounded-full flex items-center justify-center">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </div>
            <span className={`text-[10px] font-medium ${isActive ? 'text-emerald-700' : ''}`}>{label}</span>
            {isActive && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-emerald-600 rounded-t-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}
