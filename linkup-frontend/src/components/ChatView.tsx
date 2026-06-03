import { Search, Edit } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { messages as messagesApi, avatarThumb } from '../lib/api';
import { ChatScreen } from './ChatScreen';
import { X, Shield, Users, Trash2 } from 'lucide-react';
import { getActiveSocket } from '../lib/socket';
import { toast } from 'sonner';

interface RequestInfo {
  status: 'pending' | 'accepted' | 'declined';
  isRequester: boolean;
  requestId: string;
}

interface Conversation {
  _id: string;
  partner: {
    _id: string;
    name: string;
    avatar: string | null;
    role: string;
    sport: string;
    position: string;
    skillLevel: string;
    isOnline: boolean;
    lastSeen: string;
  };
  lastMessage: {
    text: string;
    createdAt: string;
    sender: string;
  };
  unread: number;
  requestInfo: RequestInfo | null;
}

interface RosterAthlete {
  _id: string;
  name: string;
  avatar: string | null;
  sport: string;
  position: string;
  skillLevel: string;
}

interface ActiveChat {
  id: string;
  name: string;
  avatar: string;
  role?: string;
  sessionDetails?: { sessionId?: string; date: string; time: string; location: string };
  requestInfo?: RequestInfo | null;
}

interface ChatViewProps {
  currentUserId: string;
  token: string;
  selectedAthlete?: {
    id: string;
    name: string;
    avatar: string;
    sport: string;
    position: string;
    level: string;
    sessionContext?: { sessionId?: string; sessionTitle: string; date: string; time: string; location: string };
  };
  onClearSelectedAthlete?: () => void;
  onTabChange?: (tab: string) => void;
  onChatOpenChange?: (open: boolean) => void;
  onViewProfile?: (userId: string) => void;
  onViewSession?: (sessionId: string) => void;
  onBack?: () => void;
  apiUrl?: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function Avatar({ url, name, size = 48 }: { url: string | null; name: string; size?: number }) {
  const thumb = avatarThumb(url, size);
  if (thumb) return <img src={thumb} alt={name} className="w-full h-full object-cover rounded-full" />;
  return <>{getInitials(name)}</>;
}

export function ChatView({
  currentUserId,
  token,
  selectedAthlete,
  onClearSelectedAthlete,
  onTabChange,
  onChatOpenChange,
  onViewProfile,
  onViewSession,
  onBack,
  apiUrl = API_URL,
}: ChatViewProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [rosterAthletes, setRosterAthletes] = useState<RosterAthlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<ActiveChat | null>(null);
  const [showRosterModal, setShowRosterModal] = useState(false);

  // Tell MobileFrame to hide the bottom tab bar while a conversation is open
  const onChatOpenChangeRef = useRef(onChatOpenChange);
  onChatOpenChangeRef.current = onChatOpenChange;
  useEffect(() => {
    onChatOpenChangeRef.current?.(selectedChat !== null);
  }, [selectedChat]);
  const [hiddenPartnerIds, setHiddenPartnerIds] = useState<Set<string>>(new Set());
  const [deletingPartnerId, setDeletingPartnerId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [onlineMap, setOnlineMap] = useState<Record<string, boolean>>({});

  // ── Fetch conversations from REST ──────────────────────────────────────────
  const fetchInbox = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (err: any) {
      toast.error(err?.message || 'Could not load messages');
    } finally {
      setLoading(false);
    }
  }, [token, apiUrl]);

