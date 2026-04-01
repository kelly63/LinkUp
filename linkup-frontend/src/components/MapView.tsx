import { useState } from 'react';
import { Filter } from 'lucide-react';
import { MapPins } from './MapPins';
import { FeedOverlay } from './FeedOverlay';
import { FilterDialog } from './FilterDialog';
import { NeedDetailView } from './NeedDetailView';

export function MapView() {
  const [showFilter, setShowFilter] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [filters, setFilters] = useState({
    skillLevel: 'all',
    dateTime: 'all'
  });

  if (showDetail) {
    return <NeedDetailView onBack={() => setShowDetail(false)} />;
  }

  return (
    <div className="relative h-full w-full">
      {/* Map Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300">
        {/* Mock map grid pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
        
        {/* Mock map streets/roads */}
        <svg className="absolute inset-0 w-full h-full opacity-30" xmlns="http://www.w3.org/2000/svg">
          <line x1="0" y1="30%" x2="100%" y2="35%" stroke="#94a3b8" strokeWidth="3"/>
          <line x1="0" y1="60%" x2="100%" y2="58%" stroke="#94a3b8" strokeWidth="2"/>
          <line x1="25%" y1="0" x2="28%" y2="100%" stroke="#94a3b8" strokeWidth="2"/>
          <line x1="70%" y1="0" x2="68%" y2="100%" stroke="#94a3b8" strokeWidth="3"/>
        </svg>
      </div>

      {/* Map Pins */}
      <MapPins />

      {/* Floating Filter Button */}
      <button
        onClick={() => setShowFilter(true)}
        className="absolute top-4 right-4 z-30 bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all active:scale-95"
      >
        <Filter className="w-6 h-6 text-slate-700" />
      </button>

      {/* Feed Overlay (Pull-up card list) */}
      <FeedOverlay filters={filters} onCardClick={() => setShowDetail(true)} />

      {/* Filter Dialog */}
      {showFilter && (
        <FilterDialog 
          filters={filters}
          onFiltersChange={setFilters}
          onClose={() => setShowFilter(false)}
        />
      )}
    </div>
  );
}