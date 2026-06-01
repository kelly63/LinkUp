import { X } from 'lucide-react';

interface FilterDialogProps {
  filters: {
    skillLevel: string;
    dateTime: string;
  };
  onFiltersChange: (filters: { skillLevel: string; dateTime: string }) => void;
  onClose: () => void;
}

const skillLevels = [
  { value: 'all', label: 'All Levels' },
  { value: 'NCAA D1', label: 'NCAA D1' },
  { value: 'NCAA D2', label: 'NCAA D2' },
  { value: 'NCAA D3', label: 'NCAA D3' },
  { value: 'College', label: 'College' },
  { value: 'Pro', label: 'Pro' },
];

const dateTimes = [
  { value: 'all', label: 'Any Time' },
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'week', label: 'This Week' },
  { value: 'weekend', label: 'Weekend' },
];

export function FilterDialog({ filters, onFiltersChange, onClose }: FilterDialogProps) {
  return (
    <div className="absolute inset-0 bg-black/50 z-40 flex items-end">
      <div className="bg-white w-full rounded-t-3xl p-6 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-slate-900">Filters</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Skill Level Filter */}
        <div className="mb-6">
          <label className="text-sm text-slate-600 mb-3 block">Skill Level</label>
          <div className="space-y-2">
            {skillLevels.map((level) => (
              <button
                key={level.value}
                onClick={() => onFiltersChange({ ...filters, skillLevel: level.value })}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                  filters.skillLevel === level.value
                    ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-400'
                    : 'bg-slate-50 text-slate-700 border-2 border-transparent hover:bg-slate-100'
                }`}
              >
                {level.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date/Time Filter */}
        <div className="mb-6">
          <label className="text-sm text-slate-600 mb-3 block">Date & Time</label>
          <div className="space-y-2">
            {dateTimes.map((time) => (
              <button
                key={time.value}
                onClick={() => onFiltersChange({ ...filters, dateTime: time.value })}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                  filters.dateTime === time.value
                    ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-400'
                    : 'bg-slate-50 text-slate-700 border-2 border-transparent hover:bg-slate-100'
                }`}
              >
                {time.label}
              </button>
            ))}
          </div>
        </div>

        {/* Apply Button */}
        <button
          onClick={onClose}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-xl transition-colors"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
}