  // ── Fetch roster for new conversation modal ────────────────────────────────
  const fetchRoster = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/connections`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setRosterAthletes(
        (data.connections || []).map((c: any) => c.user)
      );
    } catch (err: any) {
      toast.error(err?.message || 'Could not load roster');
    }
  }, [token, apiUrl]);

  useEffect(() => {
    fetchInbox();
    fetchRoster();
  }, [fetchInbox, fetchRoster]);

  // ── Subscribe to real-time inbox updates ───────────────────────────────────
  useEffect(() => {
    const socket = getActiveSocket();
    if (!socket) return;

    const handleNewMessage = (msg: any) => {
      setConversations((prev) => {
        const partnerId = msg.sender === currentUserId ? msg.recipient : msg.sender;
        const idx = prev.findIndex((c) => c.partner._id === partnerId);
        if (idx === -1) {
          // New conversation — refetch
          fetchInbox();
          return prev;
        }
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          lastMessage: { text: msg.text, createdAt: msg.createdAt, sender: msg.sender },
          unread: msg.sender !== currentUserId ? updated[idx].unread + 1 : updated[idx].unread,
        };
        // Move to top
        return [updated[idx], ...updated.filter((_, i) => i !== idx)];
      });
    };

    const handlePresence = ({ userId, isOnline }: { userId: string; isOnline: boolean }) => {
      setOnlineMap((prev) => ({ ...prev, [userId]: isOnline }));
    };

    socket.on('message:new', handleNewMessage);
    socket.on('user:presence', handlePresence);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('user:presence', handlePresence);
    };
  }, [currentUserId, fetchInbox]);

  // ── Query initial online status for loaded conversations ───────────────────
  useEffect(() => {
    const socket = getActiveSocket();
    if (!socket || conversations.length === 0) return;
    const ids = conversations.map((c) => c.partner._id);
    socket.emit('presence:query', { userIds: ids }, (status: Record<string, boolean>) => {
      setOnlineMap(status);
    });
  }, [conversations.length]);

  // ── If an athlete was passed in from another screen, open that chat ────────
  useEffect(() => {
    if (selectedAthlete && !selectedChat) {
      const ctx = selectedAthlete.sessionContext;
      setSelectedChat({
        id: selectedAthlete.id,
        name: selectedAthlete.name,
        avatar: selectedAthlete.avatar || getInitials(selectedAthlete.name),
        role: selectedAthlete.position,
        sessionDetails: ctx
          ? { sessionId: ctx.sessionId, date: ctx.date, time: ctx.time, location: ctx.location }
          : undefined,
      });
      // Post session-link system message so both users have the link in their thread
      if (ctx?.sessionId && token) {
        messagesApi.postSessionLink(token, {
          recipientId: selectedAthlete.id,
          sessionId: ctx.sessionId,
        }).catch(() => {}); // fire-and-forget; idempotent on server
      }
    }
  }, [selectedAthlete]);

  const handleOpenConversation = (conv: Conversation) => {
    setConversations((prev) =>
      prev.map((c) => (c.partner._id === conv.partner._id ? { ...c, unread: 0 } : c))
    );
    setSelectedChat({
      id: conv.partner._id,
      name: conv.partner.name,
      avatar: conv.partner.avatar || getInitials(conv.partner.name),
      role: conv.partner.position,
      requestInfo: conv.requestInfo,
    });
  };

  const handleRequestAccepted = (partnerId: string) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.partner._id === partnerId
          ? { ...c, requestInfo: { ...c.requestInfo!, status: 'accepted' } }
          : c
      )
    );
    setSelectedChat((prev) =>
      prev && prev.id === partnerId
        ? { ...prev, requestInfo: { ...prev.requestInfo!, status: 'accepted' } }
        : prev
    );
  };

  const handleRequestDeclined = (partnerId: string) => {
    setConversations((prev) => prev.filter((c) => c.partner._id !== partnerId));
    setSelectedChat(null);
  };

  const handleStartChatWithRosterAthlete = (athlete: RosterAthlete) => {
    setSelectedChat({
      id: athlete._id,
      name: athlete.name,
      avatar: athlete.avatar || getInitials(athlete.name),
      role: athlete.position,
    });
    setShowRosterModal(false);
  };

  const confirmDeleteChat = (partnerId: string) => {
    setHiddenPartnerIds((prev) => new Set([...prev, partnerId]));
    setDeletingPartnerId(null);
  };

  const filtered = conversations.filter(
    (c) =>
      !hiddenPartnerIds.has(c.partner._id) &&
      (searchQuery === '' ||
        (c.partner?.name || '').toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Pending requests where I am the recipient
  const pendingRequests = filtered.filter(
    (c) => c.requestInfo?.status === 'pending' && !c.requestInfo.isRequester
  );
  // Everything else (accepted, I-am-requester, no request = roster)
  const mainConversations = filtered.filter(
    (c) => !c.requestInfo || c.requestInfo.isRequester || c.requestInfo.status === 'accepted'
  );

  if (selectedChat) {
    return (
      <ChatScreen
        chat={selectedChat}
        currentUserId={currentUserId}
        token={token}
        onBack={() => {
          setSelectedChat(null);
          if (onClearSelectedAthlete) onClearSelectedAthlete();
          if (onBack) {
            onBack();
          } else {
            fetchInbox();
          }
        }}
        onTabChange={onTabChange}
        onRequestAccepted={() => handleRequestAccepted(selectedChat.id)}
        onRequestDeclined={() => handleRequestDeclined(selectedChat.id)}
        onViewProfile={onViewProfile}
        onViewSession={onViewSession}
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

      {/* Search */}
      <div className="p-4 border-b border-slate-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-emerald-400 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Message Requests */}
        {!loading && pendingRequests.length > 0 && (
          <div>
            <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                Message Requests ({pendingRequests.length})
              </span>
            </div>
            {pendingRequests.map((conv) => (
              <div
                key={conv.partner._id}
                onClick={() => handleOpenConversation(conv)}
                className="px-4 py-4 border-b border-amber-100 bg-amber-50/50 hover:bg-amber-50 transition-colors cursor-pointer flex items-center gap-3"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 overflow-hidden">
                  <Avatar url={conv.partner.avatar} name={conv.partner.name} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-slate-900 font-semibold text-sm">{conv.partner.name}</h4>
                  <p className="text-xs text-slate-500 truncate">{conv.lastMessage.text}</p>
                </div>
                <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full flex-shrink-0">
                  Request
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Main Inbox */}
        {!loading && mainConversations.map((conv) => {
          const isOnline = onlineMap[conv.partner._id] ?? conv.partner.isOnline;
          return (
            <div
              key={conv.partner._id}
              className="relative group px-4 py-4 border-b border-slate-100 hover:bg-slate-50 transition-colors"
            >
              <div
                onClick={() => handleOpenConversation(conv)}
                className="flex items-center gap-3 cursor-pointer"
              >
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold overflow-hidden">
                    <Avatar url={conv.partner.avatar} name={conv.partner.name} />
                  </div>
                  {isOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-slate-900 flex items-center gap-2">
                      {conv.partner.name}
                      {conv.unread > 0 && (
                        <span className="text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full">
                          {conv.unread}
                        </span>
                      )}
                      {conv.requestInfo?.isRequester && conv.requestInfo.status === 'pending' && (
                        <span className="text-xs bg-slate-400 text-white px-2 py-0.5 rounded-full">
                          Pending
                        </span>
                      )}
                    </h4>
                    <span className="text-xs text-slate-500">
                      {timeAgo(conv.lastMessage.createdAt)}
                    </span>
                  </div>
                  <p className={`text-sm truncate ${conv.unread > 0 ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>
                    {conv.lastMessage.sender === currentUserId ? 'You: ' : ''}
                    {conv.lastMessage.text}
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingPartnerId(conv.partner._id);
                  }}
                  className="ml-2 p-2 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded-full transition-all flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
            </div>
          );
        })}

        {!loading && mainConversations.length === 0 && pendingRequests.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Search className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-slate-900 font-semibold mb-2">No conversations</h3>
            <p className="text-slate-500 text-sm max-w-xs">
              Find athletes and send them a message to get started
            </p>
          </div>
        )}
      </div>

      {/* Roster Modal */}
      {showRosterModal && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-end justify-center z-50">
          <div className="bg-white rounded-t-3xl w-full max-w-md shadow-2xl max-h-[80vh] flex flex-col">
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

            <div className="px-6 py-3 bg-emerald-50 border-b border-emerald-200">
              <p className="text-sm text-emerald-700">Start a conversation with your roster</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {rosterAthletes.length > 0 ? (
                rosterAthletes.map((athlete) => (
                  <button
                    key={athlete._id}
                    onClick={() => handleStartChatWithRosterAthlete(athlete)}
                    className="w-full bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-emerald-400 rounded-2xl p-4 transition-all text-left active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold overflow-hidden">
                          <Avatar url={athlete.avatar} name={athlete.name} />
                        </div>
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                          <Shield className="w-3.5 h-3.5 text-white fill-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-slate-900 font-semibold">{athlete.name}</h4>
                        <p className="text-sm text-slate-600">{athlete.position}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded">
                            {athlete.skillLevel}
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
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingPartnerId !== null && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-6">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-red-600" />
            </div>
            <h3 className="text-slate-900 font-semibold text-center mb-2">Delete Conversation?</h3>
            <p className="text-slate-600 text-sm text-center mb-6">
              This removes it from your inbox. Messages are still saved.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingPartnerId(null)}
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmDeleteChat(deletingPartnerId)}
                className="flex-1 px-4 py-3 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-medium shadow-lg shadow-red-500/30 transition-all"
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
