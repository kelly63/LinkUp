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
import { StoredNotification, notifications as notificationsApi, messages as messagesApi } from '../lib/api';
import { ExpiredSessionsModal } from './ExpiredSessionsModal';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { PushNotifications } from '@capacitor/push-notifications';
import { toast } from 'sonner';
import { isBiometricAvailable, getBiometricEnabled } from '../lib/biometric';

const BIOMETRIC_ASKED_KEY = 'linkup_biometric_asked';

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
  session_nearby: (d) => ({
    title: `New ${d.sport || ''} Session`.trim(),
    description: d.location
      ? `${d.postedBy?.name || 'Someone'} posted a session near ${d.location}`
      : `${d.postedBy?.name || 'Someone'} posted a ${d.sport || 'training'} session`,
  }),
  rating_reminder: (d) => ({
    title: 'Rate Your Session',
    description: d.sessionTitle
      ? `How was "${d.sessionTitle}"? Don't forget to rate your partner.`
      : "Don't forget to rate your training partner.",
  }),
};

export function MobileFrame() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [panelOpen, setPanelOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatUnread, setChatUnread] = useState(0);
  const [liveQueue, setLiveQueue] = useState<StoredNotification[]>([]);
  const [pendingNav, setPendingNav] = useState<PendingNav>(null);
  const [expiredDismissed, setExpiredDismissed] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Auth state comes directly from context — survives page refresh automatically
  const { token, isAuthenticated, isLocked, enableBiometric } = useAuth();
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [biometricPrompting, setBiometricPrompting] = useState(false);

  usePushNotifications(token);
  useNativePush(token); // auto-registers APNs device token if permission already granted

  // Must be declared before handleNotification (which uses it in its dep array)
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
      case 'session_nearby':
        setActiveTab('post');
        break;
      case 'rating_reminder':
        setPendingNav({ view: 'receivedRatings', data: null });
        break;
    }
  }, []);

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
      toast(title, {
        description,
        action: {
          label: 'View',
          onClick: () => handleNotificationNavigate(notification.type, notification.data),
        },
      });
    }
  }, [handleNotificationNavigate]);

  // Badge counts are otherwise only updated by live socket events, so a
  // notification that arrives while the app is closed/backgrounded (or a
  // socket event missed during a connection drop) would leave the bell/chat
  // badges silently stuck at 0. Reconcile from the server on every connect
  // (including reconnects) so the badges always reflect real unread state.
  const refreshUnreadCounts = useCallback(() => {
    if (!token) return;
    notificationsApi.getAll(token)
      .then(({ notifications }) => setUnreadCount(notifications.filter((n) => !n.read).length))
      .catch(() => {});
    messagesApi.getInbox(token)
      .then(({ conversations }) => setChatUnread(conversations.reduce((sum, c) => sum + (c.unread || 0), 0)))
      .catch(() => {});
  }, [token]);

  useSocket({ token, onNotification: handleNotification, onConnect: refreshUnreadCounts });

  // Hide the bottom tab bar while a text input is focused — on native iOS the
  // keyboard shrinks the WebView viewport, which otherwise pushes the tab bar
  // (a normal flow element, not position: fixed) up to sit above the keyboard.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const isTextInput = (el: EventTarget | null) =>
      el instanceof HTMLElement && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
    const handleFocusIn = (e: FocusEvent) => {
      if (isTextInput(e.target)) setKeyboardVisible(true);
    };
    const handleFocusOut = (e: FocusEvent) => {
      if (isTextInput(e.target)) setKeyboardVisible(false);
    };
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  // Handle deep links — custom scheme (QR codes) and Universal Links (emails)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listener = CapApp.addListener('appUrlOpen', (event) => {
      // Custom scheme: linkupathletics://profile/<userId> from QR codes
      const qrMatch = event.url.match(/linkupathletics:\/\/profile\/([^/?]+)/);
      if (qrMatch) {
        setActiveTab('dashboard');
        setPendingNav({ view: 'userProfile', data: { _id: qrMatch[1] } });
        return;
      }
      // Universal Links from emails
      try {
        const { pathname } = new URL(event.url);
        if (pathname === '/go/post-session') {
          setActiveTab('post');
        } else if (pathname === '/go/find-sessions') {
          setActiveTab('post');
        }
      } catch {}
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
      } else if (type === 'rating_new' || type === 'rating_reminder') {
        setActiveTab('profile');
      } else if (type === 'session_nearby') {
        setActiveTab('post');
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

  // Show Face ID prompt once after unlock on native if not yet asked and not already enabled.
  // Depends on isLocked (not just isAuthenticated) to avoid racing with the lock screen.
  useEffect(() => {
    if (!isAuthenticated || isLocked || !Capacitor.isNativePlatform()) return;
    if (localStorage.getItem(BIOMETRIC_ASKED_KEY)) return;
    Promise.all([isBiometricAvailable(), getBiometricEnabled()]).then(([{ available }, enabled]) => {
      if (available && !enabled) setShowBiometricPrompt(true);
    });
  }, [isAuthenticated, isLocked]);

  const handleEnableBiometric = async () => {
    setBiometricPrompting(true);
    try {
      await enableBiometric();
      localStorage.setItem(BIOMETRIC_ASKED_KEY, 'true');
      setShowBiometricPrompt(false);
      toast.success('Face ID enabled');
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase();
      if (!msg.includes('cancel')) toast.error('Face ID verification failed. You can enable it later in Settings.');
    } finally {
      setBiometricPrompting(false);
    }
  };

  const handleDismissBiometric = () => {
    localStorage.setItem(BIOMETRIC_ASKED_KEY, 'true');
    setShowBiometricPrompt(false);
  };

  const isNative = Capacitor.isNativePlatform();

  const inner = (
    <div className="relative h-full flex flex-col">
      {/* Fake status bar only shown in web demo frame */}
      {!isNative && <StatusBar />}

      <HeaderBar
        onBellClick={handleBellClick}
        showNotifications={isAuthenticated}
        unreadCount={unreadCount}
        panelOpen={panelOpen}
      />

      {isAuthenticated && !expiredDismissed && (
        <ExpiredSessionsModal onDismiss={() => setExpiredDismissed(true)} />
      )}

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
        onChatOpenChange={undefined}
        externalNav={pendingNav}
        onExternalNavProcessed={() => setPendingNav(null)}
      />

      {isAuthenticated && !keyboardVisible && (
        <BottomTabBar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          badges={{ chat: chatUnread }}
        />
      )}

      {showBiometricPrompt && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={handleDismissBiometric} />
          <div className="relative w-full bg-white rounded-t-3xl px-6 pt-6 pb-10 shadow-xl">
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-6" />
            <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 11c0-2.761 2.239-5 5-5s5 2.239 5 5M3.5 11c0-4.694 3.806-8.5 8.5-8.5S20.5 6.306 20.5 11M9 11c0-1.657 1.343-3 3-3s3 1.343 3 3M12 17v-2m0 0c-1.105 0-2-.895-2-2v-1a2 2 0 014 0v1c0 1.105-.895 2-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-900 text-center mb-2">Enable Face ID</h3>
            <p className="text-slate-500 text-center text-sm mb-6">Use Face ID to quickly and securely unlock LinkUp each time you open the app.</p>
            <button
              onClick={handleEnableBiometric}
              disabled={biometricPrompting}
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-semibold text-base mb-3 disabled:opacity-60"
            >
              {biometricPrompting ? 'Verifying…' : 'Enable Face ID'}
            </button>
            <button
              onClick={handleDismissBiometric}
              className="w-full text-slate-500 py-3 text-sm font-medium"
            >
              Not Now
            </button>
          </div>
        </div>
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
