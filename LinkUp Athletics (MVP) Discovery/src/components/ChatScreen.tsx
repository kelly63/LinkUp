import { ArrowLeft, Send, Calendar, MapPin, CheckCircle, Edit3, PlusCircle, MessageCircle, User, LayoutDashboard } from 'lucide-react';
import { useState } from 'react';

interface Chat {
  id: number;
  name: string;
  avatar: string;
  role: 'pitcher' | 'catcher';
  sessionDetails?: {
    date: string;
    time: string;
    location: string;
  };
}

interface ChatScreenProps {
  chat: Chat;
  onBack: () => void;
  onTabChange?: (tab: string) => void;
}

interface Message {
  id: number;
  text: string;
  sender: 'me' | 'them';
  time: string;
}

const mockMessages: Message[] = [
  {
    id: 1,
    text: 'Hey! I saw your bullpen request for tonight',
    sender: 'them',
    time: '2:30 PM'
  },
  {
    id: 2,
    text: 'Hi! Yes, still looking for a catcher. Are you available?',
    sender: 'me',
    time: '2:32 PM'
  },
  {
    id: 3,
    text: 'Yeah, I can make it. What time exactly?',
    sender: 'them',
    time: '2:33 PM'
  },
  {
    id: 4,
    text: '6:00 PM at Mission Valley Sports Complex. Should take about 90 minutes',
    sender: 'me',
    time: '2:35 PM'
  },
  {
    id: 5,
    text: 'Perfect! I know that field. See you there',
    sender: 'them',
    time: '2:36 PM'
  },
  {
    id: 6,
    text: 'Thanks! See you at 5PM',
    sender: 'them',
    time: '2:38 PM'
  },
];

export function ChatScreen({ chat, onBack, onTabChange }: ChatScreenProps) {
  const [messageText, setMessageText] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSessionConfirmed, setIsSessionConfirmed] = useState(false);
  const [showProposeChanges, setShowProposeChanges] = useState(false);
  const [proposedDate, setProposedDate] = useState('');
  const [proposedTime, setProposedTime] = useState('');
  const [proposedLocation, setProposedLocation] = useState('');
  const [changeProposed, setChangeProposed] = useState(false);

  const handleSend = () => {
    if (messageText.trim()) {
      // Handle send message
      setMessageText('');
    }
  };

  const handleConfirmSession = () => {
    setIsSessionConfirmed(true);
    setShowConfirmModal(false);
  };

  const handleProposeChanges = () => {
    setShowProposeChanges(true);
  };

  const handleApplyChanges = () => {
    if (proposedDate && proposedTime && proposedLocation) {
      setChangeProposed(true);
      setShowProposeChanges(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Top Bar with Back and Session Details */}
      <div className="bg-white border-b border-slate-200">
        {/* Header Row */}
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
            <p className="text-xs text-slate-500">{chat.role === 'pitcher' ? 'Pitcher' : 'Catcher'}</p>
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
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span>{chat.sessionDetails.date}, {chat.sessionDetails.time}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
                  <MapPin className="w-4 h-4 text-slate-500" />
                  <span>{chat.sessionDetails.location}</span>
                </div>
                
                {/* Finalize/Confirm Button */}
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
        {mockMessages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[75%] ${message.sender === 'me' ? 'order-2' : 'order-1'}`}>
              <div
                className={`rounded-2xl px-4 py-2.5 ${
                  message.sender === 'me'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-white text-slate-900 rounded-bl-sm'
                }`}
              >
                <p className="text-sm">{message.text}</p>
              </div>
              <p className={`text-xs text-slate-500 mt-1 px-1 ${message.sender === 'me' ? 'text-right' : 'text-left'}`}>
                {message.time}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Text Input Field */}
      <div className="bg-white border-t border-slate-200 p-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 rounded-full bg-slate-50 border-2 border-transparent focus:border-blue-400 focus:outline-none transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!messageText.trim()}
            className="w-11 h-11 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-full flex items-center justify-center transition-colors flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && chat.sessionDetails && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-end justify-center z-50 px-6 pb-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-slide-up">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-slate-900 font-semibold mb-2">Confirm Session?</h3>
              <p className="text-sm text-slate-600">
                You're confirming this session with {chat.name}. Both parties will be notified and the session will be added to your schedule.
              </p>
            </div>

            {/* Session Summary */}
            <div className="bg-slate-50 rounded-xl p-4 mb-6">
              <div className="space-y-3">
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
            </div>

            {/* Action Buttons */}
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
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-slide-up max-h-[85vh] overflow-y-auto">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Edit3 className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-slate-900 font-semibold mb-2">Propose Changes</h3>
              <p className="text-sm text-slate-600">
                Suggest new session details to {chat.name}. They'll be notified of your proposal.
              </p>
            </div>

            {/* Edit Session Details Form */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-sm text-slate-700 mb-2 block flex items-center gap-2">
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
                <label className="text-sm text-slate-700 mb-2 block flex items-center gap-2">
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
                <label className="text-sm text-slate-700 mb-2 block flex items-center gap-2">
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

            {/* Action Buttons */}
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
            <span className="text-xs font-[Magra]">Locker room</span>
          </button>
          
          <button
            onClick={() => onTabChange?.('post')}
            className="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all text-slate-400 hover:text-slate-600"
          >
            <PlusCircle className="w-6 h-6" strokeWidth={2} />
            <span className="text-xs font-[Magra]">LinkUp</span>
          </button>
          
          <button
            onClick={() => onBack()}
            className="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all text-blue-900"
          >
            <MessageCircle className="w-6 h-6 fill-blue-900" strokeWidth={2} />
            <span className="text-xs font-[Magra]">Chat</span>
          </button>
          
          <button
            onClick={() => onTabChange?.('profile')}
            className="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all text-slate-400 hover:text-slate-600"
          >
            <User className="w-6 h-6" strokeWidth={2} />
            <span className="text-xs font-[Magra]">Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
}