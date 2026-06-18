import axios from 'axios';
import { getSession } from 'next-auth/react';
import { useAuthStore } from '@/store/authStore';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  timeout: 30000,
});

// next-auth getSession()은 매 호출마다 네트워크 요청을 발생시키므로 60초 캐시 적용
let _sessionCache: { token: string | null; ts: number } | null = null;

api.interceptors.request.use(async (config) => {
  // Zustand 스토어 토큰 우선 (mock 로그인, 방금 로그인한 경우 — 네트워크 없음)
  const storeToken = useAuthStore.getState().accessToken;
  if (storeToken) {
    config.headers.Authorization = `Bearer ${storeToken}`;
    return config;
  }
  // 스토어에 없으면 next-auth 세션 사용 (60초 캐시)
  const now = Date.now();
  if (!_sessionCache || now - _sessionCache.ts > 60_000) {
    try {
      const s = await getSession();
      _sessionCache = { token: (s?.accessToken as string) ?? null, ts: now };
    } catch {
      _sessionCache = { token: null, ts: now };
    }
  }
  if (_sessionCache.token) {
    config.headers.Authorization = `Bearer ${_sessionCache.token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ======= Auth API =======
export const authApi = {
  googleLogin: (code: string, redirectUri: string) =>
    api.post('/auth/google', { code, redirect_uri: redirectUri }),
  logout: () => api.post('/auth/logout'),
};

// ======= User API =======
export const userApi = {
  getMe: () => api.get('/users/me'),
  updateMe: (data: Record<string, unknown>) => api.patch('/users/me', data),
  getDailySummary: (date?: string) =>
    api.get('/users/me/daily-summary', { params: { date } }),
};

// ======= Meal API =======
export const mealApi = {
  create: (formData: FormData) =>
    api.post('/meals', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  updateFoods: (mealId: string, detectedFoods: unknown[]) =>
    api.patch(`/meals/${mealId}/foods`, { detected_foods: detectedFoods }),
  getByDate: (date: string) => api.get('/meals', { params: { date } }),
  getById: (mealId: string) => api.get(`/meals/${mealId}`),
  delete: (mealId: string) => api.delete(`/meals/${mealId}`),
  addReaction: (mealId: string, type: string) =>
    api.post(`/meals/${mealId}/reactions`, { type }),
  getComments: (mealId: string) => api.get(`/meals/${mealId}/comments`),
  addComment: (mealId: string, content: string) =>
    api.post(`/meals/${mealId}/comments`, { content }),
  deleteComment: (mealId: string, commentId: string) =>
    api.delete(`/meals/${mealId}/comments/${commentId}`),
};

// ======= Group API =======
export const groupApi = {
  create: (groupName: string) => api.post('/groups', { group_name: groupName }),
  join: (groupCode: string) => api.post('/groups/join', { group_code: groupCode }),
  getMyGroups: () => api.get('/groups'),
  getById: (groupId: string) => api.get(`/groups/${groupId}`),
  getFeed: (groupId: string, date?: string, page = 1) =>
    api.get(`/groups/${groupId}/feed`, { params: { date, page } }),
  getCompare: (groupId: string, date?: string) =>
    api.get(`/groups/${groupId}/compare`, { params: { date } }),
  leave: (groupId: string) => api.delete(`/groups/${groupId}/leave`),
};

// ======= AI API =======
export const aiApi = {
  analyze: (formData: FormData) =>
    api.post('/ai/analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  searchFoods: (q: string) => api.get('/ai/foods/search', { params: { q } }),
};
