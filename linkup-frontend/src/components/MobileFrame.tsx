import { StatusBar } from './StatusBar';
import { HeaderBar } from './HeaderBar';
import { BottomTabBar } from './BottomTabBar';
import { MainContent } from './MainContent';
import { NotificationPanel } from './NotificationPanel';
import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { useSocket, Notification } from '../hooks/useSocket';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useNativePush } from '../hooks/useNativePush';
import { StoredNotification } from '../lib/api';
import { ExpiredSessionsModal } from './ExpiredSessionsModal';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { PushNotifications } from '@capacitor/push-notifications';
import { toast } from 'sonner';

type PendingNav = { view: string; data?: any } | null;

const NOTIFICATION_MESSAGES: Record<string, (data: any) => { title: string; description: string }> = {
  roster_request: (d) => ({
    title: 'New Connection Request',
    description: `${d.from?.name || 'Someone'} wants to connect with you`,
  }),
  roster_accepted: (d) => ({
    title: 'Connection Accepted',
    description: `${d.by?.name || 'Someone'} accepted your request`,
  }),
  session_accepted: (d) => ({
    title: 'Session Accepted',
    description: d.sessionTitle ? `"${d.sessionTitle}" has a new partner` : 'Someone accepted your session',
  }),
  message_new: (d) => ({
    title: 'New Message',
    description: d.senderName ? `Message from ${d.senderName}` : 'You have a new message',
  }),
  message_request: (d) => ({
    title: 'Message Request',
    description: `${d.from?.name || 'Someone'} sent you a message request`,
  }),
  rating_new: (d) => ({
    title: 'New Rating',
    description: d.from?.name
      ? `${d.from.name} gave you a ${d.overallRating}★ rating`
      : 'You received a new rating',
  }),
  session_updated: (d) => ({
    title: 'Session Updated',
    description: d.updatedBy?.name
      ? `${d.updatedBy.name} changed ${(d.changedFields || []).join(', ')} for "${d.sessionTitle || 'your session'}"`
      : 'A session you joined was updated',
  }),
  change_proposed: (d) => ({
    title: 'Review Requested',
    description: d.proposedBy?.name
      ? `${d.proposedBy.name} proposed schedule changes — your approval needed`
      : 'Your session partner proposed schedule changes',
  }),
  session_cancelled: (d) => ({
    title: 'Session Cancelled',
    description: d.cancelledBy?.name
      ? `${d.cancelledBy.name} cancelled "${d.sessionTitle || 'your session'}"`
      : 'A session was cancelled',
  }),
  change_approved: (d) => ({
    title: 'Change Approved',
    description: d.approvedBy?.name
      ? `${d.approvedBy.name} approved your changes to "${d.sessionTitle || 'your session'}"`
      : 'Your proposed session changes were approved',
  }),
  change_declined: (d) => ({
    title: 'Change Declined',
    description: d.declinedBy?.name
      ? `${d.declinedBy.name} declined your changes to "${d.sessionTitle || 'your session'}"`
      : 'Your proposed session changes were declined',
  }),
  session_inquiry: (d) => ({
    title: 'Join Request',
    description: d.requester?.name
      ? `${d.requester.name} wants to join "${d.sessionTitle || 'your session'}"`
      : 'Someone wants to join your session',
  }),
  partner_approved: (d) => ({
    title: 'Request Approved!',
    description: d.approvedBy?.name
      ? `${d.approvedBy.name} approved your request — session confirmed`
      : 'Your join request was approved — session confirmed',
  }),
  partner_declined: (d) => ({
    title: 'Request Declined',
    description: d.declinedBy?.name
      ? `${d.declinedBy.name} declined your join request`
      : 'Your join request was declined',
  }),
};

