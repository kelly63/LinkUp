import { useState } from 'react';
import { ChevronUp } from 'lucide-react';
import { NeedCard } from './NeedCard';

interface FeedOverlayProps {
  filters: {
    skillLevel: string;
    dateTime: string;
  };
  onCardClick: () => void;
}

interface Need {
  id: number;
  title: string;
  seeking: string;
  level: string;
  distance: string;
  date: string;
  time: string;
}

const mockNeeds: Need[] = [
  {
    id: 1,
    title: 'Bullpen Session',
    seeking: 'Catcher',
    level: 'NCAA D1',
    distance: '1.2 miles away',
    date: 'Today, Dec 4',
    time: '6:00 PM – 7:30 PM'
  },
  {
    id: 2,
    title: 'Pitching Practice',
    seeking: 'LHP or RHP',
    level: 'HS Varsity',
    distance: '2.4 miles away',
    date: 'Tomorrow, Dec 5',
    time: '3:00 PM – 4:30 PM'
  },
  {
    id: 3,
    title: 'Breaking Ball Work',
    seeking: 'Catcher',
    level: 'College',
    distance: '0.8 miles away',
    date: 'Today, Dec 4',
    time: '5:00 PM – 6:30 PM'
  },
  {
    id: 4,
    title: 'Live Batting Practice',
    seeking: 'Pitcher (RHP)',
    level: 'NCAA D3',
    distance: '3.1 miles away',
    date: 'Saturday, Dec 7',
    time: '10:00 AM – 12:00 PM'
  },
];

export function FeedOverlay({ filters, onCardClick }: FeedOverlayProps) {
  const [expanded, setExpanded] = useState(false);

  const filteredNeeds = mockNeeds.filter(need => {
    if (filters.skillLevel !== 'all' && need.level !== filters.skillLevel) {
      return false;
    }
    return true;
  });

  return (
    <div 
      className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl transition-all duration-300 z-20 ${
        expanded ? 'h-[70%]' : 'h-[35%]'
      }`}
    >
      {/* Drag Handle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full pt-3 pb-2 flex justify-center"
      >
        <div className="w-12 h-1.5 bg-slate-300 rounded-full"></div>
      </button>

      {/* Header */}
      <div className="px-6 pb-3 flex items-center justify-between">
        <div>
          <h3 className="text-slate-900">Available Sessions</h3>
          <p className="text-sm text-slate-500">{filteredNeeds.length} nearby opportunities</p>
        </div>
        <button 
          onClick={() => setExpanded(!expanded)}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ChevronUp className={`w-5 h-5 text-slate-600 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Scrollable Card List */}
      <div className="overflow-y-auto px-6 pb-6 space-y-3" style={{ maxHeight: 'calc(100% - 80px)' }}>
        {filteredNeeds.map((need) => (
          <NeedCard key={need.id} need={need} onClick={onCardClick} />
        ))}
      </div>
    </div>
  );
}