import { Search, Edit } from 'lucide-react';
import { useState } from 'react';
import { ChatScreen } from './ChatScreen';
import { X, Shield, Users, Trash2 } from 'lucide-react';

interface Chat {
  id: number;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  avatar: string;
  role?: string;
  sessionDetails?: {
    date: string;
    time: string;
    location: string;
  };
}

interface ChatViewProps {
  selectedAthlete?: { 
    id: number; 
    name: string; 
    avatar: string; 
    sport: string; 
    position: string; 
    level: string;
    sessionContext?: {
      sessionTitle: string;
      date: string;
      time: string;
      location: string;
    };
  };
  onClearSelectedAthlete?: () => void;
  onTabChange?: (tab: string) => void;
}

const mockChats: Chat[] = [
  {
    id: 1,
    name: 'Catcher Mike',
    lastMessage: 'Thanks! See you at 5PM',
    time: '2m ago',
    unread: 2,
    avatar: 'MJ',
    role: 'catcher',
    sessionDetails: {
      date: 'Today',
      time: '6:00 PM',
      location: 'Mission Valley Sports Complex'
    }
  },
  {
    id: 2,
    name: 'Pitcher Sarah',
    lastMessage: 'Is the bullpen still available?',
    time: '1h ago',
    unread: 1,
    avatar: 'SW',
    role: 'pitcher',
    sessionDetails: {
      date: 'Tomorrow',
      time: '3:00 PM',
      location: 'Sunset Field'
    }
  },
  {
    id: 3,
    name: 'Catcher David',
    lastMessage: 'Perfect, I\'ll be there',
    time: '3h ago',
    unread: 0,
    avatar: 'DC',
    role: 'catcher',
    sessionDetails: {
      date: 'Friday',
      time: '5:30 PM',
      location: 'Downtown Baseball Academy'
    }
  },
  {
    id: 4,
    name: 'Pitcher Tom',
    lastMessage: 'Great session today!',
    time: 'Yesterday',
    unread: 0,
    avatar: 'TA',
    role: 'pitcher'
  },
];

