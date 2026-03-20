import { ChevronLeft, Calendar, MapPin, Clock, Users, Trophy, MessageCircle, Phone, Mail, Star, Navigation, CheckCircle, AlertCircle } from 'lucide-react';

interface SessionDetailsViewProps {
  session: {
    id: number;
    sport: string;
    role: string;
    date: string;
    time: string;
    location: string;
    status: string;
  };
  onBack: () => void;
  onNavigate?: (view: string, data?: any) => void;
  onOpenChat?: (athlete: { 
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
  }) => void;
}

export function SessionDetailsView({ session, onBack, onNavigate, onOpenChat }: SessionDetailsViewProps) {
  // Mock partner data based on session
  const partner = {
    name: session.sport === 'Baseball' ? 'Sarah Johnson' : 'Alex Chen',
    avatar: session.sport === 'Baseball' ? 'SJ' : 'AC',
    position: session.sport === 'Baseball' ? 'Pitcher (RHP)' : 'Point Guard',
    level: 'NCAA D1',
    rating: 4.8,
    sessionsCompleted: session.sport === 'Baseball' ? 47 : 32,
    phone: '(555) 123-4567',
    email: session.sport === 'Baseball' ? 'sarah.j@email.com' : 'alex.c@email.com'
  };

  // Mock session details
  const sessionDetails = {
    fullAddress: session.location,
    duration: '2 hours',
    skillLevel: 'Advanced',
    notes: session.sport === 'Baseball' 
      ? 'Focus on fastball and changeup mechanics. Bring your own glove and cleats.'
      : 'Working on shooting form and consistency from 3-point range. Bring basketball shoes.',
    equipment: session.sport === 'Baseball'
      ? ['Baseball glove', 'Cleats', 'Water bottle']
      : ['Basketball shoes', 'Athletic wear', 'Water bottle']
  };

  // Function to add event to calendar
  const handleAddToCalendar = () => {
    // Parse date and time for calendar
    const eventTitle = `${session.sport} Practice with ${partner.name}`;
    const eventDescription = `${session.role} session\\n\\n${sessionDetails.notes}\\n\\nContact: ${partner.phone}`;
    const eventLocation = session.location;
    
    // For simplicity, create a Google Calendar link (works on both iOS and Android)
    // Format: YYYYMMDDTHHMMSS
    const dateTimeStr = session.date + ' ' + session.time; // e.g., "Mar 15, 2025 2:00 PM"
    
    // Create a rough start time (in production, parse properly)
    const now = new Date();
    const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
    startDate.setHours(14, 0, 0, 0); // 2:00 PM
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // +2 hours
    
    const formatDateTime = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };
    
    // Google Calendar URL
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${formatDateTime(startDate)}/${formatDateTime(endDate)}&details=${encodeURIComponent(eventDescription)}&location=${encodeURIComponent(eventLocation)}`;
    
    // Open in new window
    window.open(googleCalendarUrl, '_blank');
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 px-6 pt-4 pb-6">
        <div className="flex items-center gap-3 mb-3">
          <button 
            onClick={onBack}
            className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors backdrop-blur-sm"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <div>
            <h2 className="text-white">Session Details</h2>
            <p className="text-blue-200 text-sm">{session.sport} Practice</p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex justify-center">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
            session.status === 'confirmed'
              ? 'bg-green-500/20 border border-green-400/30'
              : 'bg-amber-500/20 border border-amber-400/30'
          }`}>
            {session.status === 'confirmed' ? (
              <CheckCircle className="w-4 h-4 text-green-300" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-300" />
            )}
            <span className={`text-sm font-medium ${
              session.status === 'confirmed' ? 'text-green-200' : 'text-amber-200'
            }`}>
              {session.status === 'confirmed' ? 'Confirmed Session' : 'Pending Confirmation'}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {/* Partner Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-4">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white font-semibold text-xl flex-shrink-0">
              {partner.avatar}
            </div>
            <div className="flex-1">
              <h3 className="text-slate-900 font-medium mb-1">{partner.name}</h3>
              <p className="text-sm text-slate-600 mb-2">{partner.position}</p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span className="text-sm text-slate-700 font-medium">{partner.rating}</span>
                </div>
                <span className="text-sm text-slate-400">•</span>
                <span className="text-sm text-slate-600">{partner.sessionsCompleted} sessions</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-lg">
              <Trophy className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs text-blue-700 font-medium">{partner.level}</span>
            </div>
          </div>

          {/* Contact Actions */}
          <div className="grid grid-cols-3 gap-2">
            <button 
              className="flex flex-col items-center gap-1.5 py-3 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors" 
              onClick={() => {
                console.log('Message button clicked');
                console.log('onOpenChat exists:', !!onOpenChat);
                if (onOpenChat) {
                  onOpenChat({
                    id: session.id,
                    name: partner.name,
                    avatar: partner.avatar,
                    sport: session.sport,
                    position: partner.position,
                    level: partner.level,
                    sessionContext: {
                      sessionTitle: `${session.sport} Practice`,
                      date: session.date,
                      time: session.time,
                      location: session.location
                    }
                  });
                }
              }}
            >
              <MessageCircle className="w-5 h-5 text-blue-600" />
              <span className="text-xs text-blue-700 font-medium">Message</span>
            </button>
            <a 
              href={`tel:${partner.phone}`}
              className="flex flex-col items-center gap-1.5 py-3 bg-green-50 hover:bg-green-100 rounded-xl transition-colors"
            >
              <Phone className="w-5 h-5 text-green-600" />
              <span className="text-xs text-green-700 font-medium">Call</span>
            </a>
            <a 
              href={`mailto:${partner.email}?subject=${encodeURIComponent(`${session.sport} Session - ${session.date}`)}&body=${encodeURIComponent(`Hi ${partner.name},\n\nI wanted to reach out regarding our upcoming ${session.sport} practice session on ${session.date} at ${session.time}.\n\nLocation: ${session.location}\n\nLooking forward to it!\n\nBest regards`)}`}
              className="flex flex-col items-center gap-1.5 py-3 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors"
            >
              <Mail className="w-5 h-5 text-purple-600" />
              <span className="text-xs text-purple-700 font-medium">Email</span>
            </a>
          </div>
        </div>

        {/* Session Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-4">
          <h3 className="text-slate-900 font-medium mb-4">Session Information</h3>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-0.5">Date & Time</p>
                <p className="text-slate-900 font-medium">{session.date} at {session.time}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-500 mb-0.5">Location</p>
                <p className="text-slate-900 font-medium mb-2">{sessionDetails.fullAddress}</p>
                <button className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700">
                  <Navigation className="w-4 h-4" />
                  Get Directions
                </button>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-0.5">Duration</p>
                <p className="text-slate-900 font-medium">{sessionDetails.duration}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-0.5">Skill Level</p>
                <p className="text-slate-900 font-medium">{sessionDetails.skillLevel}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Session Notes */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-4">
          <h3 className="text-slate-900 font-medium mb-3">Session Notes</h3>
          <p className="text-sm text-slate-700 leading-relaxed">{sessionDetails.notes}</p>
        </div>

        {/* What to Bring */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-4">
          <h3 className="text-slate-900 font-medium mb-3">What to Bring</h3>
          <div className="space-y-2">
            {sessionDetails.equipment.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <span className="text-sm text-slate-700">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {session.status === 'pending' && (
            <button className="w-full py-3.5 bg-gradient-to-br from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl font-medium transition-all shadow-sm">
              Confirm Session
            </button>
          )}
          
          <button className="w-full py-3.5 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-medium transition-all shadow-sm" onClick={handleAddToCalendar}>
            Add to Calendar
          </button>
          
          <button 
            className="w-full py-3.5 bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 rounded-xl font-medium transition-all"
            onClick={() => onNavigate && onNavigate('editSession', session)}
          >
            Edit Session
          </button>
          
          <button className="w-full py-3.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-xl font-medium transition-all">
            Cancel Session
          </button>
        </div>

        {/* Bottom Spacing */}
        <div className="h-6"></div>
      </div>
    </div>
  );
}