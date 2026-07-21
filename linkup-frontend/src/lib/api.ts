const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Returns a Cloudinary URL resized to `size`px square — falls back to original for non-Cloudinary URLs
export function avatarThumb(url: string | null | undefined, size = 80): string | null {
  if (!url) return null;
  if (!url.includes('res.cloudinary.com')) return url;
  return url.replace('/upload/', `/upload/w_${size},h_${size},c_fill,g_face/`);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'athlete' | 'coach';
  avatar: string | null;
  bio: string;
  location: string;
  teamType: string;
  school?: string;
  year?: string;
  sport: string;
  position: string;
  skillLevel: string;
  sportsCoached: string[];
  yearsExperience: string;
  certifications: string;
  coachingPhilosophy: string;
  hourlyRate: number | null;
  averageRating: number;
  ratingCount: number;
  isOnline: boolean;
  lastSeen: string;
  hudlUrl: string;
  instagramUrl: string;
  twitterUrl: string;
  linkedinUrl: string;
  rosterUrl: string;
  visibilityMode: 'everyone' | 'filtered';
  allowedLevels: string[];
  allowedSports: string[];
  searchRadius: number;
  verificationStatus?: 'pending' | 'approved' | 'rejected';
}

export interface Session {
  _id: string;
  postedBy: User;
  sport: string;
  position: string;
  posterRole: string;
  partnerRole: string;
  title: string;
  date: string;
  time: string;
  duration: string;
  location: string;
  goals: string;
  notes: string;
  equipment: string[];
  skillLevelRequired: string;
  status: 'open' | 'confirmed' | 'completed' | 'cancelled';
  partner: User | null;
  pendingPartners?: User[];
  additionalPartners?: User[];
  sessionType: 'need' | 'clinic';
  isTraveler: boolean;
  dateWindowStart?: string | null;
  dateWindowEnd?: string | null;
  createdAt: string;
  pendingChange?: {
    date: string;
    time: string;
    location: string;
    duration: string;
    changedFields: string[];
    proposedBy: string;
    proposedAt: string;
  } | null;
  expiresAt?: string | null;
}

export interface Connection {
  _id: string;
  connectionId: string;
  user: User;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface Message {
  _id: string;
  sender: string;
  recipient: string;
  text: string;
  read: boolean;
  type?: 'user' | 'system';
  sessionId?: string;
  createdAt: string;
  likes?: string[];
}

export interface Post {
  _id: string;
  author: User;
  type: 'session_completion' | 'thought' | 'article' | 'photo';
  content: string;
  sport: string;
  session: Session | null;
  sessionPartner: User | null;
  sessionSummary: string;
  sharedUrl: string;
  articleTitle: string;
  imageUrl: string;
  likes: string[];
  comments: Array<{ _id: string; author: User; text: string; createdAt: string }>;
  createdAt: string;
}

export interface StoredNotification {
  _id: string;
  type: 'roster_request' | 'roster_accepted' | 'session_accepted' | 'message_new';
  data: Record<string, any>;
  read: boolean;
  createdAt: string;
}

export interface Rating {
  _id: string;
  rater: User;
  ratee: User;
  session: Session | null;
  overallRating: number;
  categories: {
    skillLevel: number | null;
    punctuality: number | null;
    communication: number | null;
    attitude: number | null;
  };
  wouldTrainAgain: boolean | null;
  feedback: string;
  sport: string;
  createdAt: string;
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
  _attempt = 1
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  } catch {
    // Network failure (cold-start, no connection) — retry once after 3 s
    if (_attempt < 2) {
      await new Promise(r => setTimeout(r, 3000));
      return request<T>(path, options, token, 2);
    }
    throw new Error('Could not reach the server. Please check your connection and try again.');
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || `Request failed: ${res.status}`);
  }
  return data as T;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const auth = {
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (body: Record<string, unknown>) =>
    request<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getMe: (token: string) =>
    request<{ user: User }>('/api/auth/me', {}, token),

  logout: (token: string) =>
    request<void>('/api/auth/logout', { method: 'POST' }, token),

  googleLogin: (idToken: string) =>
    request<{ token: string; user: User; isNewUser: boolean }>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    }),

  appleLogin: (idToken: string, name?: string, email?: string) =>
    request<{ token: string; user: User; isNewUser: boolean }>('/api/auth/apple', {
      method: 'POST',
      body: JSON.stringify({ idToken, name, email }),
    }),

  changePassword: (token: string, currentPassword: string, newPassword: string) =>
    request<{ message: string }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }, token),

  deleteAccount: (token: string) =>
    request<{ message: string }>('/api/auth/account', { method: 'DELETE' }, token),

  forgotPassword: (email: string) =>
    request<{ message: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  reportPost: (token: string, postId: string, reason?: string) =>
    request<{ message: string }>(`/api/posts/${postId}/report`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }, token),
};

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = {
  search: (
    token: string,
    params: { search?: string; sport?: string; skillLevel?: string; role?: string; location?: string; page?: number; limit?: number }
  ) => {
    const q = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => [k, String(v)])
    ).toString();
    return request<{ users: User[]; total: number; page: number; pages: number }>(
      `/api/users${q ? `?${q}` : ''}`,
      {},
      token
    );
  },

  getById: (token: string, id: string) =>
    request<{ user: User }>(`/api/users/${id}`, {}, token),

  updateProfile: (token: string, body: Partial<User>) =>
    request<{ user: User }>('/api/users/profile', {
      method: 'PUT',
      body: JSON.stringify(body),
    }, token),

  blockUser: (token: string, userId: string) =>
    request<{ message: string }>(`/api/users/${userId}/block`, { method: 'POST' }, token),

  unblockUser: (token: string, userId: string) =>
    request<{ message: string }>(`/api/users/${userId}/block`, { method: 'DELETE' }, token),

  reportUser: (token: string, userId: string, reason?: string) =>
    request<{ message: string }>(`/api/users/${userId}/report`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }, token),

  uploadAvatar: async (token: string, file: File): Promise<{ user: User }> => {
    const form = new FormData();
    form.append('avatar', file);
    const res = await fetch(`${BASE_URL}/api/users/profile`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || `Upload failed: ${res.status}`);
    return data as { user: User };
  },

};

