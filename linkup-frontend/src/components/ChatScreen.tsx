import {
  ArrowLeft, Send, Calendar, MapPin, CheckCircle, Edit3,
  PlusCircle, MessageCircle, User, LayoutDashboard
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useMessages } from '../hooks/useMessages';

interface Chat {
  id: string;
  name: string;
  avatar: string;
  role?: string;
  sessionDetails?: {
    date: string;
    time: string;
    location: string;
  };
}

interface ChatScreenProps {
  chat: Chat;
  /** ID of the logged-in user */
  currentUserId: string;
  /** JWT token */
  token: string;
  onBack: () => void;
  onTabChange?: (tab: string) => void;
}

export function ChatScreen({ chat, currentUserId, token, onBack, onTabChange }: ChatScreenProps) {
  const [inputText, setInputText] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSessionConfirmed, setIsSessionConfirmed] = useState(false);
  const [showProposeChanges, setShowProposeChanges] = useState(false);
  const [proposedDate, setProposedDate] = useState('');
  const [proposedTime, setProposedTime] = useState('');
  const [proposedLocation, setProposedLocation] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    messages,
    loading,
    isPartnerTyping,
    sendMessage,
    sendTypingStart,
    sendTypingStop,
  } = useMessages({
    currentUserId,
    partnerId: chat.id,
    token,
  });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPartnerTyping]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    sendTypingStop();
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

  const handleConfirmSession = () => {
    setIsSessionConfirmed(true);
    setShowConfirmModal(false);
  };

  const handleApplyChanges = () => {
    if (proposedDate && proposedTime && proposedLocation) {
      setShowProposeChanges(false);
    }
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

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

          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white flex-shrink-0">
            {chat.avatar}
          </div>

          <div className="flex-1">
            <h3 className="text-slate-900">{chat.name}</h3>
            {chat.role && (
              <p className="text-xs text-slate-500 capitalize">{chat.role}</p>
            )}
          </div>
        </div>

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
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <div className="flex items-center gap-2 text-sm text-slate-700 mb-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
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
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center">
            <MessageCircle className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-slate-500 text-sm">No messages yet. Say hello!</p>
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.sender === currentUserId;
          return (
            <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] ${isMe ? 'order-2' : 'order-1'}`}>
                <div
                  className={`rounded-2xl px-4 py-2.5 ${
                    isMe
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-white text-slate-900 rounded-bl-sm shadow-sm'
                  }`}
                >
                  <p className="text-sm">{msg.text}</p>
                </div>
                <p className={`text-xs text-slate-500 mt-1 px-1 ${isMe ? 'text-right' : 'text-left'}`}>
                  {formatTime(msg.createdAt)}
                  {isMe && msg.read && (
                    <span className="ml-1 text-blue-400">✓✓</span>
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
      <div className="bg-white border-t border-slate-200 p-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 rounded-full bg-slate-50 border-2 border-transparent focus:border-blue-400 focus:outline-none transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim()}
            className="w-11 h-11 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-full flex items-center justify-center transition-colors flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
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
                <Calendar className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-xs text-slate-500">Date & Time</p>
                  <p className="text-sm text-slate-900 font-medium">
                    {chat.sessionDetails.date}, {chat.sessionDetails.time}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-blue-600" />
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
                className="w-full py-3.5 bg-white hover:bg-slate-50 text-slate-900 border-2 border-blue-500 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
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
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Edit3 className="w-8 h-8 text-blue-600" />
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
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none transition-colors"
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
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none transition-colors"
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
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleApplyChanges}
                className="w-full py-3.5 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-medium transition-all shadow-sm active:scale-[0.98]"
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

      {/* Bottom Navigation */}
      <div className="h-20 bg-white border-t border-slate-200 px-2 pb-2">
        <div className="h-full flex items-center justify-around">
          <button
            onClick={() => onTabChange?.('dashboard')}
            className="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all text-slate-400 hover:text-slate-600"
          >
            <LayoutDashboard className="w-6 h-6" strokeWidth={2} />
            <span className="text-xs">Locker room</span>
          </button>
          <button
            onClick={() => onTabChange?.('post')}
            className="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all text-slate-400 hover:text-slate-600"
          >
            <PlusCircle className="w-6 h-6" strokeWidth={2} />
            <span className="text-xs">LinkUp</span>
          </button>
          <button
            onClick={onBack}
            className="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all text-blue-900"
          >
            <MessageCircle className="w-6 h-6 fill-blue-900" strokeWidth={2} />
            <span className="text-xs">Chat</span>
          </button>
          <button
            onClick={() => onTabChange?.('profile')}
            className="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all text-slate-400 hover:text-slate-600"
          >
            <User className="w-6 h-6" strokeWidth={2} />
            <span className="text-xs">Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
}
