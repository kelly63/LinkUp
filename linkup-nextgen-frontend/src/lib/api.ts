const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function avatarThumb(url: string | null | undefined, size = 80): string | null {
  if (!url) return null;
  if (!url.includes('res.cloudinary.com')) return url;
  return url.replace('/upload/', `/upload/w_${size},h_${size},c_fill,g_face/`);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Child {
  _id: string;
  name: string;
  age: number | null;
  sports: string[];
  skillLevel: string;
  notes: string;
}

export interface Coach {
  _id: string;
  name: string;
  avatar: string | null;
  location: string;
  bio: string;
  sportsCoached: string[];
  ageGroupsCoached: string[];
  yearsExperience: string;
  certifications: string;
  coachingPhilosophy: string;
  hourlyRate: number | null;
  averageRating: number;
  ratingCount: number;
  isOnline: boolean;
  role: 'coach';
  documents: MediaItem[];
}

export interface Parent {
  _id: string;
  name: string;
  email: string;
  role: 'parent';
  avatar: string | null;
  location: string;
  children: Child[];
}

export interface Clinic {
  _id: string;
  postedBy: Coach;
  title: string;
  sport: string;
  date: string;
  dateWindowStart?: string;
  dateWindowEnd?: string;
  time: string;
  duration: string;
  location: string;
  goals: string;
  notes: string;
  skillLevelRequired: string;
  sessionType: 'clinic';
  isTraveler: boolean;
  maxParticipants?: number;
  pricePerAthlete?: number;
  status: string;
  createdAt: string;
}

export interface MediaItem {
  _id: string;
  url: string;
  publicId: string;
  type: 'image' | 'pdf';
  name: string;
}

export interface Message {
  _id: string;
  sender: string;
  recipient: string;
  text: string;
  read: boolean;
  createdAt: string;
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

async function request<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Request failed: ${res.status}`);
  return data as T;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const auth = {
  login: (email: string, password: string, role: string) =>
    request<{ token: string; user: Parent | Coach }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, role }),
    }),

  register: (body: Record<string, unknown>) =>
    request<{ token: string; user: Parent | Coach }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getMe: (token: string) =>
    request<{ user: Parent | Coach }>('/api/auth/me', {}, token),

  logout: (token: string) =>
    request<void>('/api/auth/logout', { method: 'POST' }, token),

  changePassword: (token: string, currentPassword: string, newPassword: string) =>
    request<{ message: string }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }, token),
};

// ─── Children ────────────────────────────────────────────────────────────────

export const children = {
  getAll: (token: string) =>
    request<{ children: Child[] }>('/api/nextgen/children', {}, token),

  add: (token: string, child: Omit<Child, '_id'>) =>
    request<{ children: Child[] }>('/api/nextgen/children', {
      method: 'POST',
      body: JSON.stringify(child),
    }, token),

  update: (token: string, childId: string, updates: Partial<Omit<Child, '_id'>>) =>
    request<{ children: Child[] }>(`/api/nextgen/children/${childId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }, token),

  remove: (token: string, childId: string) =>
    request<{ children: Child[] }>(`/api/nextgen/children/${childId}`, {
      method: 'DELETE',
    }, token),
};

// ─── Coaches ──────────────────────────────────────────────────────────────────

export const coaches = {
  search: (token: string, params: { sport?: string; ageGroup?: string; maxRate?: number; search?: string; page?: number } = {}) => {
    const q = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => [k, String(v)])
    ).toString();
    return request<{ coaches: Coach[]; total: number; page: number; pages: number }>(
      `/api/nextgen/coaches${q ? `?${q}` : ''}`, {}, token
    );
  },

  getById: (token: string, id: string) =>
    request<{ user: Coach }>(`/api/users/${id}`, {}, token),

  uploadAvatar: async (token: string, file: File): Promise<{ user: Parent | Coach }> => {
    const form = new FormData();
    form.append('avatar', file);
    const res = await fetch(`${BASE_URL}/api/users/profile`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Upload failed');
    return data;
  },

  updateProfile: (token: string, body: Partial<Coach>) =>
    request<{ user: Coach }>('/api/users/profile', {
      method: 'PUT',
      body: JSON.stringify(body),
    }, token),
};

// ─── Parent profile ───────────────────────────────────────────────────────────

export const parentProfile = {
  update: (token: string, body: Partial<Parent>) =>
    request<{ user: Parent }>('/api/users/profile', {
      method: 'PUT',
      body: JSON.stringify(body),
    }, token),

  uploadAvatar: async (token: string, file: File): Promise<{ user: Parent }> => {
    const form = new FormData();
    form.append('avatar', file);
    const res = await fetch(`${BASE_URL}/api/users/profile`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Upload failed');
    return data;
  },
};

// ─── Clinics ─────────────────────────────────────────────────────────────────

export const clinics = {
  getAvailable: (token: string, params: { sport?: string; ageGroup?: string; page?: number } = {}) => {
    const q = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => [k, String(v)])
    ).toString();
    return request<{ sessions: Clinic[]; total: number; page: number; pages: number }>(
      `/api/sessions/available?sessionType=clinic&source=nextgen${q ? `&${q}` : ''}`, {}, token
    );
  },

  create: (token: string, body: Partial<Clinic> & { sessionType: 'clinic' }) =>
    request<{ session: Clinic }>('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ ...body, source: 'nextgen' }),
    }, token),
};

// ─── Uploads ─────────────────────────────────────────────────────────────────

export const uploads = {
  addSessionMedia: async (token: string, sessionId: string, file: File, name?: string): Promise<{ media: MediaItem[] }> => {
    const form = new FormData();
    form.append('file', file);
    if (name) form.append('name', name);
    const res = await fetch(`${BASE_URL}/api/uploads/sessions/${sessionId}/media`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Upload failed');
    return data;
  },

  removeSessionMedia: (token: string, sessionId: string, mediaId: string) =>
    request<{ media: MediaItem[] }>(`/api/uploads/sessions/${sessionId}/media/${mediaId}`, { method: 'DELETE' }, token),

  addDocument: async (token: string, file: File, name?: string): Promise<{ documents: MediaItem[] }> => {
    const form = new FormData();
    form.append('file', file);
    if (name) form.append('name', name);
    const res = await fetch(`${BASE_URL}/api/uploads/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Upload failed');
    return data;
  },

  removeDocument: (token: string, docId: string) =>
    request<{ documents: MediaItem[] }>(`/api/uploads/documents/${docId}`, { method: 'DELETE' }, token),
};

// ─── Messages ────────────────────────────────────────────────────────────────

export const messages = {
  getConversations: (token: string) =>
    request<{ conversations: Array<{ user: Coach | Parent; lastMessage: Message; unread: number }> }>(
      '/api/messages/conversations', {}, token
    ),

  getThread: (token: string, userId: string) =>
    request<{ messages: Message[] }>(`/api/messages/${userId}`, {}, token),

  send: (token: string, recipientId: string, text: string) =>
    request<{ message: Message }>('/api/messages', {
      method: 'POST',
      body: JSON.stringify({ recipientId, text }),
    }, token),
};
