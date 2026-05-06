import { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, MessageSquare, CalendarPlus, Phone, Dumbbell, Check, X } from 'lucide-react';
import { messages as messagesApi, coaches as coachesApi, Message, avatarThumb, BookingData } from '../lib/api';
import { useAuth } from '../lib/auth';
import { getActiveSocket } from '../lib/socket';
import { toast } from 'sonner';

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatTime12(t: string) {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${m === 0 ? '00' : m} ${h < 12 ? 'AM' : 'PM'}`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// ─── Booking proposal form ────────────────────────────────────────────────────

const TIMES = ['07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30',
  '11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30',
  '15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30',
  '19:00','19:30','20:00'];
const LESSON_DURATIONS = ['30 min', '45 min', '60 min', '90 min', '2 hours'];
const CALL_DURATIONS = ['15 min', '20 min', '30 min'];

function getNext14Days() {
  const days: { label: string; value: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const value = d.toISOString().split('T')[0];
    const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow'
      : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    days.push({ label, value });
  }
  return days;
}

interface BookingFormProps {
  onSend: (data: Omit<BookingData, 'status'>) => void;
  onCancel: () => void;
  sending: boolean;
}

function BookingForm({ onSend, onCancel, sending }: BookingFormProps) {
  const [sessionType, setSessionType] = useState<'lesson' | 'call'>('lesson');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const dateScrollRef = useRef<HTMLDivElement>(null);
  const days = getNext14Days();

  const durations = sessionType === 'lesson' ? LESSON_DURATIONS : CALL_DURATIONS;

  const handleSend = () => {
    if (!selectedDate || !selectedTime || !duration) {
      toast.error('Please pick a date, time, and duration');
      return;
    }
    onSend({ sessionType, proposedDate: selectedDate, proposedTime: selectedTime, duration, notes });
  };

  return (
    <div className="bg-white border-t border-slate-200 px-4 pt-4 pb-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="font-semibold text-slate-900 text-sm">Suggest a time</p>
        <button onClick={onCancel} className="p-1 hover:bg-slate-100 rounded-full">
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Type toggle */}
      <div className="flex gap-2">
        {(['lesson', 'call'] as const).map(t => (
          <button
            key={t}
            onClick={() => { setSessionType(t); setDuration(''); }}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all border ${
              sessionType === t
                ? 'bg-emerald-600 border-emerald-600 text-white'
                : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}
          >
            {t === 'lesson' ? <Dumbbell className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
            {t === 'lesson' ? 'Lesson' : 'Intro Call'}
          </button>
        ))}
      </div>

      {/* Date row */}
      <div>
        <p className="text-xs text-slate-500 mb-1.5">Date</p>
        <div ref={dateScrollRef} className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {days.map(day => (
            <button
              key={day.value}
              onClick={() => setSelectedDate(day.value)}
              className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                selectedDate === day.value
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>

      {/* Time + Duration */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-xs text-slate-500 mb-1.5">Time</p>
          <select
            value={selectedTime}
            onChange={e => setSelectedTime(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900 text-sm focus:border-emerald-400 focus:outline-none"
          >
            <option value="">Pick time</option>
            {TIMES.map(t => <option key={t} value={t}>{formatTime12(t)}</option>)}
          </select>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1.5">Duration</p>
          <select
            value={duration}
            onChange={e => setDuration(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900 text-sm focus:border-emerald-400 focus:outline-none"
          >
            <option value="">Pick duration</option>
            {durations.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      {/* Note */}
      <input
        type="text"
        placeholder="Add a note (optional)"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-400 focus:outline-none"
      />

      <button
        onClick={handleSend}
        disabled={sending}
        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
      >
        {sending
          ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          : <><Send className="w-4 h-4" /> Send Proposal</>
        }
      </button>
    </div>
  );
}

// ─── Booking card in thread ───────────────────────────────────────────────────

interface BookingCardProps {
  msg: Message;
  isMe: boolean;
  onRespond: (messageId: string, status: 'accepted' | 'declined') => void;
  responding: string | null;
}

function BookingCard({ msg, isMe, onRespond, responding }: BookingCardProps) {
  const bd = msg.bookingData!;
  const isPending = bd.status === 'pending';
  const isResponding = responding === msg._id;

  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[82%] rounded-2xl overflow-hidden border ${
        isMe ? 'rounded-br-md border-emerald-200' : 'rounded-bl-md border-slate-200'
      }`}>
        {/* Card header */}
        <div className={`px-4 py-2.5 flex items-center gap-2 ${
          isMe ? 'bg-emerald-600' : 'bg-slate-100'
        }`}>
          {bd.sessionType === 'lesson'
            ? <Dumbbell className={`w-4 h-4 ${isMe ? 'text-emerald-200' : 'text-emerald-600'}`} />
            : <Phone className={`w-4 h-4 ${isMe ? 'text-emerald-200' : 'text-emerald-600'}`} />
          }
          <p className={`text-sm font-semibold ${isMe ? 'text-white' : 'text-slate-900'}`}>
            {bd.sessionType === 'lesson' ? 'Lesson Proposal' : 'Intro Call Proposal'}
          </p>
        </div>

        {/* Card body */}
        <div className="bg-white px-4 py-3 space-y-1">
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <CalendarPlus className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="font-medium">{formatDate(bd.proposedDate)}</span>
            <span className="text-slate-400">·</span>
            <span>{formatTime12(bd.proposedTime)}</span>
          </div>
          <p className="text-xs text-slate-500">{bd.duration}</p>
          {bd.notes && <p className="text-xs text-slate-600 italic mt-1">{bd.notes}</p>}

          {/* Status / Actions */}
          {isPending && !isMe ? (
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => onRespond(msg._id, 'accepted')}
                disabled={!!responding}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-colors"
              >
                {isResponding ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Check className="w-3 h-3" /> Accept</>}
              </button>
              <button
                onClick={() => onRespond(msg._id, 'declined')}
                disabled={!!responding}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-600 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-colors"
              >
                <X className="w-3 h-3" /> Decline
              </button>
            </div>
          ) : isPending && isMe ? (
            <p className="text-xs text-amber-600 font-medium mt-2">Awaiting response…</p>
          ) : (
            <div className={`mt-2 px-2.5 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1 ${
              bd.status === 'accepted'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-red-50 text-red-600'
            }`}>
              {bd.status === 'accepted' ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
              {bd.status === 'accepted' ? 'Accepted' : 'Declined'}
            </div>
          )}
        </div>

        <p className="bg-white px-4 pb-2 text-[10px] text-slate-400">{timeAgo(msg.createdAt)}</p>
      </div>
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