// ─── Sessions ─────────────────────────────────────────────────────────────────

export const sessions = {
  getAvailable: (
    token: string,
    params: { sport?: string; skillLevel?: string; location?: string; sort?: string; page?: number; limit?: number } = {}
  ) => {
    const q = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => [k, String(v)])
    ).toString();
    return request<{ sessions: Session[]; total: number; page: number; pages: number }>(
      `/api/sessions/available${q ? `?${q}` : ''}`,
      {},
      token
    );
  },

  getMine: (token: string, status?: string) =>
    request<{ sessions: Session[] }>(
      `/api/sessions/my${status ? `?status=${status}` : ''}`,
      {},
      token
    ),

  getExpired: (token: string) =>
    request<{ sessions: Session[] }>('/api/sessions/my/expired', {}, token),

  getById: (token: string, id: string) =>
    request<{ session: Session }>(`/api/sessions/${id}`, {}, token),

  create: (token: string, body: Partial<Session>) =>
    request<{ session: Session }>('/api/sessions', {
      method: 'POST',
      body: JSON.stringify(body),
    }, token),

  update: (token: string, id: string, body: Partial<Session>) =>
    request<{ session: Session }>(`/api/sessions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }, token),

  cancel: (token: string, id: string) =>
    request<{ session: Session }>(`/api/sessions/${id}`, { method: 'DELETE' }, token),

  accept: (token: string, id: string) =>
    request<{ session: Session }>(`/api/sessions/${id}/accept`, { method: 'POST' }, token),

  complete: (token: string, id: string) =>
    request<{ session: Session }>(`/api/sessions/${id}/complete`, { method: 'POST' }, token),

  approveChange: (token: string, id: string) =>
    request<{ session: Session }>(`/api/sessions/${id}/approve-change`, { method: 'POST' }, token),

  declineChange: (token: string, id: string) =>
    request<{ session: Session }>(`/api/sessions/${id}/decline-change`, { method: 'POST' }, token),

  suggestTime: (token: string, id: string, body: { date: string; time?: string }) =>
    request<{ session: Session }>(`/api/sessions/${id}/suggest-time`, {
      method: 'POST', body: JSON.stringify(body),
    }, token),

  approvePartner: (token: string, id: string, partnerId: string) =>
    request<{ session: Session }>(`/api/sessions/${id}/approve-partner`, {
      method: 'POST', body: JSON.stringify({ partnerId }),
    }, token),

  declinePartner: (token: string, id: string, partnerId: string) =>
    request<{ session: Session }>(`/api/sessions/${id}/decline-partner`, {
      method: 'POST', body: JSON.stringify({ partnerId }),
    }, token),

  invite: (token: string, id: string, userIds: string[]) =>
    request<{ session: Session }>(`/api/sessions/${id}/invite`, {
      method: 'POST', body: JSON.stringify({ userIds }),
    }, token),

  withdrawRequest: (token: string, id: string) =>
    request<{ session: Session }>(`/api/sessions/${id}/withdraw`, { method: 'DELETE' }, token),
};

// ─── Connections ──────────────────────────────────────────────────────────────

export const connections = {
  getAll: (token: string) =>
    request<{ connections: Connection[] }>('/api/connections', {}, token),

  getPending: (token: string) =>
    request<{ requests: Connection[] }>('/api/connections/pending', {}, token),

  getStatus: (token: string, userId: string) =>
    request<{ status: 'none' | 'pending' | 'accepted' | 'rejected'; connectionId?: string }>(
      `/api/connections/status/${userId}`,
      {},
      token
    ),

  sendRequest: (token: string, userId: string) =>
    request<{ connection: Connection }>(`/api/connections/request/${userId}`, {
      method: 'POST',
    }, token),

  accept: (token: string, connectionId: string) =>
    request<{ connection: Connection }>(`/api/connections/${connectionId}/accept`, {
      method: 'PUT',
    }, token),

  reject: (token: string, connectionId: string) =>
    request<{ connection: Connection }>(`/api/connections/${connectionId}/reject`, {
      method: 'PUT',
    }, token),

  remove: (token: string, connectionId: string) =>
    request<{ message: string }>(`/api/connections/${connectionId}`, {
      method: 'DELETE',
    }, token),
};

// ─── Messages ────────────────────────────────────────────────────────────────

export const messages = {
  acceptRequest: (token: string, userId: string) =>
    request<{ message: string }>(`/api/messages/requests/${userId}/accept`, { method: 'PUT' }, token),

  declineRequest: (token: string, userId: string) =>
    request<{ message: string }>(`/api/messages/requests/${userId}/decline`, { method: 'PUT' }, token),

  postSessionLink: (token: string, data: { recipientId: string; sessionId: string }) =>
    request<{ message: Message }>('/api/messages/session-link', {
      method: 'POST',
      body: JSON.stringify(data),
    }, token),

  like: (token: string, messageId: string) =>
    request<{ messageId: string; likes: string[] }>(`/api/messages/${messageId}/like`, { method: 'PUT' }, token),

  getInbox: (token: string) =>
    request<{ conversations: { unread: number }[] }>('/api/messages', {}, token),
};

// ─── Ratings ─────────────────────────────────────────────────────────────────

export const ratings = {
  submit: (
    token: string,
    body: {
      rateeId: string;
      overallRating: number;
      sessionId?: string;
      categories?: { skillLevel?: number; punctuality?: number; communication?: number; attitude?: number };
      wouldTrainAgain?: boolean;
      feedback?: string;
      sport?: string;
    }
  ) =>
    request<{ rating: Rating }>('/api/ratings', {
      method: 'POST',
      body: JSON.stringify(body),
    }, token),

  getForUser: (token: string, userId: string) =>
    request<{ ratings: Rating[]; averageRating: number; ratingCount: number }>(
      `/api/ratings/user/${userId}`,
      {},
      token
    ),

  getReceived: (token: string) =>
    request<{ ratings: Rating[] }>('/api/ratings/received', {}, token),

  getGiven: (token: string) =>
    request<{ ratings: Rating[] }>('/api/ratings/given', {}, token),
};

// ─── Posts ────────────────────────────────────────────────────────────────────

export const posts = {
  getFeed: (token: string, params: { sport?: string; type?: string; page?: number } = {}) => {
    const q = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => [k, String(v)])
    ).toString();
    return request<{ posts: Post[]; total: number; page: number; pages: number }>(
      `/api/posts${q ? `?${q}` : ''}`,
      {},
      token
    );
  },

  create: (
    token: string,
    body: { type: string; content?: string; sport?: string; sessionId?: string; sessionPartnerId?: string; sessionSummary?: string; sharedUrl?: string; articleTitle?: string; imageUrl?: string }
  ) =>
    request<{ post: Post }>('/api/posts', {
      method: 'POST',
      body: JSON.stringify(body),
    }, token),

  uploadImage: async (token: string, blob: Blob): Promise<string> => {
    const formData = new FormData();
    formData.append('image', blob, 'photo.jpg');
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    const res = await fetch(`${BASE_URL}/api/posts/upload-image`, { method: 'POST', headers, body: formData });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any).message || 'Upload failed'); }
    const data = await res.json();
    return data.url as string;
  },

  toggleLike: (token: string, postId: string) =>
    request<{ liked: boolean; likeCount: number }>(`/api/posts/${postId}/like`, {
      method: 'POST',
    }, token),

  addComment: (token: string, postId: string, text: string) =>
    request<{ comment: Post['comments'][0] }>(`/api/posts/${postId}/comment`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }, token),

  delete: (token: string, postId: string) =>
    request<{ message: string }>(`/api/posts/${postId}`, {
      method: 'DELETE',
    }, token),
};

export const notifications = {
  getAll: (token: string) =>
    request<{ notifications: StoredNotification[] }>('/api/notifications', {}, token),

  markAllRead: (token: string) =>
    request<{ message: string }>('/api/notifications/read-all', { method: 'PATCH' }, token),

  markRead: (token: string, id: string) =>
    request<{ message: string }>(`/api/notifications/${id}/read`, { method: 'PATCH' }, token),
};
