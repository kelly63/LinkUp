import React from 'react';
import { LockerRoomView } from './LockerRoomView';
import { PostView } from './PostView';
import { ChatView } from './ChatView';
import { ProfileView } from './ProfileView';
import { DashboardView } from './DashboardView';
import { MapView } from './MapView';
import { CoachProfileSetup } from './CoachProfileSetup';
import { AthleteSearchView } from './AthleteSearchView';
import { ClinicFlyerView } from './ClinicFlyerView';
import { LoginView } from './LoginView';
import { SignUpView } from './SignUpView';
import { PreferencesView } from './PreferencesView';
import { SettingsView } from './SettingsView';
import { UserProfileView } from './UserProfileView';
import { RatingView } from './RatingView';
import { ReviewsView } from './ReviewsView';
import { ReceivedRatingsView } from './ReceivedRatingsView';
import { SessionDetailsView } from './SessionDetailsView';
import { RosterListView } from './RosterListView';
import { EditSessionView } from './EditSessionView';
import { MySessionsView } from './MySessionsView';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/auth';
import { sessions as sessionsApi, ratings as ratingsApi } from '../lib/api';
import { toast } from 'sonner';

interface MainContentProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onAuthChange: (isAuthenticated: boolean) => void;
  onChatOpenChange?: (open: boolean) => void;
  externalNav?: { view: string; data?: any } | null;
  onExternalNavProcessed?: () => void;
}

