import { useState, useEffect, useRef, useCallback } from 'react';
import { getActiveSocket } from '../lib/socket';
import { messages as messagesApi } from '../lib/api';
import { toast } from 'sonner';

export interface Message {
  _id: string;
  sender: string;        // userId
  recipient: string;     // userId
  text: string;
  read: boolean;
  type?: 'user' | 'system';
  sessionId?: string;
  createdAt: string;
  likes?: string[];
}

interface UseMessagesOptions {
  /** The ID of the current logged-in user */
  currentUserId: string;
  /** The ID of the conversation partner */
  partnerId: string;
  /** JWT token for REST fallback */
  token: string;
  /** Base URL for the REST API */
  apiUrl?: string;
}

export function useMessages({
  currentUserId,
  partnerId,
  token,
  apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000',
}: UseMessagesOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load existing messages from REST ────────────────────────────────────────
  useEffect(() => {
    if (!partnerId || !token) return;
    setLoading(true);

    fetch(`${apiUrl}/api/messages/${partnerId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setMessages(data.messages || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [partnerId, token, apiUrl]);

  // ── Subscribe to real-time events ────────────────────────────────────────────
  useEffect(() => {
    const socket = getActiveSocket();
    if (!socket) return;

    const handleNewMessage = (msg: Message) => {
      // Only add if it belongs to this conversation
      if (
        (msg.sender === partnerId && msg.recipient === currentUserId) ||
        (msg.sender === currentUserId && msg.recipient === partnerId)
      ) {
        setMessages((prev) => {
          // Deduplicate by _id
          if (prev.some((m) => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
      }
    };

    const handleTypingStart = ({ userId }: { userId: string }) => {
      if (userId === partnerId) {
        setIsPartnerTyping(true);
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => setIsPartnerTyping(false), 3000);
      }
    };

    const handleTypingStop = ({ userId }: { userId: string }) => {
      if (userId === partnerId) {
        setIsPartnerTyping(false);
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      }
    };

    const handleRead = ({ by }: { by: string; from: string }) => {
      if (by === partnerId) {
        setMessages((prev) =>
          prev.map((m) => (m.sender === currentUserId ? { ...m, read: true } : m))
        );
      }
    };

    const handleLike = ({ messageId, likes }: { messageId: string; likes: string[] }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, likes } : m))
      );
    };

    socket.on('message:new', handleNewMessage);
    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);
    socket.on('message:read', handleRead);
    socket.on('message:like', handleLike);

    // Mark messages as read when opening the conversation
    socket.emit('message:read', { senderId: partnerId });

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);
      socket.off('message:read', handleRead);
      socket.off('message:like', handleLike);
    };
  }, [partnerId, currentUserId]);

  // ── Send a message via socket (with REST fallback) ────────────────────────
  const sendMessage = useCallback(
    async (text: string): Promise<void> => {
      const socket = getActiveSocket();

      if (socket && socket.connected) {
        // Optimistic append
        const optimistic: Message = {
          _id: `optimistic-${Date.now()}`,
          sender: currentUserId,
          recipient: partnerId,
          text,
          read: false,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, optimistic]);

        socket.emit(
          'message:send',
          { recipientId: partnerId, text },
          (response: { message?: Message; error?: string }) => {
            if (response.error) {
              // Roll back optimistic message
              setMessages((prev) => prev.filter((m) => m._id !== optimistic._id));
              toast.error(response.error);
            } else if (response.message) {
              // Replace optimistic with confirmed
              setMessages((prev) =>
                prev.map((m) =>
                  m._id === optimistic._id ? response.message! : m
                )
              );
            }
          }
        );
      } else {
        // REST fallback
        const res = await fetch(`${apiUrl}/api/messages/${partnerId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ text }),
        });
        const data = await res.json();
        if (res.ok && data.message) {
          setMessages((prev) => [...prev, data.message]);
        } else if (!res.ok) {
          toast.error(data.message || 'Could not send message');
        }
      }
    },
    [partnerId, currentUserId, token, apiUrl]
  );

  // ── Emit typing events ───────────────────────────────────────────────────────
  const sendTypingStart = useCallback(() => {
    const socket = getActiveSocket();
    socket?.emit('typing:start', { recipientId: partnerId });
  }, [partnerId]);

  const sendTypingStop = useCallback(() => {
    const socket = getActiveSocket();
    socket?.emit('typing:stop', { recipientId: partnerId });
  }, [partnerId]);

  // ── Toggle like on a message ─────────────────────────────────────────────────
  const toggleLike = useCallback(
    async (messageId: string): Promise<void> => {
      // Optimistic update
      setMessages((prev) =>
        prev.map((m) => {
          if (m._id !== messageId) return m;
          const likes = m.likes ?? [];
          const alreadyLiked = likes.includes(currentUserId);
          return { ...m, likes: alreadyLiked ? likes.filter((id) => id !== currentUserId) : [...likes, currentUserId] };
        })
      );
      try {
        const { likes } = await messagesApi.like(token, messageId);
        setMessages((prev) => prev.map((m) => (m._id === messageId ? { ...m, likes } : m)));
      } catch {
        // Revert on error
        setMessages((prev) =>
          prev.map((m) => {
            if (m._id !== messageId) return m;
            const likes = m.likes ?? [];
            const wasAdded = likes.includes(currentUserId);
            return { ...m, likes: wasAdded ? likes.filter((id) => id !== currentUserId) : [...likes, currentUserId] };
          })
        );
        toast.error('Could not update like');
      }
    },
    [currentUserId, token]
  );

  return {
    messages,
    loading,
    isPartnerTyping,
    sendMessage,
    toggleLike,
    sendTypingStart,
    sendTypingStop,
  };
}
