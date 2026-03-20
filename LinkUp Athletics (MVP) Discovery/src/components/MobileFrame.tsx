import { StatusBar } from './StatusBar';
import { HeaderBar } from './HeaderBar';
import { BottomTabBar } from './BottomTabBar';
import { MainContent } from './MainContent';
import { useState } from 'react';

export function MobileFrame() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleNotificationClick = () => {
    // Navigate to dashboard and scroll to activity feed
    setActiveTab('dashboard');
    // You could add a scroll target state here if you want to scroll to activity section
  };

  return (
    <div className="relative w-full max-w-[393px] h-[852px] bg-zinc-950 rounded-[3rem] shadow-2xl overflow-hidden border-8 border-zinc-900">
      {/* iPhone Frame with notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-zinc-900 rounded-b-3xl z-50"></div>
      
      {/* App Container */}
      <div className="h-full flex flex-col">
        {/* Status Bar */}
        <StatusBar />
        
        {/* Header Bar */}
        <HeaderBar onNavigate={handleNotificationClick} showNotifications={isAuthenticated} />
        
        {/* Main Content Area with Grid */}
        <MainContent 
          activeTab={activeTab} 
          onTabChange={setActiveTab}
          onAuthChange={setIsAuthenticated}
        />
        
        {/* Bottom Tab Bar - Hidden on login/signup */}
        {isAuthenticated && (
          <BottomTabBar activeTab={activeTab} onTabChange={setActiveTab} />
        )}
      </div>
    </div>
  );
}