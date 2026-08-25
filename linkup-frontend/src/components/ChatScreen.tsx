import {
  ArrowLeft, Send, MapPin, CheckCircle, Edit3,
  MessageCircle, UserCheck, X, ChevronRight, Heart, Dumbbell, ChevronDown, Clock, Calendar, MoreVertical, Ban,
} from 'lucide-react';
import { avatarThumb } from '../lib/api';
import { WORKOUT_TYPES, type WorkoutType } from '../lib/sports';
import { useState, useRef, useEffect } from 'react';
import { useMessages } from '../hooks/useMessages';
import { messages as messagesApi, sessions as sessionsApi, users as usersApi } from '../lib/api';
import { useAuth } from '../lib/auth';
import { toast } from 'sonner';
import { hapticLight } from '../lib/haptics';

interface RequestInfo {
  status: 'pending' | 'accepted' | 'declined';
  isRequester: boolean;
  requestId: string;
}

interface Chat {
  id: string;
  name: string;
  avatar: string;
  role?: string;
  sessionDetails?: {
    sessionId?: string;
    date: string;
    time: string;
    location: string;
  };
  requestInfo?: RequestInfo | null;
}

interface ChatScreenProps {
  chat: Chat;
  currentUserId: string;
  token: string;
  onBack: () => void;
  onTabChange?: (tab: string) => void;
  onRequestAccepted?: () => void;
  onRequestDeclined?: () => void;
  onViewProfile?: (userId: string) => void;
  onViewSession?: (sessionId: string) => void;
}

