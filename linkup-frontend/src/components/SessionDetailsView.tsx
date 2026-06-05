import {
  ChevronLeft, Calendar, MapPin, Clock, Users, Trophy, MessageCircle,
  Star, Navigation, CheckCircle, AlertCircle, XCircle, Flag, RefreshCw, UserCheck,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { sessions as sessionsApi, Session } from '../lib/api';
import { toast } from 'sonner';

interface SessionDetailsViewProps {
  session: Session;
  onBack: () => void;
  onNavigate?: (view: string, data?: any) => void;
  onOpenChat?: (athlete: {
    id: string;
    name: string;
    avatar: string;
    sport: string;
    position: string;
    level: string;
    sessionContext?: { sessionTitle: string; date: string; time: string; location: string };
  }) => void;
}

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function isSessionPast(session: { date?: string; time?: string; status: string }): boolean {
  if (!session.date || session.date === 'Flexible') return false;
  if (session.status === 'completed' || session.status === 'cancelled') return false;
  const dateTime = session.time && session.time !== 'Flexible'
    ? new Date(`${session.date} ${session.time}`)
    : (() => { const d = new Date(session.date!); d.setHours(23, 59, 59, 999); return d; })();
  return !isNaN(dateTime.getTime()) && dateTime < new Date();
}

export function SessionDetailsView({ session, onBack, onNavigate, onOpenChat }: SessionDetailsViewProps) {
  const { token, user } = useAuth();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [localSession, setLocalSession] = useState(session);

  // Determine the "other person" in this session
  const isPostedByMe = user?._id === (localSession.postedBy?._id ?? localSession.postedBy);
  const partner = isPostedByMe ? localSession.partner : localSession.postedBy;

  const handleApproveChange = async () => {
    if (!token) return;
    setActionLoading('approve');
    try {
      const { session: updated } = await sessionsApi.approveChange(token, localSession._id);
      setLocalSession(updated);
      toast.success('Changes approved');
    } catch (err: any) {
      toast.error(err?.message || 'Could not approve changes');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeclineChange = async () => {
    if (!token) return;
    setActionLoading('decline');
    try {
      const { session: updated } = await sessionsApi.declineChange(token, localSession._id);
      setLocalSession(updated);
      toast.success('Change request declined');
    } catch (err: any) {
      toast.error(err?.message || 'Could not decline change');
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprovePartner = async (partnerId: string) => {
    if (!token) return;
    setActionLoading('approvePartner');
    try {
      const { session: updated } = await sessionsApi.approvePartner(token, localSession._id, partnerId);
      setLocalSession(updated);
      toast.success('Partner approved — session confirmed!');
    } catch (err: any) {
      toast.error(err?.message || 'Could not approve partner');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeclinePartner = async (partnerId: string) => {
    if (!token) return;
    setActionLoading('declinePartner');
    try {
      const { session: updated } = await sessionsApi.declinePartner(token, localSession._id, partnerId);
      setLocalSession(updated);
      toast.success('Request declined');
    } catch (err: any) {
      toast.error(err?.message || 'Could not decline request');
    } finally {
      setActionLoading(null);
    }
  };

  const partnerInitials = partner ? getInitials(partner.name) : '??';

  const [showCalendarMenu, setShowCalendarMenu] = useState(false);

  const buildEventDates = () => {
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    let startDate: Date;
    if (session.date && session.date !== 'Flexible') {
      startDate = new Date(session.date);
      if (session.time) {
        const match = session.time.match(/(\d+):(\d+)\s*(AM|PM)?/i);
        if (match) {
          let h = parseInt(match[1]);
          const m = parseInt(match[2]);
          const ampm = match[3]?.toUpperCase();
          if (ampm === 'PM' && h !== 12) h += 12;
          if (ampm === 'AM' && h === 12) h = 0;
          startDate.setHours(h, m, 0, 0);
        } else {
          startDate.setHours(14, 0, 0, 0);
        }
      } else {
        startDate.setHours(14, 0, 0, 0);
      }
    } else {
      startDate = new Date();
      startDate.setDate(startDate.getDate() + 1);
      startDate.setHours(14, 0, 0, 0);
    }
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
    return { startDate, endDate, fmt };
  };

  const handleAddToGoogleCalendar = () => {
    const eventTitle = `${session.sport} Practice${partner ? ` with ${partner.name}` : ''}`;
    const eventDescription = session.notes || session.goals || '';
    const { startDate, endDate, fmt } = buildEventDates();
    window.open(
      `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${fmt(startDate)}/${fmt(endDate)}&details=${encodeURIComponent(eventDescription)}&location=${encodeURIComponent(session.location)}`,
      '_blank'
    );
    setShowCalendarMenu(false);
  };

  const handleAddToAppleCalendar = () => {
    const eventTitle = `${session.sport} Practice${partner ? ` with ${partner.name}` : ''}`;
    const eventDescription = session.notes || session.goals || '';
    const { startDate, endDate, fmt } = buildEventDates();
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//LinkUp Athletics//EN',
      'BEGIN:VEVENT',
      `DTSTART:${fmt(startDate)}`,
      `DTEND:${fmt(endDate)}`,
      `SUMMARY:${eventTitle.replace(/,/g, '\\,')}`,
      `DESCRIPTION:${eventDescription.replace(/\n/g, '\\n').replace(/,/g, '\\,')}`,
      `LOCATION:${session.location.replace(/,/g, '\\,')}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'session.ics';
    a.click();
    URL.revokeObjectURL(url);
    setShowCalendarMenu(false);
  };

  const handleAccept = async () => {
    if (!token) return;
    setActionLoading('accept');
    try {
      await sessionsApi.accept(token, session._id);
      setLocalSession((s) => ({ ...s, status: 'confirmed' }));
      toast.success('Session confirmed!');
    } catch (err: any) {
      toast.error(err?.message || 'Could not confirm session');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async () => {
    if (!token) return;
    setActionLoading('cancel');
    try {
      await sessionsApi.cancel(token, session._id);
      setLocalSession((s) => ({ ...s, status: 'cancelled' }));
      toast.success('Session cancelled');
      onBack();
    } catch (err: any) {
      toast.error(err?.message || 'Could not cancel session');
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async () => {
    if (!token) return;
    setActionLoading('complete');
    try {
      await sessionsApi.complete(token, session._id);
      setLocalSession((s) => ({ ...s, status: 'completed' }));
      toast.success('Session marked complete!');
      // Navigate to rating view if there's a partner to rate
      if (partner && onNavigate) {
        onNavigate('rating', {
          _id: typeof partner === 'object' ? partner._id : partner,
          name: typeof partner === 'object' ? partner.name : '',
          avatar: (typeof partner === 'object' && partner.avatar) ? partner.avatar : partnerInitials,
          sport: session.sport,
          position: typeof partner === 'object' ? partner.position : '',
          type: typeof partner === 'object' ? partner.role : 'athlete',
          date: session.date,
          location: session.location,
          duration: session.duration,
          sessionId: session._id,
        });
      } else {
        onBack();
      }
    } catch (err: any) {
      toast.error(err?.message || 'Could not complete session');
    } finally {
      setActionLoading(null);
    }
  };

  const effectiveStatus = localSession.status === 'open' &&
    localSession.pendingPartners && localSession.pendingPartners.length > 0
      ? 'pending'
      : localSession.status;
  const statusConfig = {
    open: { label: 'Open – Awaiting Partner', Icon: AlertCircle, color: 'text-amber-200', bg: 'bg-amber-500/20 border-amber-400/30' },
    pending: { label: 'Inquiry Pending', Icon: AlertCircle, color: 'text-orange-200', bg: 'bg-orange-500/20 border-orange-400/30' },
    confirmed: { label: 'Confirmed Session', Icon: CheckCircle, color: 'text-green-200', bg: 'bg-green-500/20 border-green-400/30' },
    completed: { label: 'Completed', Icon: Trophy, color: 'text-emerald-200', bg: 'bg-emerald-400/20 border-emerald-400/30' },
    cancelled: { label: 'Cancelled', Icon: XCircle, color: 'text-red-200', bg: 'bg-red-500/20 border-red-400/30' },
  };
  const { label: statusLabel, Icon: StatusIcon, color: statusColor, bg: statusBg } =
    statusConfig[effectiveStatus as keyof typeof statusConfig] ?? statusConfig.open;

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 px-6 pt-4 pb-6">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={onBack}
            className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors backdrop-blur-sm"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-white">Session Details</h2>
              {(localSession as any).teamType === 'mens' && (
                <span className="px-2 py-0.5 bg-emerald-400/60 border border-emerald-300/40 text-white text-[10px] font-bold rounded-full">Men's</span>
              )}
              {(localSession as any).teamType === 'womens' && (
                <span className="px-2 py-0.5 bg-pink-500/60 border border-pink-300/40 text-white text-[10px] font-bold rounded-full">Women's</span>
              )}
            </div>
            <p className="text-emerald-200 text-sm">{localSession.title || `${localSession.sport} Practice`}</p>
            {!isPostedByMe && localSession.postedBy && typeof localSession.postedBy === 'object' && (
              <button
                onClick={() => onNavigate && onNavigate('userProfile', { _id: (localSession.postedBy as any)._id, ...(localSession.postedBy as any) })}
                className="text-emerald-300 text-xs mt-0.5 hover:text-white transition-colors hover:underline"
              >
                Posted by {(localSession.postedBy as any).name}
              </button>
            )}
          </div>
        </div>
        <div className="flex justify-center">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${statusBg}`}>
            <StatusIcon className={`w-4 h-4 ${statusColor}`} />
            <span className={`text-sm font-medium ${statusColor}`}>{statusLabel}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        {/* Partner Card (only if there's a partner) */}
        {partner && typeof partner === 'object' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-4">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-semibold text-xl flex-shrink-0">
                {partner.avatar
                  ? <img src={partner.avatar} alt={partner.name} className="w-full h-full rounded-full object-cover" />
                  : partnerInitials}
              </div>
              <div className="flex-1">
                <h3 className="text-slate-900 font-medium mb-1">{partner.name}</h3>
                <p className="text-sm text-slate-600 mb-2">{partner.position}</p>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="text-sm text-slate-700 font-medium">
                      {partner.averageRating ? partner.averageRating.toFixed(1) : 'N/A'}
                    </span>
                  </div>
                  {partner.ratingCount != null && (
                    <>
                      <span className="text-sm text-slate-400">•</span>
                      <span className="text-sm text-slate-600">{partner.ratingCount} ratings</span>
                    </>
                  )}
                </div>
              </div>
              {partner.skillLevel && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <Trophy className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-xs text-emerald-700 font-medium">{partner.skillLevel}</span>
                </div>
              )}
            </div>

            {/* Contact Actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  if (onOpenChat) {
                    onOpenChat({
                      id: partner._id,
                      name: partner.name,
                      avatar: partner.avatar || partnerInitials,
                      sport: localSession.sport,
                      position: partner.position,
                      level: partner.skillLevel,
                      sessionContext: {
                        sessionId: localSession._id,
                        sessionTitle: localSession.title || `${localSession.sport} Practice`,
                        date: localSession.date,
                        time: localSession.time,
                        location: localSession.location,
                      },
                    });
                  }
                }}
                className="flex flex-col items-center gap-1.5 py-3 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors"
              >
                <MessageCircle className="w-5 h-5 text-emerald-600" />
                <span className="text-xs text-emerald-700 font-medium">Message</span>
              </button>
              <button
                onClick={() => onNavigate && onNavigate('userProfile', { _id: partner._id, ...partner })}
                className="flex flex-col items-center gap-1.5 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <Users className="w-5 h-5 text-slate-600" />
                <span className="text-xs text-slate-700 font-medium">View Profile</span>
              </button>
            </div>
          </div>
        )}

        {/* Pending Partners — shown to the poster when someone(s) request to join */}
        {isPostedByMe && localSession.pendingPartners && localSession.pendingPartners.length > 0 && (
          <div className="space-y-3 mb-4">
            {localSession.pendingPartners.length > 1 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-2 text-sm text-orange-700 font-medium text-center">
                {localSession.pendingPartners.length} people want to join this session
              </div>
            )}
            {localSession.pendingPartners.map((pendingUser) =>
              typeof pendingUser === 'object' ? (
                <div key={pendingUser._id} className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <UserCheck className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 mb-0.5">Join Request — Pending Your Approval</p>
                      <button
                        onClick={() => onNavigate && onNavigate('userProfile', { _id: pendingUser._id, ...pendingUser })}
                        className="text-sm text-emerald-600 font-medium hover:underline mb-3 text-left"
                      >
                        {pendingUser.name} — View Profile →
                      </button>
                      <div className="flex gap-2">
                        <button
                          disabled={!!actionLoading}
                          onClick={() => handleApprovePartner(pendingUser._id)}
                          className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-60"
                        >
                          {actionLoading === 'approvePartner' ? 'Approving…' : 'Approve'}
                        </button>
                        <button
                          disabled={!!actionLoading}
                          onClick={() => handleDeclinePartner(pendingUser._id)}
                          className="flex-1 py-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-medium transition-colors disabled:opacity-60"
                        >
                          {actionLoading === 'declinePartner' ? 'Declining…' : 'Decline'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null
            )}
          </div>
        )}

        {/* Declined Status — shown to a requester who was declined */}
        {!isPostedByMe && (localSession as any).declinedPartners?.some(
          (id: any) => (typeof id === 'object' ? id._id : id)?.toString() === user?._id?.toString()
        ) && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <XCircle className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 mb-0.5">Request Declined</p>
                <p className="text-sm text-red-700">Your request to join this session was declined.</p>
              </div>
            </div>
          </div>
        )}

        {/* Pending Partner Status — shown to the requester while awaiting approval */}
        {!isPostedByMe && localSession.status === 'open' &&
          localSession.pendingPartners?.some(p => typeof p === 'object' && p._id === user?._id) && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 mb-0.5">Pending Approval</p>
                <p className="text-sm text-amber-700">Your request is awaiting approval from the session poster.</p>
              </div>
            </div>
          </div>
        )}

        {/* Pending Change Banner */}
        {localSession.pendingChange && (
          <div className={`rounded-2xl border p-4 mb-4 ${
            !isPostedByMe
              ? 'bg-amber-50 border-amber-200'
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <RefreshCw className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 mb-1">
                  {isPostedByMe ? 'Awaiting partner approval' : 'Proposed changes to this session'}
                </p>
                <div className="space-y-1 mb-3">
                  {localSession.pendingChange.changedFields.includes('date') && (
                    <p className="text-xs text-slate-600">
                      <span className="font-medium">Date:</span>{' '}
                      <span className="line-through text-slate-400">{localSession.date}</span>{' '}
                      → <span className="text-amber-700 font-medium">{localSession.pendingChange.date}</span>
                    </p>
                  )}
                  {localSession.pendingChange.changedFields.includes('time') && (
                    <p className="text-xs text-slate-600">
                      <span className="font-medium">Time:</span>{' '}
                      <span className="line-through text-slate-400">{localSession.time || '—'}</span>{' '}
                      → <span className="text-amber-700 font-medium">{localSession.pendingChange.time}</span>
                    </p>
                  )}
                  {localSession.pendingChange.changedFields.includes('location') && (
                    <p className="text-xs text-slate-600">
                      <span className="font-medium">Location:</span>{' '}
                      <span className="line-through text-slate-400">{localSession.location || '—'}</span>{' '}
                      → <span className="text-amber-700 font-medium">{localSession.pendingChange.location}</span>
                    </p>
                  )}
                  {localSession.pendingChange.changedFields.includes('duration') && (
                    <p className="text-xs text-slate-600">
                      <span className="font-medium">Duration:</span>{' '}
                      <span className="line-through text-slate-400">{localSession.duration || '—'}</span>{' '}
                      → <span className="text-amber-700 font-medium">{localSession.pendingChange.duration}</span>
                    </p>
                  )}
                </div>
                {!isPostedByMe && (
                  <div className="flex gap-2">
                    <button
                      disabled={!!actionLoading}
                      onClick={handleApproveChange}
                      className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-60"
                    >
                      {actionLoading === 'approve' ? 'Approving…' : 'Approve Changes'}
                    </button>
                    <button
                      disabled={!!actionLoading}
                      onClick={handleDeclineChange}
                      className="flex-1 py-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-medium transition-colors disabled:opacity-60"
                    >
                      {actionLoading === 'decline' ? 'Declining…' : 'Decline'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

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
                <p className="text-slate-900 font-medium">{localSession.date}{localSession.time ? ` at ${localSession.time}` : ''}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-500 mb-0.5">Location</p>
                <p className="text-slate-900 font-medium mb-2">{localSession.location}</p>
                <a
                  href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(localSession.location)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700"
                >
                  <Navigation className="w-4 h-4" />
                  Get Directions
                </a>
              </div>
            </div>

            {localSession.duration && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-0.5">Duration</p>
                  <p className="text-slate-900 font-medium">{localSession.duration}</p>
                </div>
              </div>
            )}

            {localSession.skillLevelRequired && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Flag className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-0.5">Skill Level Required</p>
                  <p className="text-slate-900 font-medium">{localSession.skillLevelRequired}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Session Notes */}
        {(localSession.notes || localSession.goals) && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-4">
            <h3 className="text-slate-900 font-medium mb-3">Session Notes</h3>
            <p className="text-sm text-slate-700 leading-relaxed">{localSession.notes || localSession.goals}</p>
          </div>
        )}

        {/* Equipment */}
        {localSession.equipment && localSession.equipment.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-4">
            <h3 className="text-slate-900 font-medium mb-3">What to Bring</h3>
            <div className="space-y-2">
              {localSession.equipment.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <span className="text-sm text-slate-700">{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {localSession.status !== 'cancelled' && localSession.status !== 'completed' && (
          <div className="space-y-3">
            {/* Past-session banner — shown when the scheduled time has already passed */}
            {isSessionPast(localSession) ? (
              <>
                <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 text-center mb-1">
                  <p className="text-sm text-slate-600 font-medium">This session's time has passed.</p>
                  <p className="text-xs text-slate-400 mt-0.5">Did it happen? Mark it complete, or reschedule / cancel.</p>
                </div>
                <button
                  disabled={!!actionLoading}
                  onClick={handleComplete}
                  className="w-full py-3.5 bg-gradient-to-br from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl font-medium transition-all shadow-sm disabled:opacity-60"
                >
                  {actionLoading === 'complete' ? 'Completing…' : 'Session Completed'}
                </button>
                {isPostedByMe && (
                  <button
                    onClick={() => onNavigate && onNavigate('editSession', localSession)}
                    className="w-full py-3.5 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Reschedule
                  </button>
                )}
                <button
                  disabled={!!actionLoading}
                  onClick={handleCancel}
                  className="w-full py-3.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-xl font-medium transition-all disabled:opacity-60"
                >
                  {actionLoading === 'cancel' ? 'Cancelling…' : 'Cancel Session'}
                </button>
              </>
            ) : (
              <>
                {localSession.status === 'open' && !isPostedByMe && (
                  <button
                    disabled={!!actionLoading}
                    onClick={handleAccept}
                    className="w-full py-3.5 bg-gradient-to-br from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl font-medium transition-all shadow-sm disabled:opacity-60"
                  >
                    {actionLoading === 'accept' ? 'Confirming…' : 'Confirm Session'}
                  </button>
                )}

                {localSession.status === 'confirmed' && (
                  <button
                    disabled={!!actionLoading}
                    onClick={handleComplete}
                    className="w-full py-3.5 bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl font-medium transition-all shadow-sm disabled:opacity-60"
                  >
                    {actionLoading === 'complete' ? 'Completing…' : 'Mark as Complete & Rate'}
                  </button>
                )}

                <div className="relative">
                  <button
                    onClick={() => setShowCalendarMenu((v) => !v)}
                    className="w-full py-3.5 bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl font-medium transition-all shadow-sm"
                  >
                    Add to Calendar
                  </button>
                  {showCalendarMenu && (
                    <div className="absolute bottom-full mb-2 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-10">
                      <button
                        onClick={handleAddToGoogleCalendar}
                        className="w-full px-4 py-3 text-left text-sm font-medium text-slate-900 hover:bg-slate-50 flex items-center gap-3 border-b border-slate-100"
                      >
                        <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
                        Google Calendar
                      </button>
                      <button
                        onClick={handleAddToAppleCalendar}
                        className="w-full px-4 py-3 text-left text-sm font-medium text-slate-900 hover:bg-slate-50 flex items-center gap-3"
                      >
                        <span className="text-base">🍎</span>
                        Apple Calendar
                      </button>
                    </div>
                  )}
                </div>

                {isPostedByMe && (
                  <button
                    onClick={() => onNavigate && onNavigate('editSession', localSession)}
                    className="w-full py-3.5 bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 rounded-xl font-medium transition-all"
                  >
                    Edit Session
                  </button>
                )}

                <button
                  disabled={!!actionLoading}
                  onClick={handleCancel}
                  className="w-full py-3.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-xl font-medium transition-all disabled:opacity-60"
                >
                  {actionLoading === 'cancel' ? 'Cancelling…' : 'Cancel Session'}
                </button>
              </>
            )}
          </div>
        )}

        <div className="h-10" />
      </div>
    </div>
  );
}
