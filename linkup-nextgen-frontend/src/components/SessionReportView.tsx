import { useState, useEffect } from 'react';
import { X, Star, Plus, Trash2, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { reports as reportsApi, AssessmentCategory, SessionWithReport } from '../lib/api';
import { useAuth } from '../lib/auth';
import { toast } from 'sonner';

interface StarRatingProps {
  value: number;
  onChange: (v: number) => void;
}

function StarRating({ value, onChange }: StarRatingProps) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          className="focus:outline-none"
        >
          <Star
            className={`w-7 h-7 transition-colors ${
              n <= (hovered || value)
                ? 'text-amber-400 fill-amber-400'
                : 'text-slate-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

interface SessionReportViewProps {
  session: SessionWithReport;
  onClose: () => void;
  onSaved: () => void;
}

export function SessionReportView({ session, onClose, onSaved }: SessionReportViewProps) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [reportText, setReportText] = useState('');
  const [categories, setCategories] = useState<AssessmentCategory[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [areasToWorkOn, setAreasToWorkOn] = useState('');
  const [focusAreas, setFocusAreas] = useState('');
  const [expandedSection, setExpandedSection] = useState<string | null>('summary');

  useEffect(() => {
    if (!token) return;
    reportsApi.getBySession(token, session._id)
      .then(r => {
        setReportText(r.report.reportText);
        setCategories(r.report.assessmentCategories);
        setAreasToWorkOn(r.report.areasToWorkOn);
        setFocusAreas(r.report.focusAreas);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, session._id]);

  const addCategory = () => {
    const name = newCatName.trim();
    if (!name) return;
    setCategories(prev => [...prev, { name, rating: 3 }]);
    setNewCatName('');
  };

  const updateRating = (index: number, rating: number) => {
    setCategories(prev => prev.map((c, i) => i === index ? { ...c, rating } : c));
  };

  const removeCategory = (index: number) => {
    setCategories(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      await reportsApi.save(token, {
        sessionId: session._id,
        reportText,
        assessmentCategories: categories,
        areasToWorkOn,
        focusAreas,
      });
      toast.success('Report saved');
      onSaved();
    } catch (err: any) {
      toast.error(err.message || 'Could not save report');
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (s: string) => setExpandedSection(prev => prev === s ? null : s);

  const sessionLabel = session.title || session.sport;
  const partnerName = session.partner?.name || 'Athlete';

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50">
        <span className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-900 px-6 pt-4 pb-5 flex-shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={onClose} className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-bold text-lg truncate">Session Report</h2>
            <p className="text-emerald-300 text-xs">{sessionLabel} · {partnerName}</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-white text-emerald-800 font-bold text-sm rounded-xl disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0"
          >
            {saving
              ? <span className="w-3.5 h-3.5 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin" />
              : <><Check className="w-3.5 h-3.5" /> Save</>}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {/* Session Summary */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <button
            onClick={() => toggleSection('summary')}
            className="w-full flex items-center justify-between px-4 py-3.5"
          >
            <p className="font-bold text-slate-900">Session Summary</p>
            {expandedSection === 'summary' ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          {expandedSection === 'summary' && (
            <div className="px-4 pb-4">
              <textarea
                value={reportText}
                onChange={e => setReportText(e.target.value)}
                placeholder="Describe how the session went, what you worked on, athlete's performance and attitude..."
                rows={5}
                className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-400 focus:outline-none transition-colors resize-none text-sm leading-relaxed"
              />
            </div>
          )}
        </div>

        {/* Baseline Assessment */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <button
            onClick={() => toggleSection('assessment')}
            className="w-full flex items-center justify-between px-4 py-3.5"
          >
            <p className="font-bold text-slate-900">Baseline Assessment</p>
            {expandedSection === 'assessment' ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          {expandedSection === 'assessment' && (
            <div className="px-4 pb-4 space-y-3">
              {categories.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-2">No categories yet — add one below</p>
              )}
              {categories.map((cat, i) => (
                <div key={i} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-slate-900 text-sm">{cat.name}</p>
                    <button onClick={() => removeCategory(i)} className="p-1 text-slate-400 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <StarRating value={cat.rating} onChange={r => updateRating(i, r)} />
                </div>
              ))}

              {/* Add category */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCategory(); } }}
                  placeholder="e.g. Footwork, Arm Strength, Focus..."
                  className="flex-1 px-3 py-2 rounded-xl border-2 border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:border-emerald-400 focus:outline-none transition-colors"
                />
                <button
                  onClick={addCategory}
                  disabled={!newCatName.trim()}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Areas to Work On */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <button
            onClick={() => toggleSection('areas')}
            className="w-full flex items-center justify-between px-4 py-3.5"
          >
            <p className="font-bold text-slate-900">Areas to Work On</p>
            {expandedSection === 'areas' ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          {expandedSection === 'areas' && (
            <div className="px-4 pb-4">
              <textarea
                value={areasToWorkOn}
                onChange={e => setAreasToWorkOn(e.target.value)}
                placeholder="What specific skills, habits, or techniques should the athlete practice on their own?"
                rows={4}
                className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-400 focus:outline-none transition-colors resize-none text-sm leading-relaxed"
              />
            </div>
          )}
        </div>

        {/* Focus for Next Session */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <button
            onClick={() => toggleSection('focus')}
            className="w-full flex items-center justify-between px-4 py-3.5"
          >
            <p className="font-bold text-slate-900">Focus for Next Session</p>
            {expandedSection === 'focus' ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          {expandedSection === 'focus' && (
            <div className="px-4 pb-4">
              <textarea
                value={focusAreas}
                onChange={e => setFocusAreas(e.target.value)}
                placeholder="What will you focus on in the next session? What drills or goals are planned?"
                rows={4}
                className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-400 focus:outline-none transition-colors resize-none text-sm leading-relaxed"
              />
            </div>
          )}
        </div>

        <div className="pb-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-900/20"
          >
            {saving
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <><Check className="w-4 h-4" /> Save Report</>}
          </button>
        </div>
      </div>
    </div>
  );
}
