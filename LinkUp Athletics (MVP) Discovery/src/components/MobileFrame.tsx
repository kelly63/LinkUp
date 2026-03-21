import { StatusBar } from './StatusBar';
import { HeaderBar } from './HeaderBar';
import { BottomTabBar } from './BottomTabBar';
import { MainContent } from './MainContent';
import { NotificationPanel } from './NotificationPanel';
import { useState, useCallback, useRef } from 'react';
import { useAuth } from '../lib/auth';
import { useSocket, Notification } from '../hooks/useSocket';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { StoredNotification } from '../lib/api';
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
  const [panelOpen, setPanelOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  // Notifications that arrived via socket while panel may be open
  const [liveQueue, setLiveQueue] = useState<StoredNotification[]>([]);

  const { token } = useAuth();

  usePushNotifications(token);

  const handleNotification = useCallback((notification: Notification) => {
    setUnreadCount((c) => c + 1);

    // If notification has an _id (persisted), add to live queue for the panel
    if ((notification as any)._id) {
      setLiveQueue((q) => [notification as unknown as StoredNotification, ...q]);
    }

    const builder = NOTIFICATION_MESSAGES[notification.type];
    if (builder) {
      const { title, description } = builder(notification.data);
      toast(title, { description });
    }
  }, []);

  useSocket({ token, onNotification: handleNotification });

  const handleBellClick = useCallback(() => {
    setPanelOpen((open) => !open);
  }, []);

  const handlePanelClose = useCallback(() => {
    setPanelOpen(false);
    setLiveQueue([]);
  }, []);

  const handleAllRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  return (
    <div className="relative w-full max-w-[393px] h-[852px] bg-zinc-950 rounded-[3rem] shadow-2xl overflow-hidden border-8 border-zinc-900">
      {/* iPhone notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-zinc-900 rounded-b-3xl z-50" />

      <div className="h-full flex flex-col">
        <StatusBar />

        <HeaderBar
          onBellClick={handleBellClick}
          showNotifications={isAuthenticated}
          unreadCount={unreadCount}
          panelOpen={panelOpen}
        />

        {/* Notification panel sits inside the frame, below the header */}
        {isAuthenticated && token && (
          <NotificationPanel
            token={token}
            open={panelOpen}
            onClose={handlePanelClose}
            liveQueue={liveQueue}
            onAllRead={handleAllRead}
          />
        )}

        <MainContent
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onAuthChange={setIsAuthenticated}
        />

        {isAuthenticated && (
          <BottomTabBar activeTab={activeTab} onTabChange={setActiveTab} />
        )}
      </div>
    </div>
  );
}
