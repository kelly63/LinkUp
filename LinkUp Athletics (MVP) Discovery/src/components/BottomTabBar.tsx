import { PlusCircle, MessageCircle, User, LayoutDashboard, Activity } from 'lucide-react';

interface BottomTabBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
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

export function BottomTabBar({ activeTab, onTabChange }: BottomTabBarProps) {
  return (
    <div className="h-20 bg-white border-t border-slate-200 px-2 pb-2">
      <div className="h-full flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all ${
                isActive 
                  ? 'text-blue-900' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon 
                className={`w-6 h-6 ${isActive ? 'fill-blue-900' : ''}`}
                strokeWidth={isActive ? 2 : 2}
              />
              <span className="text-xs font-[Magra]">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}