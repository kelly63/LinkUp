import { StatusBar } from './StatusBar';
import { HeaderBar } from './HeaderBar';
import { BottomTabBar } from './BottomTabBar';
import { MainContent } from './MainContent';
import { useState, useCallback } from 'react';
import { useAuth } from '../lib/auth';
import { useSocket, Notification } from '../hooks/useSocket';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { toast } from 'sonner';

const NOTIFICATION_MESSAGES: Record<string, (data: any) => { title: string; description: string }> = {
  roster_request: (d) => ({
    title: 'New Connection Request',
    description: `${d.requesterName || 'Someone'} wants to connect with you`,
  }),
  roster_accepted: (d) => ({
    title: 'Connection Accepted',
    description: `${d.accepterName || 'Someone'} accepted your request`,
  }),
  session_accepted: (d) => ({
    title: 'Session Accepted',
    description: d.sessionTitle ? `"${d.sessionTitle}" has a new partner` : 'Someone accepted your session',
  }),
  message_new: (d) => ({
    title: 'New Message',
    description: d.senderName ? `Message from ${d.senderName}` : 'You have a new message',
  }),
};

export function MobileFrame() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const { token } = useAuth();

  // Auto-subscribe to web push (respects existing permission)
  usePushNotifications(token);

  const handleNotification = useCallback((notification: Notification) => {
    setUnreadCount((c) => c + 1);

    const builder = NOTIFICATION_MESSAGES[notification.type];
    if (builder) {
      const { title, description } = builder(notification.data);
      toast(title, { description });
    }
  }, []);

  useSocket({ token, onNotification: handleNotification });

  const handleNotificationClick = () => {
    setActiveTab('dashboard');
    setUnreadCount(0);
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
        <HeaderBar
          onNavigate={handleNotificationClick}
          showNotifications={isAuthenticated}
          unreadCount={unreadCount}
        />

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