export function ChatView({ selectedAthlete, onClearSelectedAthlete, onTabChange }: ChatViewProps) {
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [hiddenChatIds, setHiddenChatIds] = useState<Set<number>>(new Set());
  const [deletingChatId, setDeletingChatId] = useState<number | null>(null);

  // Mock roster athletes
  const rosterAthletes = [
    {
      id: 101,
      name: 'Sarah Johnson',
      avatar: 'SJ',
      sport: 'Baseball',
      position: 'Pitcher (RHP)',
      level: 'NCAA D1'
    },
    {
      id: 102,
      name: 'Emily Chen',
      avatar: 'EC',
      sport: 'Soccer',
      position: 'Midfielder',
      level: 'NCAA D2'
    },
    {
      id: 103,
      name: 'Alex Martinez',
      avatar: 'AM',
      sport: 'Basketball',
      position: 'Point Guard',
      level: 'HS Varsity'
    },
    {
      id: 104,
      name: 'Jordan Lee',
      avatar: 'JL',
      sport: 'Volleyball',
      position: 'Setter',
      level: 'College - Other'
    }
  ];

  const handleStartChatWithRosterAthlete = (athlete: typeof rosterAthletes[0]) => {
    const newChat: Chat = {
      id: athlete.id,
      name: athlete.name,
      lastMessage: 'Start a conversation',
      time: 'Now',
      unread: 0,
      avatar: athlete.avatar,
      role: athlete.position.toLowerCase()
    };
    setSelectedChat(newChat);
    setShowRosterModal(false);
  };

  const handleDeleteChat = (chatId: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent chat from opening
    setDeletingChatId(chatId);
  };

  const confirmDeleteChat = (chatId: number) => {
    // In a real app, this would make an API call to archive/hide the chat
    // The backend would mark it as hidden but preserve the messages
    const newHiddenIds = new Set(hiddenChatIds);
    newHiddenIds.add(chatId);
    setHiddenChatIds(newHiddenIds);
    setDeletingChatId(null);
  };

  const cancelDeleteChat = () => {
    setDeletingChatId(null);
  };

  // Filter out hidden chats from display
  const visibleChats = mockChats.filter(chat => !hiddenChatIds.has(chat.id));

  // If a selectedAthlete is passed, create a new chat for them
  if (selectedAthlete && !selectedChat) {
    const newChat: Chat = {
      id: selectedAthlete.id + 1000, // Offset to avoid ID collision
      name: selectedAthlete.name,
      lastMessage: 'Start a conversation',
      time: 'Now',
      unread: 0,
      avatar: selectedAthlete.avatar,
      role: selectedAthlete.position.toLowerCase(),
      sessionDetails: selectedAthlete.sessionContext ? {
        date: selectedAthlete.sessionContext.date,
        time: selectedAthlete.sessionContext.time,
        location: selectedAthlete.sessionContext.location
      } : undefined
    };
    
    return (
      <ChatScreen 
        chat={newChat} 
        onBack={() => {
          if (onClearSelectedAthlete) {
            onClearSelectedAthlete();
          }
        }} 
        onTabChange={onTabChange}
      />
    );
  }

  if (selectedChat) {
    return (
      <ChatScreen 
        chat={selectedChat} 
        onBack={() => setSelectedChat(null)} 
        onTabChange={onTabChange}
      />
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <h2 className="text-slate-900">Inbox</h2>
        <button 
          onClick={() => setShowRosterModal(true)}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <Edit className="w-5 h-5 text-slate-700" />
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-4 border-b border-slate-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-blue-400 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {visibleChats.map((chat) => (
          <div
            key={chat.id}
            className="relative group px-4 py-4 border-b border-slate-100 hover:bg-slate-50 transition-colors"
          >
            <div 
              onClick={() => setSelectedChat(chat)}
              className="flex items-center gap-3 cursor-pointer"
            >
              {/* Avatar */}
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white flex-shrink-0">
                {chat.avatar}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-slate-900 flex items-center gap-2">
                    {chat.name}
                    {chat.unread > 0 && (
                      <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                        {chat.unread}
                      </span>
                    )}
                  </h4>
                  <span className="text-xs text-slate-500">{chat.time}</span>
                </div>
                <p className={`text-sm truncate ${chat.unread > 0 ? 'text-slate-900' : 'text-slate-500'}`}>
                  {chat.lastMessage}
                </p>
              </div>

              {/* Delete Button - Shows on hover */}
              <button
                onClick={(e) => handleDeleteChat(chat.id, e)}
                className="ml-2 p-2 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded-full transition-all flex-shrink-0"
                aria-label="Delete conversation"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            </div>
          </div>
        ))}

        {/* Empty State */}
        {visibleChats.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Search className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-slate-900 font-semibold mb-2">No conversations</h3>
            <p className="text-slate-500 text-sm max-w-xs">
              Start a new chat with athletes on your roster to begin connecting
            </p>
          </div>
        )}
      </div>

      {/* Roster Athletes Modal */}
      {showRosterModal && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-end justify-center z-50">
          <div className="bg-white rounded-t-3xl w-full max-w-md shadow-2xl max-h-[80vh] flex flex-col animate-slide-up">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-600" />
                <h3 className="text-slate-900 font-semibold">My Roster</h3>
              </div>
              <button
                onClick={() => setShowRosterModal(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Subtitle */}
            <div className="px-6 py-3 bg-emerald-50 border-b border-emerald-200">
              <p className="text-sm text-emerald-700">
                Start a conversation with athletes on your roster
              </p>
            </div>

            {/* Roster Athletes List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {rosterAthletes.length > 0 ? (
                rosterAthletes.map((athlete) => (
                  <button
                    key={athlete.id}
                    onClick={() => handleStartChatWithRosterAthlete(athlete)}
                    className="w-full bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-emerald-400 rounded-2xl p-4 transition-all text-left active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar with Roster Badge */}
                      <div className="relative">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {athlete.avatar}
                        </div>
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                          <Shield className="w-3.5 h-3.5 text-white fill-white" />
                        </div>
                      </div>

                      {/* Athlete Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-slate-900 font-semibold">{athlete.name}</h4>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white text-xs rounded-full font-medium shadow-sm">
                            <Shield className="w-3 h-3 fill-white" />
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mb-1">{athlete.position}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                            {athlete.level}
                          </span>
                          <span className="text-xs text-slate-500">{athlete.sport}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No athletes on your roster yet</p>
                  <p className="text-sm text-slate-400 mt-1">Add athletes to start chatting</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingChatId !== null && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-6">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 animate-scale-in">
            {/* Icon */}
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-red-600" />
            </div>

            {/* Content */}
            <h3 className="text-slate-900 font-semibold text-center mb-2">
              Delete Conversation?
            </h3>
            <p className="text-slate-600 text-sm text-center mb-6">
              This will remove the conversation from your inbox. Your messages will still be saved and can be recovered.
            </p>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={cancelDeleteChat}
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmDeleteChat(deletingChatId)}
                className="flex-1 px-4 py-3 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-medium shadow-lg shadow-red-500/30 transition-all active:scale-[0.98]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}