export function MobileFrame() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [panelOpen, setPanelOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatUnread, setChatUnread] = useState(0);
  const [liveQueue, setLiveQueue] = useState<StoredNotification[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [pendingNav, setPendingNav] = useState<PendingNav>(null);

  // Auth state comes directly from context — survives page refresh automatically
  const { token, isAuthenticated } = useAuth();

  usePushNotifications(token);
  useNativePush(token); // auto-registers APNs device token if permission already granted

  const handleNotification = useCallback((notification: Notification) => {
    setUnreadCount((c) => c + 1);

    if (notification.type === 'message_new') {
      setChatUnread((c) => c + 1);
    }

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

  // Handle deep links — e.g. linkupathletics://profile/<userId> from QR code scans
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listener = CapApp.addListener('appUrlOpen', (event) => {
      const match = event.url.match(/linkupathletics:\/\/profile\/([^/?]+)/);
      if (match) {
        setActiveTab('dashboard');
        setPendingNav({ view: 'userProfile', data: { _id: match[1] } });
      }
    });
    return () => { listener.then((l) => l.remove()); };
  }, []);

  // Handle push notification taps (app opened/foregrounded from a notification)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const foreground = PushNotifications.addListener('pushNotificationReceived', () => {
      // Already handled by socket when app is open — no extra action needed
    });
    const tapped = PushNotifications.addListener('pushNotificationActionPerformed', (action: any) => {
      const data = action.notification?.data ?? {};
      const type = data.type as string | undefined;
      if (type === 'message_new' || type === 'message_request') {
        setActiveTab('chat');
      } else if (type === 'roster_request' || type === 'roster_accepted') {
        setActiveTab('dashboard');
        setPendingNav({ view: 'roster' });
      } else if (type === 'session_accepted' || type === 'session_updated' || type === 'change_proposed' || type === 'change_approved' || type === 'change_declined' || type === 'session_cancelled' || type === 'session_inquiry' || type === 'partner_approved' || type === 'partner_declined') {
        setActiveTab('dashboard');
        setPendingNav({ view: 'sessions' });
      } else if (type === 'rating_new') {
        setActiveTab('profile');
      }
    });
    return () => {
      foreground.then((l: any) => l.remove());
      tapped.then((l: any) => l.remove());
    };
  }, []);

  const handleBellClick = useCallback(() => {
    setPanelOpen((open) => {
      if (!open) setUnreadCount(0);
      return !open;
    });
  }, []);

  const handlePanelClose = useCallback(() => {
    setPanelOpen(false);
    setLiveQueue([]);
  }, []);

  const handleAllRead = useCallback(() => setUnreadCount(0), []);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    if (tab === 'chat') setChatUnread(0);
  }, []);

  const handleNotificationNavigate = useCallback((type: string, data: any) => {
    setPanelOpen(false);
    setLiveQueue([]);
    switch (type) {
      case 'roster_request':
        setPendingNav({
          view: 'userProfile',
          data: { _id: data.from?._id, name: data.from?.name, avatar: data.from?.avatar, isRosterRequest: true },
        });
        break;
      case 'roster_accepted':
        setPendingNav({
          view: 'userProfile',
          data: { _id: data.by?._id, name: data.by?.name, avatar: data.by?.avatar },
        });
        break;
      case 'session_accepted':
        setPendingNav({ view: 'mySessions', data: null });
        break;
      case 'message_new':
        setActiveTab('chat');
        setPendingNav({
          view: 'openChat',
          data: { id: data.senderId, name: data.senderName || 'Unknown', avatar: data.senderAvatar || '', sport: '', position: '', level: '' },
        });
        break;
      case 'message_request':
        setActiveTab('chat');
        setPendingNav({
          view: 'openChat',
          data: { id: data.from?._id, name: data.from?.name || 'Unknown', avatar: data.from?.avatar || '', sport: '', position: '', level: '' },
        });
        break;
      case 'rating_new':
        setPendingNav({ view: 'receivedRatings', data: null });
        break;
      case 'session_updated':
      case 'session_cancelled':
      case 'change_proposed':
      case 'change_approved':
      case 'change_declined':
      case 'session_inquiry':
      case 'partner_approved':
      case 'partner_declined':
        setPendingNav({ view: 'mySessions', data: null });
        break;
    }
  }, []);

  const isNative = Capacitor.isNativePlatform();

  const inner = (
    <div className="h-full flex flex-col">
      {/* Fake status bar only shown in web demo frame */}
      {!isNative && <StatusBar />}

      <HeaderBar
        onBellClick={handleBellClick}
        showNotifications={isAuthenticated}
        unreadCount={unreadCount}
        panelOpen={panelOpen}
      />

      {isAuthenticated && <ExpiredSessionsModal />}

      {isAuthenticated && token && (
        <NotificationPanel
          token={token}
          open={panelOpen}
          onClose={handlePanelClose}
          liveQueue={liveQueue}
          onAllRead={handleAllRead}
          onNavigate={handleNotificationNavigate}
        />
      )}

      <MainContent
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onAuthChange={() => {}}
        onChatOpenChange={setChatOpen}
        externalNav={pendingNav}
        onExternalNavProcessed={() => setPendingNav(null)}
      />

      {isAuthenticated && !chatOpen && (
        <BottomTabBar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          badges={{ chat: chatUnread }}
        />
      )}
    </div>
  );

  if (isNative) {
    // fixed inset-0 pins all four edges to the viewport — prevents the whole
    // page from scrolling and keeps the header and tab bar always visible
    return <div className="fixed inset-0 flex flex-col overflow-hidden">{inner}</div>;
  }

  return (
    <div className="relative w-full max-w-[393px] h-[852px] bg-zinc-950 rounded-[3rem] shadow-2xl overflow-hidden border-8 border-zinc-900">
      {/* iPhone notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-zinc-900 rounded-b-3xl z-50" />
      {inner}
    </div>
  );
}
