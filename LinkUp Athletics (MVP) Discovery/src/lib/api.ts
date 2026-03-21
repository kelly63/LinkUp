const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'athlete' | 'coach';
  avatar: string | null;
  bio: string;
  location: string;
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
  sessionType: 'need' | 'clinic';
  createdAt: string;
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
  createdAt: string;
}

export interface Post {
  _id: string;
  author: User;
  type: 'session_completion' | 'thought' | 'article';
  content: string;
  sport: string;
  session: Session | null;
  sessionPartner: User | null;
  sessionSummary: string;
  sharedUrl: string;
  articleTitle: string;
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
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
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

  changePassword: (token: string, currentPassword: string, newPassword: string) =>
    request<{ message: string }>('/api/users/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    }, token),
};

// ─── Sessions ─────────────────────────────────────────────────────────────────

export const sessions = {
  getAvailable: (
    token: string,
    params: { sport?: string; skillLevel?: string; page?: number; limit?: number } = {}
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
    body: { type: string; content?: string; sport?: string; sessionId?: string; sessionPartnerId?: string; sessionSummary?: string }
  ) =>
    request<{ post: Post }>('/api/posts', {
      method: 'POST',
      body: JSON.stringify(body),
    }, token),

  toggleLike: (token: string, postId: string) =>
    request<{ liked: boolean; likeCount: number }>(`/api/posts/${postId}/like`, {
      method: 'POST',
    }, token),

  addComment: (token: string, postId: string, text: string) =>
    request<{ comment: Post['comments'][0] }>(`/api/posts/${postId}/comment`, {
      method: 'POST',
      body: JSON.stringify({ text }),
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
