import { ArrowLeft, MapPin, Star, Award, Calendar, MessageSquare, Users, TrendingUp, Target, Zap, CheckCircle, ExternalLink, Instagram, Link as LinkIcon, UserPlus, UserMinus } from 'lucide-react';
import { useState } from 'react';
import { RatingModal } from './RatingModal';

interface UserProfileViewProps {
  userId: number;
  onBack: () => void;
  onSendMessage?: () => void;
  onSendPracticeRequest?: () => void;
  userType?: 'athlete' | 'coach';
  isRosterRequest?: boolean;
  onAcceptRoster?: () => void;
  onDeclineRoster?: () => void;
  isOnRoster?: boolean;
  onAddToRoster?: () => void;
}

export function UserProfileView({ userId, onBack, onSendMessage, onSendPracticeRequest, userType = 'athlete', isRosterRequest = false, onAcceptRoster, onDeclineRoster, isOnRoster = false, onAddToRoster }: UserProfileViewProps) {
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  
  // Mock user data - in a real app, this would be fetched based on userId
  const userData = {
    athlete: {
      id: 1,
      name: 'Steve Johnson',
      avatar: 'SJ',
      sport: 'Baseball',
      position: 'Pitcher (RHP)',
      level: 'NCAA D1',
      school: 'UCLA',
      location: 'Los Angeles, CA',
      distance: '2.3 mi',
      rating: 4.9,
      sessionsCompleted: 34,
      joinDate: 'January 2024',
      bio: 'RHP committed to UCLA. Working on velocity development and pitch sequencing. Looking to team up with other college-level pitchers and catchers for bullpen sessions and game prep.',
      availability: ['Weekday Mornings', 'Weekend Afternoons'],
      lookingFor: ['Pitching Mechanics', 'Velocity Training', 'Bullpen Sessions'],
      stats: [
        { label: 'Fastball', value: '87 mph', icon: Zap },
        { label: 'ERA', value: '2.14', icon: Target },
        { label: 'Sessions', value: '34', icon: Calendar },
        { label: 'Rating', value: '4.9', icon: Star }
      ],
      achievements: [
        'All-Conference 2023',
        'Perfect Game Showcase',
        'Team Captain'
      ],
      recentActivity: [
        { type: 'session', description: 'Bullpen session with Mike P.', date: '2 days ago' },
        { type: 'session', description: 'Velocity training at Elite Performance', date: '1 week ago' },
        { type: 'achievement', description: 'Completed 30th practice session', date: '2 weeks ago' }
      ],
      socials: {
        instagram: '@stevejpitching',
        hudl: 'hudl.com/stevej23'
      }
    },
    coach: {
      id: 101,
      name: 'Coach Mike Thompson',
      avatar: 'MT',
      sport: 'Baseball',
      specializations: ['Pitching', 'Catching', 'Mental Performance'],
      level: 'NCAA D1',
      location: 'Los Angeles, CA',
      distance: '3.5 mi',
      rating: 4.8,
      sessionsCompleted: 127,
      joinDate: 'March 2023',
      bio: 'Former D1 catcher and 8-year coaching veteran. Specializing in developing elite catchers and pitchers through personalized training programs. Focus on fundamentals, mental toughness, and game-ready skills.',
      yearsExperience: 8,
      rate: '$75/hr',
      certifications: ['NASM Certified', 'USA Baseball Level 2', 'Mental Performance Coach'],
      availability: ['Weekday Evenings', 'Weekend Mornings'],
      stats: [
        { label: 'Sessions', value: '127', icon: Calendar },
        { label: 'Rating', value: '4.8', icon: Star },
        { label: 'Experience', value: '8 yrs', icon: Award },
        { label: 'Athletes', value: '45+', icon: Users }
      ],
      recentActivity: [
        { type: 'session', description: 'Training session with Emma K.', date: '1 day ago' },
        { type: 'session', description: 'Group clinic at Diamond Sports', date: '3 days ago' },
        { type: 'achievement', description: 'Completed 100+ sessions milestone', date: '1 month ago' }
      ],
      socials: {
        instagram: '@coachmiket',
        website: 'mikethompsonbaseball.com'
      }
    }
  };

  const user = userType === 'athlete' ? userData.athlete : userData.coach;

  const handleRatingSubmit = (rating: number, review: string) => {
    // In a real app, this would send the rating to the backend
    console.log('Rating submitted:', { userId, rating, review });
    // Show success feedback
    alert(`Thank you for rating ${user.name}! Your ${rating}-star rating has been submitted.`);
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors -ml-2"
        >
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </button>
        <h2 className="text-slate-900">Profile</h2>
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 px-6 pt-6 pb-8">
        <div className="text-center">
          {/* Avatar */}
          <div className="w-24 h-24 bg-white rounded-full mx-auto mb-4 flex items-center justify-center text-2xl text-slate-700 shadow-lg font-semibold">
            {user.avatar}
          </div>
          
          {/* Name */}
          <h1 className="text-white text-2xl mb-2">{user.name}</h1>
          
          {/* Primary Info */}
          {userType === 'athlete' && 'position' in user && (
            <div className="flex items-center justify-center gap-2 text-blue-200 mb-2">
              <span className="text-sm">{user.sport}</span>
              <span className="text-blue-400">•</span>
              <span className="text-sm">{user.position}</span>
            </div>
          )}
          
          {userType === 'coach' && 'specializations' in user && (
            <div className="text-blue-200 mb-2">
              <span className="text-sm">{user.specializations.join(' • ')}</span>
            </div>
          )}
          
          {/* Level & School/Experience */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="bg-blue-700/50 backdrop-blur-sm px-3 py-1 rounded-full">
              <span className="text-white text-xs font-semibold">{user.level}</span>
            </div>
            {userType === 'athlete' && 'school' in user && (
              <div className="bg-blue-700/50 backdrop-blur-sm px-3 py-1 rounded-full">
                <span className="text-white text-xs font-semibold">{user.school}</span>
              </div>
            )}
            {userType === 'coach' && 'rate' in user && (
              <div className="bg-emerald-700/50 backdrop-blur-sm px-3 py-1 rounded-full">
                <span className="text-white text-xs font-semibold">{user.rate}</span>
              </div>
            )}
          </div>
          
          {/* Location */}
          <div className="flex items-center justify-center gap-1.5 text-blue-200 text-sm">
            <MapPin className="w-4 h-4" />
            <span>{user.location}</span>
            <span className="text-blue-400 mx-1">•</span>
            <span>{user.distance} away</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-6 -mt-4 mb-6">
        <div className="bg-white rounded-2xl shadow-lg p-4">
          <div className="grid grid-cols-4 gap-3">
            {user.stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="w-10 h-10 bg-blue-100 rounded-full mx-auto mb-2 flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-lg font-semibold text-slate-900">{stat.value}</div>
                <div className="text-xs text-slate-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Roster Status Badge */}
      {!isRosterRequest && (
        <div className="px-6 mb-4">
          {isOnRoster ? (
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-xl p-3 flex items-center justify-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-900">On Your Roster</span>
            </div>
          ) : (
            <button
              onClick={onAddToRoster}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
            >
              <UserPlus className="w-5 h-5" />
              <span className="font-semibold">Add to Roster</span>
            </button>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="px-6 mb-6">
        {isRosterRequest ? (
          /* Roster Request Actions */
          <div className="space-y-3">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-blue-600" />
                <h4 className="text-sm font-semibold text-blue-900">Roster Request</h4>
              </div>
              <p className="text-xs text-blue-700">
                {user.name} wants to add you to their team. Review their profile and choose your response.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={onAcceptRoster}
                className="bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
              >
                <UserPlus className="w-5 h-5" />
                <span className="font-semibold">Add to Roster</span>
              </button>
              
              <button 
                onClick={onDeclineRoster}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl transition-all flex items-center justify-center gap-2 border-2 border-slate-200"
              >
                <UserMinus className="w-5 h-5" />
                <span className="font-semibold">Leave on Bench</span>
              </button>
            </div>
          </div>
        ) : (
          /* Normal Actions */
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={onSendMessage}
              className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
            >
              <MessageSquare className="w-5 h-5" />
              <span className="font-semibold">Message</span>
            </button>
            
  
            
            <button 
              onClick={() => setIsRatingModalOpen(true)}
              className="bg-white hover:bg-slate-50 text-slate-900 py-3 rounded-xl transition-all flex items-center justify-center gap-2 border-2 border-slate-200 shadow-sm"
            >
              <Star className="w-5 h-5" />
              <span className="font-semibold">Rate</span>
            </button>
          </div>
        )}
      </div>

      {/* About Section */}
      <div className="px-6 mb-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <h3 className="text-slate-900 font-semibold mb-3 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            {userType === 'coach' ? 'Coaching Philosophy' : 'About'}
          </h3>
          <p className="text-sm text-slate-700 leading-relaxed">{user.bio}</p>
        </div>
      </div>

      {/* Looking For / Specializations */}
      <div className="px-6 mb-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <h3 className="text-slate-900 font-semibold mb-3">
            {userType === 'coach' ? 'Certifications' : 'Looking For'}
          </h3>
          <div className="flex flex-wrap gap-2">
            {userType === 'athlete' && 'lookingFor' in user && user.lookingFor.map((item, index) => (
              <span 
                key={index}
                className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium border border-blue-200"
              >
                {item}
              </span>
            ))}
            {userType === 'coach' && 'certifications' in user && user.certifications.map((cert, index) => (
              <span 
                key={index}
                className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-sm font-medium border border-emerald-200 flex items-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                {cert}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Achievements (Athletes only) */}
      {userType === 'athlete' && 'achievements' in user && (
        <div className="px-6 mb-6">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <h3 className="text-slate-900 font-semibold mb-3 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-600" />
              Achievements
            </h3>
            <div className="space-y-2">
              {user.achievements.map((achievement, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-amber-500 rounded-full" />
                  <span className="text-sm text-slate-700">{achievement}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Availability */}
      <div className="px-6 mb-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <h3 className="text-slate-900 font-semibold mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-green-600" />
            Availability
          </h3>
          <div className="flex flex-wrap gap-2">
            {user.availability.map((time, index) => (
              <span 
                key={index}
                className="bg-green-50 text-green-700 px-3 py-1.5 rounded-lg text-sm font-medium border border-green-200"
              >
                {time}
              </span>
            ))}
          </div>
        </div>
      </div>

  

      {/* Social Links */}
      <div className="px-6 mb-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <h3 className="text-slate-900 font-semibold mb-3">Connect</h3>
          <div className="space-y-2">
            {user.socials.instagram && (
              <a 
                href={`https://instagram.com/${user.socials.instagram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                  <Instagram className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium text-slate-900">{user.socials.instagram}</span>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
              </a>
            )}
            
            {userType === 'athlete' && 'socials' in user && 'hudl' in user.socials && user.socials.hudl && (
              <a 
                href={`https://${user.socials.hudl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
              >
                <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center">
                  <LinkIcon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium text-slate-900">Hudl Highlights</span>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
              </a>
            )}
            
            {userType === 'coach' && 'socials' in user && 'website' in user.socials && user.socials.website && (
              <a 
                href={`https://${user.socials.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
              >
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                  <LinkIcon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium text-slate-900">Website</span>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Member Since */}
      <div className="px-6 pb-6">
        <div className="text-center">
          <p className="text-xs text-slate-500">Member since {user.joinDate}</p>
        </div>
      </div>

      {/* Rating Modal */}
      <RatingModal 
        isOpen={isRatingModalOpen}
        onClose={() => setIsRatingModalOpen(false)}
        userName={user.name}
        onSubmit={handleRatingSubmit}
      />
    </div>
  );
}