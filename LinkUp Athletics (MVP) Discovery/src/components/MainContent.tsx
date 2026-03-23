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
import { UserProfileView } from './UserProfileView';
import { RatingView } from './RatingView';
import { ReviewsView } from './ReviewsView';
import { ReceivedRatingsView } from './ReceivedRatingsView';
import { SessionDetailsView } from './SessionDetailsView';
import { RosterListView } from './RosterListView';
import { EditSessionView } from './EditSessionView';
import { MySessionsView } from './MySessionsView';
import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { sessions as sessionsApi, ratings as ratingsApi } from '../lib/api';
import { toast } from 'sonner';

interface MainContentProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onAuthChange: (isAuthenticated: boolean) => void;
}

export function MainContent({ activeTab, onTabChange, onAuthChange }: MainContentProps) {
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
    sessionContext?: { sessionTitle: string; date: string; time: string; location: string };
  } | undefined>(undefined);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserType, setSelectedUserType] = useState<'athlete' | 'coach'>('athlete');
  const [dashboardScrollTarget, setDashboardScrollTarget] = useState<string | null>(null);
  const [ratingSessionData, setRatingSessionData] = useState<any>(null);
  const [sessionDetailsData, setSessionDetailsData] = useState<any>(null);
  const [userProfileData, setUserProfileData] = useState<any>(null);
  const [editSessionData, setEditSessionData] = useState<any>(null);

  const userProfile = {
    sports: user?.sport ? [user.sport] : ['Baseball'],
    skillLevel: user?.skillLevel || 'NCAA D1',
    position: user?.position || 'Pitcher',
  };

  const handleNavigate = (view: string, data?: any) => {
    setCurrentView(view);
    if (view === 'rating' && data) setRatingSessionData(data);
    if (view === 'sessionDetails' && data) setSessionDetailsData(data);
    if (view === 'userProfile' && data) {
      setUserProfileData(data);
      setSelectedUserId(data.id || data._id || null);
      setSelectedUserType(data.type || data.role || 'athlete');
    }
    if (view === 'editSession' && data) setEditSessionData(data);
  };

  const handleBack = () => setCurrentView('');

  const handleLogin = (token?: string, userData?: any) => {
    if (token && userData) login(token, userData);
    onAuthChange(true);
  };

  const handleSignUpComplete = (token?: string, userData?: any) => {
    if (token && userData) login(token, userData);
    setAuthView('login');
    onAuthChange(true);
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
    setSelectedAthleteForChat({ ...athlete, id: String(athlete.id) });
    onTabChange('chat');
  };

  const handleClearSelectedAthlete = () => setSelectedAthleteForChat(undefined);

  const handleViewUserProfile = (userId: string | number, userType: 'athlete' | 'coach' = 'athlete') => {
    setSelectedUserId(String(userId));
    setSelectedUserType(userType);
    setCurrentView('userProfile');
  };

  const handleBackFromUserProfile = () => {
    setSelectedUserId(null);
    setCurrentView('');
  };

  // ── Auth gate ────────────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    if (authView === 'signup') {
      return <SignUpView onComplete={handleSignUpComplete} onBackToLogin={() => setAuthView('login')} />;
    }
    return <LoginView onLogin={handleLogin} onSignUp={() => setAuthView('signup')} />;
  }

  // ── Sub-views ────────────────────────────────────────────────────────────────
  if (currentView === 'coachSetup') return <CoachProfileSetup onBack={handleBack} />;

  if (currentView === 'athleteSearch') {
    return (
      <div className="h-full bg-slate-50">
        <AthleteSearchView
          onBack={handleBack}
          onOpenChat={handleOpenChat}
          onViewProfile={handleViewUserProfile}
        />
      </div>
    );
  }

  if (currentView === 'clinicFlyer') {
    return <div className="h-full bg-slate-50"><ClinicFlyerView onBack={handleBack} /></div>;
  }

  if (currentView === 'preferences') return <PreferencesView onBack={handleBack} />;

  if (currentView === 'roster') {
    return <RosterListView onBack={handleBack} onNavigate={handleNavigate} onOpenChat={handleOpenChat} />;
  }

  if (currentView === 'mySessions') {
    return <MySessionsView onBack={handleBack} onNavigate={handleNavigate} />;
  }

  if (currentView === 'reviews') {
    return <ReviewsView onBack={handleBack} onNavigate={handleNavigate} />;
  }

  if (currentView === 'receivedRatings') {
    return <ReceivedRatingsView onBack={handleBack} onNavigate={handleNavigate} />;
  }

  if (currentView === 'rating' && ratingSessionData) {
    return (
      <RatingView
        sessionPartner={{
          name: ratingSessionData.name,
          avatar: ratingSessionData.avatar,
          sport: ratingSessionData.sport,
          position: ratingSessionData.position,
          type: ratingSessionData.type,
          // Pass through IDs for API call
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
    return (
      <SessionDetailsView
        session={sessionDetailsData}
        onBack={handleBack}
        onNavigate={handleNavigate}
        onOpenChat={handleOpenChat}
      />
    );
  }

  if (currentView === 'userProfile' && selectedUserId !== null) {
    return (
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
    return (
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
        />
      )}
      {activeTab === 'chat' && (
        <ChatView
          currentUserId={user?._id || ''}
          token={token || ''}
          selectedAthlete={selectedAthleteForChat}
          onClearSelectedAthlete={handleClearSelectedAthlete}
          onTabChange={onTabChange}
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
      {activeTab === 'rosterList' && <RosterListView />}
    </div>
  );
}
