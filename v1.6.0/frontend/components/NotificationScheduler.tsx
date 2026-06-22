'use client';

import { useEffect } from 'react';

const MEAL_LABELS: Record<string, string> = {
  breakfast: '아침 식사',
  lunch:     '점심 식사',
  dinner:    '저녁 식사',
  snack:     '간식',
};

export function NotificationScheduler() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    let raw: string | null = null;
    try { raw = localStorage.getItem('meal-notifications'); } catch {}
    if (!raw) return;

    let settings: Record<string, { enabled: boolean; time: string }> = {};
    try { settings = JSON.parse(raw); } catch { return; }

    const now = new Date();
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    for (const [meal, cfg] of Object.entries(settings)) {
      if (!cfg.enabled || !cfg.time) continue;
      const [h, m] = cfg.time.split(':').map(Number);
      const target = new Date();
      target.setHours(h, m, 0, 0);
      if (target <= now) continue;

      const delay = target.getTime() - now.getTime();
      const t = setTimeout(() => {
        new Notification('먹로그 🍽️', {
          body: `${MEAL_LABELS[meal] ?? meal} 시간이에요! 오늘 식사를 기록해보세요.`,
          icon: '/favicon.ico',
        });
      }, delay);
      timeouts.push(t);
    }

    const onStorage = () => {
      timeouts.forEach(clearTimeout);
    };
    window.addEventListener('storage', onStorage);

    return () => {
      timeouts.forEach(clearTimeout);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return null;
}
