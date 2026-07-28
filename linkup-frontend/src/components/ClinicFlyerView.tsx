import { Calendar, Award, MapPin, Clock, ArrowLeft, Users, X, DollarSign, FileText } from 'lucide-react';
import { SPORTS } from '../lib/sports';
import { useState } from 'react';

interface ClinicFlyerViewProps {
  onBack?: () => void;
}

export function ClinicFlyerView({ onBack }: ClinicFlyerViewProps) {
  const [selectedSport, setSelectedSport] = useState('Baseball');
  const [selectedSkillLevels, setSelectedSkillLevels] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [clinicTitle, setClinicTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [price, setPrice] = useState('');

  const sports = SPORTS;
  const skillLevels = ['NCAA D1', 'NCAA D2', 'NCAA D3', 'College - Other', 'Pro', 'Youth (8-12)', 'Youth (13-17)', 'Adult (18+)'];

  const toggleSkillLevel = (level: string) => {
    if (selectedSkillLevels.includes(level)) {
      setSelectedSkillLevels(selectedSkillLevels.filter(l => l !== level));
    } else {
      setSelectedSkillLevels([...selectedSkillLevels, level]);
    }
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3">
        {onBack && (
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors -ml-2"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
        )}
        <h2 className="text-slate-900">Post Clinic Flyer</h2>
      </div>

      <div className="p-6">
        <div className="max-w-md mx-auto space-y-5">
          {/* Clinic Title */}
          <div>
            <label className="text-sm text-slate-700 mb-2 block flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Clinic Title
            </label>
            <input
              type="text"
              placeholder="e.g., Elite Pitching Mechanics Clinic"
              value={clinicTitle}
              onChange={(e) => setClinicTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Sport Selection */}
          <div>
            <label className="text-sm text-slate-700 mb-2 block">
              Sport
            </label>
            <select 
              value={selectedSport}
              onChange={(e) => setSelectedSport(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 focus:border-emerald-500 focus:outline-none transition-colors"
            >
              {sports.map(sport => (
                <option key={sport}>{sport}</option>
              ))}
            </select>
          </div>

          {/* Skill Levels */}
          <div>
            <label className="text-sm text-slate-700 mb-3 block flex items-center gap-2">
              <Award className="w-4 h-4" />
              Target Skill Levels
            </label>
            <p className="text-xs text-slate-500 mb-2">Select all that apply</p>
            <div className="flex flex-wrap gap-2">
              {skillLevels.map((level) => (
                <button
                  key={level}
                  onClick={() => toggleSkillLevel(level)}
                  className={`px-3 py-2 rounded-lg text-sm transition-all ${
                    selectedSkillLevels.includes(level)
                      ? 'bg-emerald-500 text-white border-2 border-emerald-600 shadow-sm'
                      : 'bg-white text-slate-700 border-2 border-slate-300 hover:border-slate-400'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="text-sm text-slate-700 mb-2 block flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 focus:border-emerald-500 focus:outline-none transition-colors"
            />
            {selectedDate && (
              <p className="text-sm text-emerald-600 mt-2 ml-1">{formatDate(selectedDate)}</p>
            )}
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-700 mb-2 block flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 focus:border-emerald-500 focus:outline-none transition-colors"
              />
              {startTime && (
                <p className="text-xs text-slate-600 mt-1 ml-1">{formatTime(startTime)}</p>
              )}
            </div>
            <div>
              <label className="text-sm text-slate-700 mb-2 block flex items-center gap-2">
                <Clock className="w-4 h-4" />
                End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 focus:border-emerald-500 focus:outline-none transition-colors"
              />
              {endTime && (
                <p className="text-xs text-slate-600 mt-1 ml-1">{formatTime(endTime)}</p>
              )}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="text-sm text-slate-700 mb-2 block flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Location/Facility Name
            </label>
            <input
              type="text"
              placeholder="e.g., Lincoln High School Baseball Field"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none transition-colors"
            />
            <p className="text-xs text-slate-500 mt-1.5 ml-1">Include full address if needed</p>
          </div>

          {/* Max Participants */}
          <div>
            <label className="text-sm text-slate-700 mb-2 block flex items-center gap-2">
              <Users className="w-4 h-4" />
              Max Participants
            </label>
            <input
              type="number"
              placeholder="e.g., 20"
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Price */}
          <div>
            <label className="text-sm text-slate-700 mb-2 block flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Price per Athlete
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
              <input
                type="number"
                placeholder="75"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full pl-8 pr-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none transition-colors"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1.5 ml-1">Enter 0 for free clinics</p>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm text-slate-700 mb-2 block">
              Clinic Description
            </label>
            <textarea
              placeholder="Describe what will be covered, your coaching approach, what athletes should bring, etc."
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none transition-colors resize-none"
            />
            <p className="text-xs text-slate-500 mt-1 ml-1">{description.length} characters</p>
          </div>

          {/* Preview Section */}
          {clinicTitle && selectedDate && (
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-emerald-200 rounded-2xl p-5">
              <p className="text-xs text-emerald-600 mb-2 font-semibold uppercase tracking-wide">Preview</p>
              <h3 className="text-slate-900 font-semibold mb-2">{clinicTitle}</h3>
              <div className="space-y-1 text-sm text-slate-700">
                <p className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  {formatDate(selectedDate)}
                </p>
                {startTime && endTime && (
                  <p className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    {formatTime(startTime)} - {formatTime(endTime)}
                  </p>
                )}
                {price && (
                  <p className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    ${price} per athlete
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Action Button */}
          <button className="w-full bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white py-4 rounded-xl transition-all mt-8 shadow-lg shadow-emerald-500/20 hover:shadow-xl active:scale-[0.98]">
            POST CLINIC FLYER
          </button>
        </div>
      </div>
    </div>
  );
}