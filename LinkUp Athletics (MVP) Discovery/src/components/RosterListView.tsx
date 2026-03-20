import { ArrowLeft, Users, Star, MapPin, Calendar, MessageSquare, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface RosterListViewProps {
  onBack: () => void;
  onNavigate?: (view: string, data?: any) => void;
  onOpenChat?: (athlete: { 
    id: number; 
    name: string; 
    avatar: string; 
    sport: string; 
    position: string; 
    level: string;
  }) => void;
}

export function RosterListView({ onBack, onNavigate, onOpenChat }: RosterListViewProps) {
  // Mock roster data
  const rosterConnections = [
    {
      id: 1,
      name: 'Sarah Johnson',
      avatar: 'SJ',
      sport: 'Baseball',
      position: 'Pitcher (RHP)',
      level: 'NCAA D1',
      school: 'UCLA',
      location: 'Los Angeles, CA',
      distance: '2.3 mi',
      rating: 4.9,
      sessionsCompleted: 34,
      addedDate: 'Jan 15, 2026',
      type: 'athlete' as const
    },
    {
      id: 2,
      name: 'Alex Chen',
      avatar: 'AC',
      sport: 'Basketball',
      position: 'Point Guard',
      level: 'NCAA D1',
      school: 'USC',
      location: 'Los Angeles, CA',
      distance: '4.1 mi',
      rating: 4.8,
      sessionsCompleted: 28,
      addedDate: 'Jan 10, 2026',
      type: 'athlete' as const
    },
    {
      id: 3,
      name: 'Emma Williams',
      avatar: 'EW',
      sport: 'Soccer',
      position: 'Forward',
      level: 'NCAA D1',
      school: 'Stanford',
      location: 'Palo Alto, CA',
      distance: '8.7 mi',
      rating: 4.9,
      sessionsCompleted: 42,
      addedDate: 'Jan 5, 2026',
      type: 'athlete' as const
    },
    {
      id: 101,
      name: 'Coach Mike Thompson',
      avatar: 'MT',
      sport: 'Baseball',
      position: 'Pitching Coach',
      specializations: ['Pitching', 'Catching'],
      level: 'NCAA D1',
      location: 'Los Angeles, CA',
      distance: '3.5 mi',
      rating: 4.8,
      sessionsCompleted: 127,
      addedDate: 'Dec 28, 2025',
      type: 'coach' as const
    }
  ];

  const handleViewProfile = (connection: any) => {
    if (onNavigate) {
      onNavigate('userProfile', {
        id: connection.id,
        type: connection.type,
        ...connection
      });
    }
  };

  const handleMessage = (connection: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenChat) {
      onOpenChat({
        id: connection.id,
        name: connection.name,
        avatar: connection.avatar,
        sport: connection.sport,
        position: connection.position,
        level: connection.level
      });
    }
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
        <h2 className="text-slate-900">My Roster</h2>
      </div>

      {/* Header Section */}
      <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 px-6 py-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
            <Users className="w-7 h-7 text-white" />
          </div>
          <div>
            <h3 className="text-white text-xl font-semibold">{rosterConnections.length} Connections</h3>
            <p className="text-blue-200 text-sm">Your practice partners & coaches</p>
          </div>
        </div>
      </div>

      {/* Roster List */}
      <div className="px-6 py-6">
        {rosterConnections.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <div className="w-16 h-16 bg-slate-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Users className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-slate-900 font-semibold mb-2">No Roster Connections Yet</h3>
            <p className="text-sm text-slate-600 mb-4">
              Start building your team by connecting with athletes and coaches
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {rosterConnections.map((connection) => (
              <div
                key={connection.id}
                onClick={() => handleViewProfile(connection)}
                className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer active:scale-[0.99]"
              >
                {/* Connection Header */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white font-semibold text-lg flex-shrink-0 shadow-md">
                    {connection.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="text-slate-900 font-semibold truncate">{connection.name}</h4>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                        <span className="text-sm font-semibold text-slate-900">{connection.rating}</span>
                      </div>
                    </div>
                    
                    {/* Sport & Position */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-slate-600">{connection.sport}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-sm text-slate-600">{connection.position}</span>
                    </div>
                    
                    {/* Level & School/Specializations */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md text-xs font-medium border border-blue-200">
                        {connection.level}
                      </span>
                      {connection.type === 'athlete' && 'school' in connection && (
                        <span className="text-xs text-slate-600">{connection.school}</span>
                      )}
                      {connection.type === 'coach' && 'specializations' in connection && (
                        <span className="text-xs text-slate-600">{connection.specializations?.join(', ')}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Connection Details */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-3 h-3 text-slate-600" />
                    </div>
                    <span className="text-slate-700 truncate">{connection.distance} away</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-3 h-3 text-green-600" />
                    </div>
                    <span className="text-slate-700">{connection.sessionsCompleted} sessions</span>
                  </div>
                </div>

                {/* Added Date */}
                <p className="text-xs text-slate-500 mb-3">Added on {connection.addedDate}</p>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleMessage(connection, e)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span className="text-sm font-semibold">Message</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewProfile(connection);
                    }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 px-4 rounded-xl transition-all flex items-center justify-center shadow-sm"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Spacing */}
      <div className="h-6"></div>
    </div>
  );
}