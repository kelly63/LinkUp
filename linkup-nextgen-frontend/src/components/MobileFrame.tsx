import { useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar } from './StatusBar';
import { HeaderBar } from './HeaderBar';
import { BottomTabBar } from './BottomTabBar';
import { AuthView } from './AuthView';
import { HomeView } from './HomeView';
import { CoachDiscoveryView } from './CoachDiscoveryView';
import { ClinicListView } from './ClinicListView';
import { ChildProfilesView } from './ChildProfilesView';
import { ParentProfileView } from './ParentProfileView';
import { CoachProfileView } from './CoachProfileView';
import { MessagesView } from './MessagesView';
import { useAuth } from '../lib/auth';
import { Toaster } from 'sonner';

export function MobileFrame() {
  const { isAuthenticated, user } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [msgUnread, setMsgUnread] = useState(0);
  const [viewingCoachId, setViewingCoachId] = useState<string | null>(null);
  const [openChatUserId, setOpenChatUserId] = useState<string | null>(null);

  const isNative = Capacitor.isNativePlatform();

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    if (tab === 'messages') setMsgUnread(0);
    setViewingCoachId(null);
    setOpenChatUserId(null);
  }, []);

  const handleViewCoach = (id: string) => setViewingCoachId(id);
  const handleOpenChat = (userId: string) => {
    setOpenChatUserId(userId);
    setActiveTab('messages');
  };

  const renderContent = () => {
    if (!isAuthenticated) return <AuthView />;

    if (viewingCoachId) {
      return (
        <CoachProfileView
          coachId={viewingCoachId}
          onBack={() => setViewingCoachId(null)}
          onMessage={handleOpenChat}
        />
      );
    }

    switch (activeTab) {
      case 'home':
        return <HomeView onViewCoach={handleViewCoach} onOpenChat={handleOpenChat} />;
      case 'coaches':
        return <CoachDiscoveryView onViewCoach={handleViewCoach} />;
      case 'clinics':
        return <ClinicListView onViewCoach={handleViewCoach} />;
      case 'messages':
        return <MessagesView initialUserId={openChatUserId} onClose={() => setOpenChatUserId(null)} />;
      case 'profile':
        return user?.role === 'parent'
          ? <ParentProfileView />
          : <ParentProfileView />;
      default:
        return <HomeView onViewCoach={handleViewCoach} onOpenChat={handleOpenChat} />;
    }
  };

  const inner = (
    <div className="h-full flex flex-col bg-slate-50">
      <Toaster position="top-center" richColors />
      {!isNative && isAuthenticated && <StatusBar />}
      {isAuthenticated && (
        <HeaderBar showNotifications unreadCount={0} />
      )}
      <div className="flex-1 overflow-hidden">
        {renderContent()}
      </div>
      {isAuthenticated && (
        <BottomTabBar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          badges={{ messages: msgUnread }}
        />
      )}
    </div>
  );

  if (isNative) {
    return <div className="fixed inset-0 flex flex-col overflow-hidden">{inner}</div>;
  }

  return (
    <div className="relative w-full max-w-[393px] h-[852px] bg-zinc-950 rounded-[3rem] shadow-2xl overflow-hidden border-8 border-zinc-900">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-zinc-900 rounded-b-3xl z-50" />
      {inner}
    </div>
  );
}