export function ChatScreen({ chat, currentUserId, token, onBack, onTabChange, onRequestAccepted, onRequestDeclined, onViewProfile, onViewSession }: ChatScreenProps) {
  const { user } = useAuth();
  const [inputText, setInputText] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSessionConfirmed, setIsSessionConfirmed] = useState(false);
  const [showProposeChanges, setShowProposeChanges] = useState(false);
  const [proposedDate, setProposedDate] = useState('');
  const [proposedTime, setProposedTime] = useState('');
  const [proposedLocation, setProposedLocation] = useState('');

  // Workout request modal
  const [showWorkoutRequest, setShowWorkoutRequest] = useState(false);
  const [workoutStep, setWorkoutStep] = useState<1 | 2>(1);
  const [workoutType, setWorkoutType] = useState<WorkoutType>('Sport Practice / Drills');
  const [workoutMessage, setWorkoutMessage] = useState('');
  const [workoutDate, setWorkoutDate] = useState('');
  const [workoutTime, setWorkoutTime] = useState('Flexible');
  const [workoutLocation, setWorkoutLocation] = useState('');
  const [workoutDuration, setWorkoutDuration] = useState('1 hr');
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [workoutSubmitting, setWorkoutSubmitting] = useState(false);
  const workoutSubmittingRef = useRef<boolean>(false);

  const [showOptions, setShowOptions] = useState(false);
  const [blocking, setBlocking] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    messages,
    loading,
    isPartnerTyping,
    sendMessage,
    toggleLike,
    sendTypingStart,
    sendTypingStop,
  } = useMessages({
    currentUserId,
    partnerId: chat.id,
    token,
  });

  const isIncomingRequest =
    chat.requestInfo?.status === 'pending' && !chat.requestInfo.isRequester;

  const handleAcceptRequest = async () => {
    try {
      await messagesApi.acceptRequest(token, chat.id);
      toast.success('Message request accepted');
      onRequestAccepted?.();
    } catch (err: any) {
      toast.error(err?.message || 'Could not accept request');
    }
  };

  const handleDeclineRequest = async () => {
    try {
      await messagesApi.declineRequest(token, chat.id);
      toast.success('Message request declined');
      onRequestDeclined?.();
    } catch (err: any) {
      toast.error(err?.message || 'Could not decline request');
    }
  };

  const handleWorkoutRequestSubmit = async () => {
    if (workoutSubmittingRef.current) return;
    workoutSubmittingRef.current = true;
    setWorkoutSubmitting(true);
    try {
      // Send the casual message first
      if (workoutMessage.trim()) {
        await sendMessage(workoutMessage.trim());
      }
      // Create the session — sport auto-detected from the requester's primary sport
      const isFlexibleDate = !workoutDate || workoutDate === 'Flexible';
      const now = new Date();
      const twoWeeksOut = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      const { session } = await sessionsApi.create(token, {
        sport: user?.sport || 'Other',
        workoutType,
        title: `${workoutType} with ${chat.name}`,
        date: isFlexibleDate ? 'Flexible' : workoutDate,
        ...(isFlexibleDate && {
          dateWindowStart: now.toISOString(),
          dateWindowEnd: twoWeeksOut.toISOString(),
        }),
        time: workoutTime,
        location: workoutLocation || 'TBD',
        duration: workoutDuration,
        notes: workoutNotes,
        sessionType: 'need',
        status: 'open',
      } as any);
      // Post session link into chat
      await messagesApi.postSessionLink(token, { recipientId: chat.id, sessionId: session._id });
      toast.success('Workout request sent!');
      setShowWorkoutRequest(false);
      setWorkoutStep(1);
      setWorkoutType('Sport Practice / Drills');
      setWorkoutMessage('');
      setWorkoutDate('');
      setWorkoutTime('Flexible');
      setWorkoutLocation('');
      setWorkoutDuration('1 hr');
      setWorkoutNotes('');
    } catch (err: any) {
      toast.error(err?.message || 'Could not send request');
    } finally {
      workoutSubmittingRef.current = false;
      setWorkoutSubmitting(false);
    }
  };

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPartnerTyping]);

  // Clean up typing timer on unmount to prevent post-unmount socket events
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, []);

  const closeWorkoutModal = () => {
    setShowWorkoutRequest(false);
    setWorkoutStep(1);
    setWorkoutType('Sport Practice / Drills');
    setWorkoutMessage('');
    setWorkoutDate('');
    setWorkoutTime('Flexible');
    setWorkoutLocation('');
    setWorkoutDuration('1 hr');
    setWorkoutNotes('');
    workoutSubmittingRef.current = false;
    setWorkoutSubmitting(false);
  };

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    sendTypingStop();
    hapticLight();
    await sendMessage(text);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    sendTypingStart();
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(sendTypingStop, 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSend();
  };

  const handleConfirmSession = async () => {
    setIsSessionConfirmed(true);
    setShowConfirmModal(false);
    const d = chat.sessionDetails;
    await sendMessage(`✅ Session confirmed! See you on ${d?.date ?? 'the agreed date'} at ${d?.time ?? 'the agreed time'}, ${d?.location ?? 'at the agreed location'}.`);
  };

  const handleApplyChanges = async () => {
    if (!proposedDate && !proposedTime && !proposedLocation) return;
    const sessionId = chat.sessionDetails?.sessionId;
    if (sessionId && token && proposedDate) {
      try {
        await sessionsApi.suggestTime(token, sessionId, { date: proposedDate, time: proposedTime || undefined });
      } catch { /* fall through to message */ }
    }
    const parts = [
      proposedDate && `Date: ${proposedDate}`,
      proposedTime && `Time: ${proposedTime}`,
      proposedLocation && `Location: ${proposedLocation}`,
    ].filter(Boolean).join(' · ');
    await sendMessage(`📅 Proposed change — ${parts}. Let me know if that works!`);
    setShowProposeChanges(false);
  };

  const handleBlockUser = async () => {
    setShowOptions(false);
    setBlocking(true);
    try {
      await usersApi.blockUser(token, chat.id);
      toast.success(`${chat.name} has been blocked`);
      onBack();
    } catch (err: any) {
      toast.error(err?.message || 'Could not block user');
    } finally {
      setBlocking(false);
    }
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors -ml-2"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>

          <button
            onClick={() => onViewProfile?.(chat.id)}
            className="flex items-center gap-3 flex-1 min-w-0 text-left"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white flex-shrink-0 overflow-hidden">
              {avatarThumb(chat.avatar, 40)
                ? <img src={avatarThumb(chat.avatar, 40)!} alt={chat.name} className="w-full h-full object-cover rounded-full" />
                : chat.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-slate-900 hover:text-emerald-600 transition-colors">{chat.name}</h3>
              {chat.role && (
                <p className="text-xs text-slate-500 capitalize">{chat.role}</p>
              )}
            </div>
          </button>

          <button
            onClick={() => setShowOptions(true)}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors flex-shrink-0"
          >
            <MoreVertical className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Message Request Banner */}
        {isIncomingRequest && (
          <div className="px-4 pb-3">
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3">
              <p className="text-xs text-amber-800 mb-2 font-medium">
                {chat.name} sent you a message request
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleAcceptRequest}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1"
                >
                  <UserCheck className="w-4 h-4" />
                  Accept
                </button>
                <button
                  onClick={handleDeclineRequest}
                  className="flex-1 bg-white hover:bg-slate-50 text-slate-700 py-2 rounded-lg text-sm font-semibold transition-colors border border-slate-300 flex items-center justify-center gap-1"
                >
                  <X className="w-4 h-4" />
                  Decline
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Session Details Snippet */}
        {chat.sessionDetails && (
          <div className="px-4 pb-3">
            {isSessionConfirmed ? (
              <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h4 className="text-green-900 font-medium">Session Confirmed!</h4>
                </div>
                <div className="flex items-center gap-2 text-sm text-green-700 mb-2">
                  <Calendar className="w-4 h-4" />
                  <span>{chat.sessionDetails.date}, {chat.sessionDetails.time}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <MapPin className="w-4 h-4" />
                  <span>{chat.sessionDetails.location}</span>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                <div className="flex items-center gap-2 text-sm text-slate-700 mb-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span>{chat.sessionDetails.date}, {chat.sessionDetails.time}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
                  <MapPin className="w-4 h-4 text-slate-500" />
                  <span>{chat.sessionDetails.location}</span>
                </div>
                <button
                  onClick={() => setShowConfirmModal(true)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Finalize & Confirm Session
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center">
            <MessageCircle className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-slate-500 text-sm">No messages yet. Say hello!</p>
          </div>
        )}

        {messages.map((msg) => {
          if (msg.type === 'system') {
            if (msg.sessionId) {
              return (
                <div key={msg._id} className="flex justify-center my-2 px-2">
                  <button
                    onClick={() => onViewSession?.(msg.sessionId!)}
                    className="w-full max-w-[92%] bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 text-left hover:bg-emerald-100 active:scale-[0.98] transition-all"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Calendar className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-emerald-900 leading-snug mb-0.5">{msg.text}</p>
                        <p className="text-xs text-emerald-600 flex items-center gap-0.5">
                          Tap to view session <ChevronRight className="w-3 h-3" />
                        </p>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 text-right">{formatTime(msg.createdAt)}</p>
                  </button>
                </div>
              );
            }
            return (
              <div key={msg._id} className="flex justify-center my-1">
                <div className="max-w-[85%] bg-slate-100 border border-slate-200 rounded-2xl px-4 py-2.5 text-center">
                  <p className="text-xs text-slate-500 leading-snug">{msg.text}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{formatTime(msg.createdAt)}</p>
                </div>
              </div>
            );
          }

          const isMe = msg.sender === currentUserId;
          const likeCount = msg.likes?.length ?? 0;
          const iLiked = msg.likes?.includes(currentUserId) ?? false;
          const canLike = !isMe; // only like messages from the other person
          return (
            <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
              <div className={`max-w-[75%] ${isMe ? 'order-2' : 'order-1'}`}>
                <div className="relative">
                  <div
                    className={`rounded-2xl px-4 py-2.5 ${
                      isMe
                        ? 'bg-emerald-500 text-white rounded-br-sm'
                        : 'bg-white text-slate-900 rounded-bl-sm shadow-sm'
                    }`}
                  >
                    <p className="text-sm">{msg.text}</p>
                  </div>
                  {/* Like button — always visible on touch, subtle when not liked */}
                  {canLike && (
                    <button
                      onClick={() => toggleLike(msg._id)}
                      className={`absolute -bottom-3 -right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs transition-all
                        ${iLiked
                          ? 'bg-red-100 border border-red-200 text-red-500'
                          : 'bg-white border border-slate-200 text-slate-300 hover:text-slate-400'
                        }`}
                      aria-label={iLiked ? 'Unlike' : 'Like'}
                    >
                      <Heart className={`w-3 h-3 ${iLiked ? 'fill-red-500 text-red-500' : ''}`} />
                      {likeCount > 0 && <span>{likeCount}</span>}
                    </button>
                  )}
                </div>
                <p className={`text-xs text-slate-500 px-1 ${canLike ? 'mt-4' : 'mt-1'} ${isMe ? 'text-right' : 'text-left'}`}>
                  {formatTime(msg.createdAt)}
                  {isMe && msg.read && (
                    <span className="ml-1 text-emerald-400">✓✓</span>
                  )}
                </p>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isPartnerTyping && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Text Input */}
      <div className="bg-white border-t border-slate-200 p-3">
        <div className="flex items-center gap-2 mb-2">
          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 rounded-full bg-slate-50 border-2 border-transparent focus:border-emerald-400 focus:outline-none transition-colors"
          />
          <button
            onClick={handleSend}
            onTouchEnd={(e) => { e.preventDefault(); if (inputText.trim()) handleSend(); }}
            disabled={!inputText.trim()}
            className="w-11 h-11 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white rounded-full flex items-center justify-center transition-colors flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <button
          onClick={() => { setShowWorkoutRequest(true); setWorkoutStep(1); }}
          onTouchEnd={(e) => { e.preventDefault(); setShowWorkoutRequest(true); setWorkoutStep(1); }}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-sm font-semibold transition-colors touch-manipulation"
        >
          <Dumbbell className="w-4 h-4" />
          Request Workout
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && chat.sessionDetails && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-end justify-center z-50 px-6 pb-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-slate-900 font-semibold mb-2">Confirm Session?</h3>
              <p className="text-sm text-slate-600">
                You're confirming this session with {chat.name}. Both parties will be notified.
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 mb-6 space-y-3">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="text-xs text-slate-500">Date & Time</p>
                  <p className="text-sm text-slate-900 font-medium">
                    {chat.sessionDetails.date}, {chat.sessionDetails.time}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="text-xs text-slate-500">Location</p>
                  <p className="text-sm text-slate-900 font-medium">{chat.sessionDetails.location}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleConfirmSession}
                className="w-full py-3.5 bg-gradient-to-br from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl font-medium transition-all shadow-sm active:scale-[0.98]"
              >
                Confirm Session
              </button>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setShowProposeChanges(true);
                  setProposedDate(chat.sessionDetails?.date || '');
                  setProposedTime(chat.sessionDetails?.time || '');
                  setProposedLocation(chat.sessionDetails?.location || '');
                }}
                className="w-full py-3.5 bg-white hover:bg-slate-50 text-slate-900 border-2 border-emerald-500 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
              >
                <Edit3 className="w-4 h-4" />
                Propose Changes
              </button>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="w-full py-3.5 bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 rounded-xl font-medium transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Propose Changes Modal */}
      {showProposeChanges && chat.sessionDetails && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-end justify-center z-50 px-6 pb-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Edit3 className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-slate-900 font-semibold mb-2">Propose Changes</h3>
              <p className="text-sm text-slate-600">
                Suggest new details to {chat.name}. They'll be notified of your proposal.
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-sm text-slate-700 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Date
                </label>
                <input
                  type="text"
                  value={proposedDate}
                  onChange={(e) => setProposedDate(e.target.value)}
                  placeholder={chat.sessionDetails.date}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-sm text-slate-700 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Time
                </label>
                <input
                  type="text"
                  value={proposedTime}
                  onChange={(e) => setProposedTime(e.target.value)}
                  placeholder={chat.sessionDetails.time}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-sm text-slate-700 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Location
                </label>
                <input
                  type="text"
                  value={proposedLocation}
                  onChange={(e) => setProposedLocation(e.target.value)}
                  placeholder={chat.sessionDetails.location}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleApplyChanges}
                className="w-full py-3.5 bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl font-medium transition-all shadow-sm active:scale-[0.98]"
              >
                Send Proposal
              </button>
              <button
                onClick={() => setShowProposeChanges(false)}
                className="w-full py-3.5 bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 rounded-xl font-medium transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workout Request Modal */}
      {showWorkoutRequest && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-end justify-center z-50">
          <div className="bg-white rounded-t-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center">
                  <Dumbbell className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Request Workout</h3>
                  <p className="text-xs text-slate-500">with {chat.name}</p>
                </div>
              </div>
              <button
                onClick={closeWorkoutModal}
                onTouchEnd={(e) => { e.preventDefault(); closeWorkoutModal(); }}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors touch-manipulation"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {workoutStep === 1 ? (
                <>
                  {/* Workout type picker */}
                  <div>
                    <label className="text-sm font-semibold text-slate-700 mb-2 block">Workout type</label>
                    <div className="grid grid-cols-1 gap-2">
                      {WORKOUT_TYPES.map((type) => {
                        const icons: Record<string, string> = {
                          'Sport Practice / Drills': '🏅',
                          'Lifting / Strength': '🏋️',
                          'Conditioning / Cardio': '🏃',
                        };
                        return (
                          <button
                            key={type}
                            onClick={() => setWorkoutType(type)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all text-left ${
                              workoutType === type
                                ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <span className="text-lg">{icons[type]}</span>
                            {type}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-700 mb-2 block">Send a message</label>
                    <p className="text-xs text-slate-500 mb-3">Give {chat.name} a heads up about what you're thinking</p>
                    <textarea
                      value={workoutMessage}
                      onChange={(e) => setWorkoutMessage(e.target.value)}
                      placeholder={`e.g. "Can you workout next week? Morristown area?"`}
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-emerald-400 focus:outline-none transition-colors resize-none text-sm"
                    />
                  </div>
                  <button
                    onClick={() => setWorkoutStep(2)}
                    onTouchEnd={(e) => { e.preventDefault(); setWorkoutStep(2); }}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-xl font-semibold transition-all touch-manipulation"
                  >
                    Next: Add Details
                  </button>
                  <button
                    onClick={closeWorkoutModal}
                    onTouchEnd={(e) => { e.preventDefault(); closeWorkoutModal(); }}
                    className="w-full py-3 text-sm text-slate-500 touch-manipulation"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Type</span>
                    <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-medium">{workoutType}</span>
                  </div>
                  <p className="text-sm text-slate-600">Finalize the workout details so {chat.name} knows exactly what you have in mind.</p>

                  {/* Date */}
                  <div>
                    <label className="text-sm font-semibold text-slate-700 mb-2 block">Date</label>
                    <div className="relative">
                      <select
                        value={workoutDate || 'Flexible'}
                        onChange={(e) => setWorkoutDate(e.target.value === 'Flexible' ? '' : e.target.value)}
                        className="w-full appearance-none px-4 py-3 pr-10 rounded-xl border-2 border-slate-200 bg-white text-slate-900 focus:border-emerald-400 focus:outline-none transition-colors"
                      >
                        {(() => {
                          const today = new Date(); today.setHours(0,0,0,0);
                          const windowEnd = new Date(today); windowEnd.setDate(today.getDate() + 14);
                          const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                          const opts = [{ val: 'Flexible', label: `2-Week Window (${fmt(today)} – ${fmt(windowEnd)})` }];
                          for (let i = 0; i <= 30; i++) {
                            const d = new Date(today); d.setDate(today.getDate() + i);
                            const val = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                            const label = i === 0 ? `Today — ${d.toLocaleDateString('en-US',{month:'short',day:'numeric'})}` :
                                          i === 1 ? `Tomorrow — ${d.toLocaleDateString('en-US',{month:'short',day:'numeric'})}` :
                                          d.toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'});
                            opts.push({ val, label });
                          }
                          return opts.map(o => <option key={o.val} value={o.val}>{o.label}</option>);
                        })()}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Time */}
                  <div>
                    <label className="text-sm font-semibold text-slate-700 mb-2 block flex items-center gap-2">
                      <Clock className="w-4 h-4" /> Time
                    </label>
                    <div className="relative">
                      <select
                        value={workoutTime}
                        onChange={(e) => setWorkoutTime(e.target.value)}
                        className="w-full appearance-none px-4 py-3 pr-10 rounded-xl border-2 border-slate-200 bg-white text-slate-900 focus:border-emerald-400 focus:outline-none transition-colors"
                      >
                        <option value="Flexible">Flexible — open to discuss</option>
                        {Array.from({length: 17}, (_, i) => i + 6).map(h => {
                          const val = `${String(h).padStart(2,'0')}:00`;
                          const ampm = h >= 12 ? 'PM' : 'AM';
                          const display = h % 12 === 0 ? 12 : h % 12;
                          return <option key={val} value={val}>{display}:00 {ampm}</option>;
                        })}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Location */}
                  <div>
                    <label className="text-sm font-semibold text-slate-700 mb-2 block flex items-center gap-2">
                      <MapPin className="w-4 h-4" /> Location
                    </label>
                    <input
                      type="text"
                      value={workoutLocation}
                      onChange={(e) => setWorkoutLocation(e.target.value)}
                      placeholder="e.g. Morristown, NJ or TBD"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-400 focus:outline-none transition-colors"
                    />
                  </div>

                  {/* Duration */}
                  <div>
                    <label className="text-sm font-semibold text-slate-700 mb-2 block flex items-center gap-2">
                      <Clock className="w-4 h-4" /> Duration
                    </label>
                    <div className="relative">
                      <select
                        value={workoutDuration}
                        onChange={(e) => setWorkoutDuration(e.target.value)}
                        className="w-full appearance-none px-4 py-3 pr-10 rounded-xl border-2 border-slate-200 bg-white text-slate-900 focus:border-emerald-400 focus:outline-none transition-colors"
                      >
                        <option value="1 hr">1 hour</option>
                        <option value="90 mins">90 minutes</option>
                        <option value="2 hr">2 hours</option>
                        <option value="Flexible">Flexible</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="text-sm font-semibold text-slate-700 mb-2 block">Notes (optional)</label>
                    <textarea
                      value={workoutNotes}
                      onChange={(e) => setWorkoutNotes(e.target.value)}
                      placeholder="Goals, equipment needed, anything else..."
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-emerald-400 focus:outline-none transition-colors resize-none text-sm"
                    />
                  </div>

                  <button
                    onClick={handleWorkoutRequestSubmit}
                    onTouchEnd={(e) => { e.preventDefault(); if (!workoutSubmittingRef.current) handleWorkoutRequestSubmit(); }}
                    disabled={workoutSubmitting}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 touch-manipulation"
                  >
                    {workoutSubmitting
                      ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <><Dumbbell className="w-5 h-5" /> Send Request</>}
                  </button>
                  <button
                    onClick={() => setWorkoutStep(1)}
                    onTouchEnd={(e) => { e.preventDefault(); setWorkoutStep(1); }}
                    className="w-full py-3 text-sm text-slate-500 touch-manipulation"
                  >
                    ← Back
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Options Sheet */}
      {showOptions && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-end justify-center z-50" onClick={() => setShowOptions(false)}>
          <div className="bg-white rounded-t-3xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mt-3 mb-4" />
            <div className="px-5 pb-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Options</p>
            </div>
            <button
              onClick={handleBlockUser}
              disabled={blocking}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-red-50 transition-colors text-left disabled:opacity-50"
            >
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Ban className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="font-semibold text-red-600">Block {chat.name}</p>
                <p className="text-xs text-slate-500">They won't be able to message you</p>
              </div>
            </button>
            <div className="h-px bg-slate-100 mx-5 my-1" />
            <button
              onClick={() => setShowOptions(false)}
              className="w-full py-4 text-slate-600 font-medium text-sm hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <div className="h-safe-area-bottom" />
          </div>
        </div>
      )}

    </div>
  );
}
