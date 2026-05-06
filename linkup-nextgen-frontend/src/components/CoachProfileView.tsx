import { useState, useEffect } from 'react';
import { ArrowLeft, Star, MapPin, MessageSquare, Award, Clock, Users, CheckCircle, ClipboardList, FileText, Briefcase, Zap } from 'lucide-react';
import { coaches as coachesApi, Coach, avatarThumb, reports as reportsApi, SessionReport } from '../lib/api';
import { useAuth } from '../lib/auth';

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

interface CoachProfileViewProps {
  coachId: string;
  onBack: () => void;
  onMessage: (userId: string) => void;
}

export function CoachProfileView({ coachId, onBack, onMessage }: CoachProfileViewProps) {
  const { token } = useAuth();
  const [coach, setCoach] = useState<Coach | null>(null);
  const [loading, setLoading] = useState(true);
  const [coachReports, setCoachReports] = useState<SessionReport[]>([]);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      coachesApi.getById(token, coachId),
      reportsApi.getByCoach(token, coachId).catch(() => ({ reports: [] })),
    ]).then(([coachRes, reportsRes]) => {
      setCoach(coachRes.user as Coach);
      setCoachReports(reportsRes.reports || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [token, coachId]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50">
        <span className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!coach) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-50 gap-3">
        <p className="text-slate-500">Coach not found</p>
        <button onClick={onBack} className="text-emerald-700 font-medium">Go back</button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-900 px-6 pt-4 pb-8">
        <button
          onClick={onBack}
          className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors mb-4"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>

        <div className="flex items-start gap-4">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl overflow-hidden flex-shrink-0">
            {coach.avatar
              ? <img src={avatarThumb(coach.avatar, 160)!} alt={coach.name} className="w-full h-full object-cover" />
              : getInitials(coach.name)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-bold text-xl">{coach.name}</h2>
            {coach.location && (
              <p className="text-emerald-300 text-sm flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5" />{coach.location}
              </p>
            )}
            <div className="flex items-center gap-3 mt-2">
              {coach.averageRating > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span className="text-white font-semibold">{coach.averageRating.toFixed(1)}</span>
                  <span className="text-emerald-300 text-sm">({coach.ratingCount} reviews)</span>
                </span>
              )}
              {coach.hourlyRate != null && (
                <span className="bg-white/15 text-white text-sm font-semibold px-2.5 py-1 rounded-full">
                  ${coach.hourlyRate}/hr
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 -mt-4 pb-8 space-y-4">
        {/* CTA */}
        <button
          onClick={() => onMessage(coach._id)}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 transition-all active:scale-[0.98]"
        >
          <MessageSquare className="w-5 h-5" />
          Message {coach.name.split(' ')[0]}
        </button>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-3">
          {coach.yearsExperience && (
            <div className="bg-white rounded-2xl p-3 border border-slate-200 text-center">
              <Clock className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
              <p className="font-bold text-slate-900 text-sm">{coach.yearsExperience}</p>
              <p className="text-xs text-slate-500">Years Experience</p>
            </div>
          )}
          {coach.ageGroupsCoached.length > 0 && (
            <div className="bg-white rounded-2xl p-3 border border-slate-200 text-center">
              <Users className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
              <p className="font-bold text-slate-900 text-sm">{coach.ageGroupsCoached.length} Age Groups</p>
              <p className="text-xs text-slate-500">Coached</p>
            </div>
          )}
        </div>

        {/* Sports coached */}
        {coach.sportsCoached.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-slate-200">
            <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600" /> Sports
            </h3>
            <div className="flex flex-wrap gap-2">
              {coach.sportsCoached.map(s => (
                <span key={s} className="bg-emerald-100 text-emerald-800 text-sm font-medium px-3 py-1 rounded-full border border-emerald-200">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Age groups */}
        {coach.ageGroupsCoached.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-slate-200">
            <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" /> Age Groups
            </h3>
            <div className="flex flex-wrap gap-2">
              {coach.ageGroupsCoached.map(ag => (
                <span key={ag} className="bg-blue-50 text-blue-700 text-sm font-medium px-3 py-1 rounded-full border border-blue-200">
                  {ag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Bio */}
        {coach.bio && (
          <div className="bg-white rounded-2xl p-4 border border-slate-200">
            <h3 className="font-bold text-slate-900 mb-2">About</h3>
            <p className="text-slate-700 text-sm leading-relaxed">{coach.bio}</p>
          </div>
        )}

        {/* Training types */}
        {coach.trainingTypes && coach.trainingTypes.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-slate-200">
            <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-600" /> Training Specialties
            </h3>
            <div className="flex flex-wrap gap-2">
              {coach.trainingTypes.map(t => (
                <span key={t} className="bg-violet-50 text-violet-700 text-sm font-medium px-3 py-1 rounded-full border border-violet-200">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Services */}
        {coach.services && coach.services.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-slate-200">
            <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-emerald-600" /> Services Offered
            </h3>
            <div className="space-y-3">
              {coach.services.map((svc, i) => (
                <div key={i} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="font-semibold text-slate-900 text-sm">{svc.name}</p>
                  {svc.description && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{svc.description}</p>}
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {svc.price && (
                      <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                        {svc.price}
                      </span>
                    )}
                    {svc.duration && (
                      <span className="bg-slate-100 text-slate-600 text-xs font-medium px-2 py-0.5 rounded-full border border-slate-200">
                        {svc.duration}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Certifications */}
        {coach.certifications && (
          <div className="bg-white rounded-2xl p-4 border border-slate-200">
            <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" /> Certifications
            </h3>
            <p className="text-slate-700 text-sm leading-relaxed">{coach.certifications}</p>
          </div>
        )}

        {/* Coaching Philosophy */}
        {coach.coachingPhilosophy && (
          <div className="bg-white rounded-2xl p-4 border border-slate-200">
            <h3 className="font-bold text-slate-900 mb-2">Coaching Philosophy</h3>
            <p className="text-slate-700 text-sm leading-relaxed italic">{coach.coachingPhilosophy}</p>
          </div>
        )}

        {/* Session Reports */}
        {coachReports.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-slate-200">
            <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-emerald-600" /> Session Reports
            </h3>
            <div className="space-y-3">
              {coachReports.slice(0, 3).map(report => (
                <div key={report._id} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="font-semibold text-slate-900 text-sm">
                      {(report.session as any)?.title || (report.session as any)?.sport || 'Session'}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(report.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  {report.assessmentCategories.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {report.assessmentCategories.map((cat, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <span className="text-xs text-slate-600 font-medium">{cat.name}:</span>
                          <div className="flex">
                            {[1,2,3,4,5].map(n => (
                              <Star key={n} className={`w-3 h-3 ${n <= cat.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {report.reportText && (
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{report.reportText}</p>
                  )}
                  {report.areasToWorkOn && (
                    <p className="text-xs text-slate-500 mt-1.5 italic line-clamp-1">
                      Focus: {report.areasToWorkOn}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Documents & Media */}
        {coach.documents && coach.documents.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-slate-200">
            <h3 className="font-bold text-slate-900 mb-3">Documents & Media</h3>
            <div className="space-y-2">
              {coach.documents.map(doc => (
                <a
                  key={doc._id}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  {doc.type === 'pdf'
                    ? <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-red-500" />
                      </div>
                    : <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100">
                        <img src={doc.url} alt={doc.name} className="w-full h-full object-cover" />
                      </div>}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{doc.name || 'Document'}</p>
                    <p className="text-xs text-emerald-600">{doc.type === 'pdf' ? 'View PDF ↗' : 'View Image ↗'}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