interface MessagesViewProps {
  initialUserId?: string | null;
  onClose?: () => void;
}

export function MessagesView({ initialUserId, onClose }: MessagesViewProps) {
  const { token, user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(initialUserId || null);
  const [activeUser, setActiveUser] = useState<any | null>(null);
  const [thread, setThread] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [responding, setResponding] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    messagesApi.getConversations(token)
      .then(r => setConversations(r.conversations || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  // If we have an activeId but no activeUser (e.g. navigated from coach profile), fetch the user
  useEffect(() => {
    if (!token || !activeId || activeUser) return;
    // Try to find in existing conversations first
    const existing = conversations.find(c => c.user._id === activeId);
    if (existing) { setActiveUser(existing.user); return; }
    // Otherwise fetch from API
    coachesApi.getById(token, activeId)
      .then(r => setActiveUser(r.user))
      .catch(() => {});
  }, [token, activeId, activeUser, conversations]);

  useEffect(() => {
    if (!token || !activeId) return;
    messagesApi.getThread(token, activeId).then(r => {
      setThread(r.messages || []);
      setTimeout(() => bottomRef.current?.scrollIntoView(), 50);
    }).catch(() => {});
  }, [token, activeId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [thread]);

  useEffect(() => {
    const socket = getActiveSocket();
    if (!socket) return;
    const onMsg = (msg: Message) => {
      if (msg.sender === activeId || msg.recipient === activeId) {
        setThread(prev => [...prev, msg]);
      }
    };
    const onBookingUpdate = ({ messageId, status }: { messageId: string; status: string }) => {
      setThread(prev => prev.map(m =>
        m._id === messageId && m.bookingData
          ? { ...m, bookingData: { ...m.bookingData, status: status as any } }
          : m
      ));
    };
    socket.on('message:new', onMsg);
    socket.on('booking:updated', onBookingUpdate);
    return () => { socket.off('message:new', onMsg); socket.off('booking:updated', onBookingUpdate); };
  }, [activeId]);

  const handleSend = async () => {
    if (!token || !activeId || !draft.trim()) return;
    setSending(true);
    try {
      const { message } = await messagesApi.send(token, activeId, draft.trim());
      setThread(prev => [...prev, message]);
      setDraft('');
    } catch { /* silent */ } finally { setSending(false); }
  };

  const handleSendBooking = async (data: Omit<BookingData, 'status'>) => {
    if (!token || !activeId) return;
    setSending(true);
    try {
      const { message } = await messagesApi.sendBooking(token, activeId, data);
      setThread(prev => [...prev, message]);
      setShowBookingForm(false);
      toast.success('Proposal sent!');
    } catch (err: any) {
      toast.error(err.message || 'Could not send proposal');
    } finally { setSending(false); }
  };

  const handleRespond = async (messageId: string, status: 'accepted' | 'declined') => {
    if (!token) return;
    setResponding(messageId);
    try {
      const { message: updated } = await messagesApi.respondToBooking(token, messageId, status);
      setThread(prev => prev.map(m => m._id === messageId ? { ...m, bookingData: updated.bookingData } : m));
      toast.success(status === 'accepted' ? 'Session accepted!' : 'Proposal declined');
    } catch (err: any) {
      toast.error(err.message || 'Could not respond');
    } finally { setResponding(null); }
  };

  if (activeId && !activeUser) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <span className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (activeId && activeUser) {
    return (
      <div className="h-full flex flex-col bg-white">
        {/* Thread header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-100 flex-shrink-0">
          <button onClick={() => { setActiveId(null); setActiveUser(null); setShowBookingForm(false); }} className="p-1.5 hover:bg-slate-100 rounded-full">
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
          <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-full flex items-center justify-center text-white text-sm font-bold overflow-hidden">
            {activeUser.avatar
              ? <img src={avatarThumb(activeUser.avatar, 80)!} alt={activeUser.name} className="w-full h-full object-cover" />
              : getInitials(activeUser.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 text-sm">{activeUser.name}</p>
            <p className="text-xs text-slate-400 capitalize">{activeUser.role || 'Coach'}</p>
          </div>
          <button
            onClick={() => setShowBookingForm(v => !v)}
            className={`p-2 rounded-xl transition-colors ${showBookingForm ? 'bg-emerald-100 text-emerald-700' : 'hover:bg-slate-100 text-slate-500'}`}
            title="Schedule a session"
          >
            <CalendarPlus className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {thread.length === 0 && (
            <p className="text-center text-slate-400 text-sm py-8">Start the conversation!</p>
          )}
          {thread.map(msg => {
            const isMe = msg.sender === user?._id;
            if (msg.type === 'booking_request') {
              return (
                <BookingCard
                  key={msg._id}
                  msg={msg}
                  isMe={isMe}
                  onRespond={handleRespond}
                  responding={responding}
                />
              );
            }
            return (
              <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  isMe ? 'bg-emerald-600 text-white rounded-br-md' : 'bg-slate-100 text-slate-900 rounded-bl-md'
                }`}>
                  {msg.text}
                  <p className={`text-[10px] mt-0.5 ${isMe ? 'text-emerald-200' : 'text-slate-400'}`}>
                    {timeAgo(msg.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Booking form (slide up) */}
        {showBookingForm && (
          <BookingForm onSend={handleSendBooking} onCancel={() => setShowBookingForm(false)} sending={sending} />
        )}

        {/* Text input */}
        {!showBookingForm && (
          <div className="flex items-center gap-2 px-4 py-3 border-t border-slate-100 bg-white flex-shrink-0">
            <input
              type="text"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2.5 bg-slate-100 rounded-full text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all"
            />
            <button
              onClick={handleSend}
              disabled={!draft.trim() || sending}
              className="w-10 h-10 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-full flex items-center justify-center transition-colors flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-900 px-6 pt-4 pb-6">
        <h2 className="text-white font-bold text-xl">Messages</h2>
        <p className="text-emerald-300 text-sm mt-1">Chat with coaches and trainers</p>
      </div>

      <div className="px-6 py-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 animate-pulse border border-slate-200 flex gap-3">
                <div className="w-12 h-12 bg-slate-200 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 bg-slate-200 rounded w-1/3" />
                  <div className="h-3 bg-slate-100 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
            <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">No messages yet</p>
            <p className="text-slate-400 text-sm mt-1">Find a coach and send them a message</p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map(convo => (
              <button
                key={convo.user._id}
                onClick={() => { setActiveId(convo.user._id); setActiveUser(convo.user); }}
                className="w-full bg-white rounded-2xl p-4 border border-slate-200 hover:border-emerald-300 text-left flex items-center gap-3 transition-all active:scale-[0.99]"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden">
                  {convo.user.avatar
                    ? <img src={avatarThumb(convo.user.avatar, 80)!} alt={convo.user.name} className="w-full h-full object-cover" />
                    : getInitials(convo.user.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900 truncate">{convo.user.name}</p>
                    {convo.lastMessage && (
                      <p className="text-xs text-slate-400 flex-shrink-0">{timeAgo(convo.lastMessage.createdAt)}</p>
                    )}
                  </div>
                  {convo.lastMessage && (
                    <p className="text-sm text-slate-500 truncate mt-0.5">
                      {convo.lastMessage.type === 'booking_request'
                        ? `📅 ${convo.lastMessage.bookingData?.sessionType === 'lesson' ? 'Lesson' : 'Call'} proposal`
                        : convo.lastMessage.text}
                    </p>
                  )}
                </div>
                {convo.unread > 0 && (
                  <span className="w-5 h-5 bg-emerald-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0">
                    {convo.unread}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
