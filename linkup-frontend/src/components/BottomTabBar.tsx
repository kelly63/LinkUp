import { PlusCircle, MessageCircle, User, LayoutDashboard } from 'lucide-react';

interface BottomTabBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  badges?: Partial<Record<string, number>>;
}

interface TabItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

const tabs: TabItem[] = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Locker room' },
  { id: 'post', icon: PlusCircle, label: 'LinkUp' },
  { id: 'chat', icon: MessageCircle, label: 'Chat' },
  { id: 'profile', icon: User, label: 'Profile' },
];

export function BottomTabBar({ activeTab, onTabChange, badges = {} }: BottomTabBarProps) {
  return (
    <div className="relative z-[200] safe-area-bottom bg-white border-t border-slate-200 px-2 pt-2">
      <div className="h-16 flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const badgeCount = badges[tab.id] ?? 0;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all ${
                isActive
                  ? 'text-emerald-900'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-6 h-6 ${isActive ? 'fill-blue-900' : ''}`}
                  strokeWidth={2}
                />
                {badgeCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center px-1">
                    <span className="text-[9px] font-bold text-white leading-none">
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                  </span>
                )}
              </div>
              <span className="text-xs font-[Magra]">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