export function MainContent({ activeTab, onTabChange, onAuthChange, onChatOpenChange, externalNav, onExternalNavProcessed }: MainContentProps) {
  const { token, user, isAuthenticated, login, logout } = useAuth();

  const [userRole, setUserRole] = useState<'athlete' | 'coach'>('athlete');
  const [currentView, setCurrentView] = useState<string>('');
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');

  const [selectedAthleteForChat, setSelectedAthleteForChat] = useState<{
    id: string;
    name: string;
    avatar: string;
    sport: string;
    position: string;
    level: string;
    sessionContext?: { sessionId?: string; sessionTitle: string; date: string; time: string; location: string };
  } | undefined>(undefined);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserType, setSelectedUserType] = useState<'athlete' | 'coach'>('athlete');
  const [dashboardScrollTarget, setDashboardScrollTarget] = useState<string | null>(null);
  const [postViewRequestedMode, setPostViewRequestedMode] = useState<'post' | 'find' | undefined>(undefined);
  const [ratingSessionData, setRatingSessionData] = useState<any>(null);
  const [sessionDetailsData, setSessionDetailsData] = useState<any>(null);
  const [userProfileData, setUserProfileData] = useState<any>(null);
  const [editSessionData, setEditSessionData] = useState<any>(null);
  // When navigating to userProfile from within a session, store where to return
  const [profileReturnState, setProfileReturnState] = useState<{ view: string; data: any } | null>(null);
  const [lockerRoomInitPostId, setLockerRoomInitPostId] = useState<string | null>(null);
  const [chatReturnTab, setChatReturnTab] = useState<string | null>(null);

  // When the user taps a bottom tab, dismiss any open sub-view so the tab content shows
  useEffect(() => {
    setCurrentView('');
    setSelectedUserId(null);
    setUserProfileData(null);
    setRatingSessionData(null);
    setSessionDetailsData(null);
    setEditSessionData(null);
    setProfileReturnState(null);
  }, [activeTab]);

  const userProfile = {
    sports: user?.sport ? [user.sport] : ['Baseball'],
    skillLevel: user?.skillLevel || 'NCAA D1',
    position: user?.position || 'Pitcher',
  };

  const handleNavigate = (view: string, data?: any) => {
    if (view === 'userProfile' && data) {
      // Remember where we came from so back can restore the session view
      if (currentView === 'sessionDetails' && sessionDetailsData) {
        setProfileReturnState({ view: 'sessionDetails', data: sessionDetailsData });
      } else if (currentView === 'mySessions') {
        setProfileReturnState({ view: 'mySessions', data: null });
      } else {
        setProfileReturnState(null);
      }
      setUserProfileData(data);
      setSelectedUserId(data.id || data._id || null);
      setSelectedUserType(data.type || data.role || 'athlete');
      setCurrentView('userProfile');
      return;
    }
    setCurrentView(view);
    if (view === 'rating' && data) setRatingSessionData(data);
    if (view === 'sessionDetails' && data) setSessionDetailsData(data);
    if (view === 'editSession' && data) setEditSessionData(data);
    if (view === 'lockerRoom') setLockerRoomInitPostId(data?.postId ?? null);
  };

  const handleBack = () => { setCurrentView(''); setLockerRoomInitPostId(null); };

  const handleLogin = (token?: string, userData?: any) => {
    if (token && userData) login(token, userData);
    onAuthChange(true);
  };

  const handleSignUpComplete = (token?: string, userData?: any) => {
    if (token && userData) login(token, userData);
    setAuthView('login');
    onAuthChange(true);
    onTabChange('dashboard');
  };

  const handleLogout = () => {
    logout();
    onAuthChange(false);
  };

  const handleOpenChat = (athlete: {
    id: string | number;
    name: string;
    avatar: string;
    sport: string;
    position: string;
    level: string;
    sessionContext?: { sessionTitle: string; date: string; time: string; location: string };
  }) => {
    setChatReturnTab(activeTab !== 'chat' ? activeTab : null);
    setSelectedAthleteForChat({ ...athlete, id: String(athlete.id) });
    onTabChange('chat');
  };

  const handleClearSelectedAthlete = () => setSelectedAthleteForChat(undefined);

  const handleViewChatSession = async (sessionId: string) => {
    if (!token) return;
    try {
      const { session } = await sessionsApi.getById(token, sessionId);
      handleNavigate('sessionDetails', session);
    } catch {
      toast.error('Could not load session');
    }
  };

  const handleOpenChatRef = useRef<typeof handleOpenChat>(handleOpenChat);
  handleOpenChatRef.current = handleOpenChat;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!externalNav) return;
    const { view, data } = externalNav;
    if (view === 'openChat' && data) {
      handleOpenChatRef.current(data);
    } else if (view === 'userProfile' && data?._id) {
      handleNavigate('userProfile', { ...data, id: data._id });
    } else if (view === 'mySessions') {
      handleNavigate('mySessions');
    } else if (view === 'receivedRatings') {
      handleNavigate('receivedRatings');
    } else if (view === 'postSession') {
      setPostViewRequestedMode('post');
    } else if (view === 'findSessions') {
      setPostViewRequestedMode('find');
    }
    onExternalNavProcessed?.();
  }, [externalNav]);

  const handleViewUserProfile = (userId: string | number, userType: 'athlete' | 'coach' = 'athlete') => {
    setSelectedUserId(String(userId));
    setSelectedUserType(userType);
    setCurrentView('userProfile');
  };

  const handleBackFromUserProfile = () => {
    setSelectedUserId(null);
    if (profileReturnState) {
      const { view, data } = profileReturnState;
      setCurrentView(view);
      if (view === 'sessionDetails' && data) setSessionDetailsData(data);
      setProfileReturnState(null);
    } else {
      setCurrentView('');
    }
  };

  // ── Auth gate ────────────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    if (authView === 'signup') {
      return <SignUpView onComplete={handleSignUpComplete} onBackToLogin={() => setAuthView('login')} />;
    }
    return <LoginView onLogin={handleLogin} onSignUp={() => setAuthView('signup')} />;
  }

  // ── Sub-views ────────────────────────────────────────────────────────────────
  // Each sub-view is wrapped in flex-1 min-h-0 so it occupies the remaining
  // space between the header and the always-visible bottom tab bar correctly.
  // Without this wrapper, h-full inside sub-views resolves to the full viewport
  // height and the scroll area bleeds past the tab bar.
  const wrap = (node: React.ReactNode) => (
    <div className="flex-1 min-h-0 overflow-hidden">{node}</div>
  );

  if (currentView === 'lockerRoom') return wrap(<LockerRoomView onBack={handleBack} initialOpenCommentPostId={lockerRoomInitPostId} onNavigate={handleNavigate} />);

  if (currentView === 'coachSetup') return wrap(<CoachProfileSetup onBack={handleBack} />);

  if (currentView === 'athleteSearch') {
    return wrap(
      <AthleteSearchView
        onBack={handleBack}
        onOpenChat={handleOpenChat}
        onViewProfile={handleViewUserProfile}
      />
    );
  }

  if (currentView === 'clinicFlyer') return wrap(<ClinicFlyerView onBack={handleBack} />);

  if (currentView === 'preferences') return wrap(<PreferencesView onBack={handleBack} />);
  if (currentView === 'settings') return wrap(<SettingsView onBack={handleBack} onNavigate={handleNavigate} onLogout={handleLogout} />);

  if (currentView === 'roster') {
    return wrap(<RosterListView onBack={handleBack} onNavigate={handleNavigate} onOpenChat={handleOpenChat} />);
  }

  if (currentView === 'mySessions') {
    return wrap(<MySessionsView onBack={handleBack} onNavigate={handleNavigate} />);
  }

  if (currentView === 'reviews') {
    return wrap(<ReviewsView onBack={handleBack} onNavigate={handleNavigate} />);
  }

  if (currentView === 'receivedRatings') {
    return wrap(<ReceivedRatingsView onBack={handleBack} onNavigate={handleNavigate} />);
  }

  if (currentView === 'rating' && ratingSessionData) {
    return wrap(
      <RatingView
        sessionPartner={{
          name: ratingSessionData.name,
          avatar: ratingSessionData.avatar,
          sport: ratingSessionData.sport,
          position: ratingSessionData.position,
          type: ratingSessionData.type,
          _id: ratingSessionData._id || ratingSessionData.partnerId,
        }}
        sessionDetails={{
          date: ratingSessionData.date,
          location: ratingSessionData.location,
          duration: ratingSessionData.duration,
          sessionId: ratingSessionData.sessionId,
        }}
        onBack={handleBack}
        onSubmit={async (ratingData) => {
          if (!token || !ratingSessionData._id) {
            handleBack();
            return;
          }
          try {
            await ratingsApi.submit(token, {
              rateeId: ratingSessionData._id,
              overallRating: ratingData.overallRating,
              sessionId: ratingSessionData.sessionId,
              categories: {
                skillLevel: ratingData.skillLevel || undefined,
                punctuality: ratingData.punctuality || undefined,
                communication: ratingData.communication || undefined,
                attitude: ratingData.attitude || undefined,
              },
              wouldTrainAgain: ratingData.wouldTrainAgain,
              feedback: ratingData.feedback,
              sport: ratingSessionData.sport,
            });
            toast.success('Rating submitted!');
          } catch (err: any) {
            toast.error(err?.message || 'Could not submit rating');
            handleBack();
          }
        }}
      />
    );
  }

  if (currentView === 'sessionDetails' && sessionDetailsData) {
    return wrap(
      <SessionDetailsView
        session={sessionDetailsData}
        onBack={handleBack}
        onNavigate={handleNavigate}
        onOpenChat={handleOpenChat}
      />
    );
  }

  if (currentView === 'userProfile' && selectedUserId !== null) {
    return wrap(
      <UserProfileView
        userId={selectedUserId}
        userType={selectedUserType}
        isRosterRequest={userProfileData?.isRosterRequest || false}
        onBack={handleBackFromUserProfile}
        onSendMessage={() => {
          handleOpenChat({
            id: selectedUserId,
            name: userProfileData?.name || '',
            avatar: userProfileData?.avatar || '',
            sport: userProfileData?.sport || '',
            position: userProfileData?.position || '',
            level: userProfileData?.skillLevel || userProfileData?.level || '',
          });
          handleBackFromUserProfile();
        }}
        onSendPracticeRequest={handleBackFromUserProfile}
        onAcceptRoster={handleBackFromUserProfile}
        onDeclineRoster={handleBackFromUserProfile}
      />
    );
  }

  if (currentView === 'editSession' && editSessionData) {
    return wrap(
      <EditSessionView
        session={editSessionData}
        onBack={handleBack}
        onSave={async (updatedSession) => {
          if (token && editSessionData._id) {
            try {
              await sessionsApi.update(token, editSessionData._id, updatedSession);
              toast.success('Session updated');
            } catch (err: any) {
              toast.error(err?.message || 'Could not update session');
            }
          }
          setSessionDetailsData(updatedSession);
          handleBack();
        }}
      />
    );
  }

  // ── Main tabs ────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-hidden bg-slate-50 relative">
      {activeTab === 'dashboard' && (
        <DashboardView
          onTabChange={onTabChange}
          onNavigate={handleNavigate}
          scrollTarget={dashboardScrollTarget}
        />
      )}
      {activeTab === 'map' && <MapView />}
      {activeTab === 'post' && (
        <PostView
          userSports={userProfile.sports}
          onNavigateToDashboard={(target) => {
            setDashboardScrollTarget(target);
            onTabChange('dashboard');
          }}
          onOpenChat={handleOpenChat}
          requestedViewMode={postViewRequestedMode}
          onViewModeApplied={() => setPostViewRequestedMode(undefined)}
        />
      )}
      {activeTab === 'chat' && (
        <ChatView
          currentUserId={user?._id || ''}
          token={token || ''}
          selectedAthlete={selectedAthleteForChat}
          onClearSelectedAthlete={handleClearSelectedAthlete}
          onTabChange={onTabChange}
          onChatOpenChange={onChatOpenChange}
          onViewProfile={(userId) => handleNavigate('userProfile', { _id: userId })}
          onViewSession={handleViewChatSession}
          onBack={chatReturnTab ? () => { setChatReturnTab(null); onTabChange(chatReturnTab); } : undefined}
        />
      )}
      {activeTab === 'profile' && (
        <ProfileView
          userRole={userRole}
          onRoleChange={setUserRole}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />
      )}
      {activeTab === 'userProfile' && (
        <UserProfileView
          userId={selectedUserId}
          userType={selectedUserType}
          onBack={handleBack}
        />
      )}
      {activeTab === 'rosterList' && <RosterListView onBack={handleBack} onNavigate={handleNavigate} onOpenChat={handleOpenChat} />}
    </div>
  );
}
