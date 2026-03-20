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
import { useState } from 'react';

interface MainContentProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onAuthChange: (isAuthenticated: boolean) => void;
}

export function MainContent({ activeTab, onTabChange, onAuthChange }: MainContentProps) {
  const [userRole, setUserRole] = useState<'athlete' | 'coach'>('athlete');
  const [currentView, setCurrentView] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  const [selectedAthleteForChat, setSelectedAthleteForChat] = useState<{ 
    id: number; 
    name: string; 
    avatar: string; 
    sport: string; 
    position: string; 
    level: string;
    sessionContext?: {
      sessionTitle: string;
      date: string;
      time: string;
      location: string;
    };
  } | undefined>(undefined);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUserType, setSelectedUserType] = useState<'athlete' | 'coach'>('athlete');
  const [dashboardScrollTarget, setDashboardScrollTarget] = useState<string | null>(null);
  const [ratingSessionData, setRatingSessionData] = useState<any>(null);
  const [sessionDetailsData, setSessionDetailsData] = useState<any>(null);
  const [userProfileData, setUserProfileData] = useState<any>(null);
  const [editSessionData, setEditSessionData] = useState<any>(null);
  
  // Mock user profile data - in production this would come from backend/auth
  const userProfile = {
    sports: ['Baseball', 'Basketball'], // Athlete's rostered sports (primary and secondary)
    skillLevel: 'NCAA D1',
    position: 'Pitcher'
  };

  const handleNavigate = (view: string, data?: any) => {
    setCurrentView(view);
    if (view === 'rating' && data) {
      setRatingSessionData(data);
    }
    if (view === 'sessionDetails' && data) {
      setSessionDetailsData(data);
    }
    if (view === 'userProfile' && data) {
      setUserProfileData(data);
      setSelectedUserId(data.id || 1);
      setSelectedUserType(data.type || 'athlete');
    }
    if (view === 'editSession' && data) {
      setEditSessionData(data);
    }
  };

  const handleBack = () => {
    setCurrentView('');
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
    onAuthChange(true);
  };

  const handleSignUpComplete = () => {
    setIsAuthenticated(true);
    setAuthView('login');
    onAuthChange(true);
  };

  const handleGoToSignUp = () => {
    setAuthView('signup');
  };

  const handleBackToLogin = () => {
    setAuthView('login');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAuthView('login');
    onAuthChange(false);
  };

  const handleOpenChat = (athlete: { 
    id: number; 
    name: string; 
    avatar: string; 
    sport: string; 
    position: string; 
    level: string;
    sessionContext?: {
      sessionTitle: string;
      date: string;
      time: string;
      location: string;
    };
  }) => {
    setSelectedAthleteForChat(athlete);
    onTabChange('chat');
  };

  const handleClearSelectedAthlete = () => {
    setSelectedAthleteForChat(undefined);
  };

  const handleViewUserProfile = (userId: number, userType: 'athlete' | 'coach' = 'athlete') => {
    setSelectedUserId(userId);
    setSelectedUserType(userType);
    setCurrentView('userProfile');
  };

  const handleBackFromUserProfile = () => {
    setSelectedUserId(null);
    setCurrentView('');
  };

  // Show auth screens if not authenticated
  if (!isAuthenticated) {
    if (authView === 'signup') {
      return <SignUpView onComplete={handleSignUpComplete} onBackToLogin={handleBackToLogin} />;
    }
    return <LoginView onLogin={handleLogin} onSignUp={handleGoToSignUp} />;
  }

  // Handle special views
  if (currentView === 'coachSetup') {
    return <CoachProfileSetup onBack={handleBack} />;
  }

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
    return (
      <div className="h-full bg-slate-50">
        <ClinicFlyerView onBack={handleBack} />
      </div>
    );
  }

  if (currentView === 'preferences') {
    return <PreferencesView onBack={handleBack} />;
  }

  if (currentView === 'roster') {
    return <RosterListView onBack={handleBack} onNavigate={handleNavigate} onOpenChat={handleOpenChat} />;
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
          type: ratingSessionData.type
        }}
        sessionDetails={{
          date: ratingSessionData.date,
          location: ratingSessionData.location,
          duration: ratingSessionData.duration
        }}
        onBack={handleBack}
        onSubmit={(ratingData) => {
          console.log('Rating submitted:', ratingData);
          handleBack();
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
    const isRosterRequest = userProfileData?.isRosterRequest || false;
    
    return (
      <UserProfileView 
        userId={selectedUserId} 
        userType={selectedUserType}
        isRosterRequest={isRosterRequest}
        onBack={handleBackFromUserProfile}
        onSendMessage={() => {
          // Navigate to chat with this user
          handleOpenChat({
            id: selectedUserId,
            name: userProfileData?.name || (selectedUserType === 'athlete' ? 'Sarah Johnson' : 'Coach Mike Thompson'),
            avatar: userProfileData?.avatar || (selectedUserType === 'athlete' ? 'SJ' : 'MT'),
            sport: userProfileData?.sport || 'Baseball',
            position: userProfileData?.position || (selectedUserType === 'athlete' ? 'Pitcher (RHP)' : 'Coach'),
            level: userProfileData?.level || 'NCAA D1'
          });
          handleBackFromUserProfile();
        }}
        onSendPracticeRequest={() => {
          // Handle practice request
          console.log('Practice request sent');
        }}
        onAcceptRoster={() => {
          // Handle accepting roster request
          console.log('Roster request accepted for', userProfileData?.name);
          // Show success message or update UI
          handleBackFromUserProfile();
        }}
        onDeclineRoster={() => {
          // Handle declining roster request
          console.log('Roster request declined for', userProfileData?.name);
          // Show message or update UI
          handleBackFromUserProfile();
        }}
      />
    );
  }

  if (currentView === 'editSession' && editSessionData) {
    return (
      <EditSessionView 
        session={editSessionData}
        onBack={handleBack}
        onSave={(updatedSession) => {
          console.log('Session updated:', updatedSession);
          // In production, this would update the backend
          setSessionDetailsData(updatedSession);
          handleBack();
        }}
      />
    );
  }

  return (
    <div className="flex-1 overflow-hidden bg-slate-50 relative">
      {activeTab === 'dashboard' && <DashboardView onTabChange={onTabChange} onNavigate={handleNavigate} scrollTarget={dashboardScrollTarget} />}
      {activeTab === 'map' && <MapView />}
      {activeTab === 'post' && <PostView 
        userSports={userProfile.sports}
        onNavigateToDashboard={(target) => {
          setDashboardScrollTarget(target);
          onTabChange('dashboard');
        }}
        onOpenChat={handleOpenChat}
      />} 
      {activeTab === 'chat' && <ChatView selectedAthlete={selectedAthleteForChat} onClearSelectedAthlete={handleClearSelectedAthlete} onTabChange={onTabChange} />}
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