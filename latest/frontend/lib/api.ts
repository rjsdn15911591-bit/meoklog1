import axios from 'axios';
import { getSession } from 'next-auth/react';
import { useAuthStore } from '@/store/authStore';
import { useDevStore } from '@/store/devStore';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  timeout: 30000,
});

// ── snake_case ↔ camelCase 변환 유틸 ──────────────────────────────────────
function toCamel(s: string) {
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}
function toSnake(s: string) {
  return s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}
function deepTransform(obj: unknown, fn: (k: string) => string): unknown {
  if (Array.isArray(obj)) return obj.map((v) => deepTransform(v, fn));
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        fn(k),
        deepTransform(v, fn),
      ])
    );
  }
  return obj;
}
// ─────────────────────────────────────────────────────────────────────────

// next-auth getSession()은 매 호출마다 네트워크 요청을 발생시키므로 60초 캐시 적용
let _sessionCache: { token: string | null; ts: number } | null = null;

api.interceptors.request.use(async (config) => {
  if (useDevStore.getState().devMode) {
    (config as typeof config & { _devStart?: number })._devStart = Date.now();
  }
  // Zustand 스토어 토큰 우선 (mock 로그인, 방금 로그인한 경우 — 네트워크 없음)
  const storeToken = useAuthStore.getState().accessToken;
  if (storeToken) {
    config.headers.Authorization = `Bearer ${storeToken}`;
  } else {
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
    if (_sessionCache?.token) {
      config.headers.Authorization = `Bearer ${_sessionCache.token}`;
    }
  }
  // 요청 바디 camelCase → snake_case (FormData 제외)
  if (config.data && !(config.data instanceof FormData) && typeof config.data === 'object') {
    config.data = deepTransform(config.data, toSnake);
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    if (useDevStore.getState().devMode) {
      const start = (response.config as typeof response.config & { _devStart?: number })._devStart;
      useDevStore.getState().pushLog({
        method: (response.config.method ?? 'GET').toUpperCase(),
        endpoint: response.config.url ?? '',
        status: response.status,
        durationMs: start != null ? Date.now() - start : null,
        ok: true,
      });
    }
    // 응답 바디 snake_case → camelCase
    if (response.data && typeof response.data === 'object') {
      response.data = deepTransform(response.data, toCamel);
    }
    return response;
  },
  async (error) => {
    if (useDevStore.getState().devMode && error.config) {
      const cfg = error.config as typeof error.config & { _devStart?: number };
      useDevStore.getState().pushLog({
        method: (cfg.method ?? 'GET').toUpperCase(),
        endpoint: cfg.url ?? '',
        status: error.response?.status ?? null,
        durationMs: cfg._devStart != null ? Date.now() - cfg._devStart : null,
        ok: false,
        error: (() => {
          const detail = error.response?.data?.detail;
          if (detail == null) return error.response?.data?.error?.message ?? error.message;
          if (typeof detail === 'string') return detail;
          return JSON.stringify(detail);
        })(),
      });
    }
    if (
      error.response?.status === 401 &&
      typeof window !== 'undefined' &&
      !window.location.pathname.startsWith('/login') &&
      !window.location.pathname.startsWith('/api/auth')
    ) {
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
  updateFoods: (mealId: string, detectedFoods: unknown[], groupIds?: string[], caption?: string) =>
    api.patch(`/meals/${mealId}/foods`, {
      detected_foods: detectedFoods,
      ...(groupIds !== undefined && { group_ids: groupIds }),
      ...(caption !== undefined && { caption }),
    }),
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

// ======= Food API =======
export const foodApi = {
  search: (q: string, excludeUser = false) =>
    api.get('/foods/search', { params: { q, exclude_user: excludeUser } }),
  getMyFoods: () => api.get('/foods/my'),
  create: (data: {
    food_name: string;
    brand_name?: string;
    serving_size: number;
    serving_unit: string;
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
    is_public: boolean;
  }) => api.post('/foods', data),
  incrementUse: (foodId: string) => api.post(`/foods/${foodId}/use`),
};
