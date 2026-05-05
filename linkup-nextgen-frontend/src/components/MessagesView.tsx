import { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, MessageSquare } from 'lucide-react';
import { messages as messagesApi, Message, avatarThumb } from '../lib/api';
import { useAuth } from '../lib/auth';
import { getActiveSocket } from '../lib/socket';

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
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    messagesApi.getConversations(token)
      .then(r => setConversations(r.conversations || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token || !activeId) return;
    messagesApi.getThread(token, activeId).then(r => {
      setThread(r.messages || []);
      setTimeout(() => bottomRef.current?.scrollIntoView(), 50);
    }).catch(() => {});
  }, [token, activeId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [thread]);

  // listen for new messages via socket
  useEffect(() => {
    const socket = getActiveSocket();
    if (!socket) return;
    const handler = (msg: Message) => {
      if (msg.sender === activeId || msg.recipient === activeId) {
        setThread(prev => [...prev, msg]);
      }
    };
    socket.on('message', handler);
    return () => { socket.off('message', handler); };
  }, [activeId]);

  const handleSend = async () => {
    if (!token || !activeId || !draft.trim()) return;
    setSending(true);
    try {
      const { message } = await messagesApi.send(token, activeId, draft.trim());
      setThread(prev => [...prev, message]);
      setDraft('');
    } catch {
      // silent
    } finally {
      setSending(false);
    }
  };

  if (activeId && activeUser) {
    return (
      <div className="h-full flex flex-col bg-white">
        {/* Thread header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-100 flex-shrink-0">
          <button onClick={() => { setActiveId(null); setActiveUser(null); }} className="p-1.5 hover:bg-slate-100 rounded-full">
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
          <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-full flex items-center justify-center text-white text-sm font-bold overflow-hidden">
            {activeUser.avatar
              ? <img src={avatarThumb(activeUser.avatar, 80)!} alt={activeUser.name} className="w-full h-full object-cover" />
              : getInitials(activeUser.name)}
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-sm">{activeUser.name}</p>
            <p className="text-xs text-slate-400">Coach</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {thread.length === 0 && (
            <p className="text-center text-slate-400 text-sm py-8">Start the conversation!</p>
          )}
          {thread.map(msg => {
            const isMe = msg.sender === user?._id;
            return (
              <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  isMe
                    ? 'bg-emerald-600 text-white rounded-br-md'
                    : 'bg-slate-100 text-slate-900 rounded-bl-md'
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

        {/* Input */}
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
                    <p className="text-sm text-slate-500 truncate mt-0.5">{convo.lastMessage.text}</p>
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
