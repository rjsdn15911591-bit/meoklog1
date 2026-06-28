'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Footprints, MapPin, TrendingUp, Trophy, Play, Square, Flame, Route, Target, Pencil, Check, X } from 'lucide-react';
import { subDays, format } from 'date-fns';
import { cn } from '@/lib/utils';

const WalkingMap = dynamic(() => import('./WalkingMap'), { ssr: false });

// ── 상수 ────────────────────────────────────────────────────────────────────
const DEFAULT_stepGoal  = 10_000;
const GOAL_STORAGE_KEY   = 'muklog-step-goal';
const STRIDE_M           = 0.75;
const CAL_PER_STEP       = 0.04;

function loadGoal(): number {
  try {
    const v = parseInt(localStorage.getItem(GOAL_STORAGE_KEY) ?? '', 10);
    return v >= 100 ? v : DEFAULT_stepGoal;
  } catch { return DEFAULT_stepGoal; }
}
function saveGoal(v: number) {
  try { localStorage.setItem(GOAL_STORAGE_KEY, String(v)); } catch {}
}

// GPS 필터 파라미터
const GPS_MIN_ACCURACY_M = 30;   // 정확도가 30m 이하인 포인트만 사용
const GPS_MIN_DIST_M     = 10;   // 이전 점과의 최소 거리 (m)
const GPS_MIN_INTERVAL_MS = 8_000; // 포인트 간 최소 시간 간격 (8초)

// Haversine 공식 – 두 위경도 간 거리(m)
function haversineM(a: [number, number], b: [number, number]): number {
  const R = 6_371_000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const sinA = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(sinA), Math.sqrt(1 - sinA));
}

type DayEntry = { steps: number; route: [number, number][] };

// ── localStorage 헬퍼 ──────────────────────────────────────────────────────
function storageKey(date: Date) {
  return `muklog-steps-${format(date, 'yyyy-MM-dd')}`;
}

function loadDay(date: Date): DayEntry {
  try {
    const raw = localStorage.getItem(storageKey(date));
    if (!raw) return { steps: 0, route: [] };
    return JSON.parse(raw) as DayEntry;
  } catch { return { steps: 0, route: [] }; }
}

function saveDay(date: Date, entry: DayEntry) {
  try { localStorage.setItem(storageKey(date), JSON.stringify(entry)); } catch {}
}

// ── ExerciseAnalysis ────────────────────────────────────────────────────────
export function ExerciseAnalysis({ weight = 70 }: { weight?: number }) {
  const today = useRef(new Date());

  const [steps, setSteps]           = useState(0);
  const [route, setRoute]           = useState<[number, number][]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [sensorError, setSensorError] = useState<string | null>(null);
  const [weeklySteps, setWeeklySteps] = useState<{ day: string; steps: number }[]>([]);
  const [streak, setStreak]         = useState(0);
  const [stepGoal, setStepGoal]     = useState(DEFAULT_stepGoal);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput]   = useState('');

  // Pedometer refs (avoid stale closures in event handler)
  const stepsRef      = useRef(0);
  const lastStepMs    = useRef(0);
  const smoothMag     = useRef(9.8);  // start near gravity magnitude
  const prevAbove     = useRef(false);
  const gpsWatchId    = useRef<number | null>(null);
  const routeRef      = useRef<[number, number][]>([]);
  const lastGpsMs     = useRef(0);    // GPS 마지막 포인트 기록 시간

  // ── Load persisted data on mount ──────────────────────────────────────
  useEffect(() => {
    const goal = loadGoal();
    setStepGoal(goal);

    const { steps: saved, route: savedRoute } = loadDay(today.current);
    stepsRef.current = saved;
    routeRef.current = savedRoute;
    setSteps(saved);
    setRoute(savedRoute);

    // Build last 7 days
    const DAY_KO = ['일', '월', '화', '수', '목', '금', '토'];
    const week = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(today.current, 6 - i);
      return { day: DAY_KO[d.getDay()], steps: loadDay(d).steps };
    });
    setWeeklySteps(week);

    // Streak: consecutive days reaching the saved goal
    let s = 0;
    for (let i = 1; i <= 30; i++) {
      const d = subDays(today.current, i);
      if (loadDay(d).steps >= goal) s++;
      else break;
    }
    setStreak(s);
  }, []);

  // ── Step detection ────────────────────────────────────────────────────
  const onMotion = useCallback((e: DeviceMotionEvent) => {
    const acc = e.accelerationIncludingGravity;
    if (!acc) return;
    const x = acc.x ?? 0, y = acc.y ?? 0, z = acc.z ?? 0;
    const mag = Math.sqrt(x * x + y * y + z * z);

    // Exponential moving average (low-pass filter)
    smoothMag.current = smoothMag.current * 0.75 + mag * 0.25;

    const THRESHOLD = 11.5; // m/s²
    const isAbove = smoothMag.current > THRESHOLD;
    const now = Date.now();

    // Rising-edge detection + min 350ms between steps
    if (isAbove && !prevAbove.current && now - lastStepMs.current > 350) {
      lastStepMs.current = now;
      const next = stepsRef.current + 1;
      stepsRef.current = next;
      setSteps(next);

      // Persist every 10 steps to reduce I/O
      if (next % 10 === 0) {
        saveDay(today.current, { steps: next, route: routeRef.current });
        setWeeklySteps(prev => {
          const copy = [...prev];
          copy[6] = { ...copy[6], steps: next };
          return copy;
        });
      }
    }
    prevAbove.current = isAbove;
  }, []);

  // ── Start / Stop tracking ─────────────────────────────────────────────
  const startTracking = async () => {
    setSensorError(null);

    // iOS 13+ requires explicit permission for DeviceMotionEvent
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dme = DeviceMotionEvent as any;
    if (typeof dme?.requestPermission === 'function') {
      const perm: string = await dme.requestPermission().catch(() => 'denied');
      if (perm !== 'granted') {
        setSensorError('동작 센서 권한이 필요해요. 설정 → Safari → 동작 및 방향 접근 허용');
        return;
      }
    } else if (typeof DeviceMotionEvent === 'undefined') {
      setSensorError('이 기기는 동작 센서를 지원하지 않아요.');
      return;
    }

    window.addEventListener('devicemotion', onMotion, { passive: true });

    // GPS watch — 3중 필터: 정확도 · 최소 거리 · 최소 시간 간격
    if (navigator.geolocation) {
      gpsWatchId.current = navigator.geolocation.watchPosition(
        (pos) => {
          const now = Date.now();

          // ① 정확도 필터 (30m 초과 시 무시)
          if (pos.coords.accuracy > GPS_MIN_ACCURACY_M) return;

          // ② 시간 간격 필터 (8초 미만이면 무시)
          if (now - lastGpsMs.current < GPS_MIN_INTERVAL_MS) return;

          const pt: [number, number] = [pos.coords.latitude, pos.coords.longitude];

          // ③ 최소 이동 거리 필터 (이전 점과 10m 미만이면 무시)
          const prev = routeRef.current[routeRef.current.length - 1];
          if (prev && haversineM(prev, pt) < GPS_MIN_DIST_M) return;

          lastGpsMs.current = now;
          routeRef.current = [...routeRef.current, pt];
          setRoute([...routeRef.current]);
          saveDay(today.current, { steps: stepsRef.current, route: routeRef.current });
        },
        null,
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
      );
    }

    setIsTracking(true);
  };

  const stopTracking = useCallback(() => {
    window.removeEventListener('devicemotion', onMotion);
    if (gpsWatchId.current !== null) {
      navigator.geolocation.clearWatch(gpsWatchId.current);
      gpsWatchId.current = null;
    }
    // Final save
    saveDay(today.current, { steps: stepsRef.current, route: routeRef.current });
    setIsTracking(false);
  }, [onMotion]);

  // Cleanup on unmount
  useEffect(() => () => { if (isTracking) stopTracking(); }, [isTracking, stopTracking]);

  // ── Derived values ────────────────────────────────────────────────────
  const distKm      = (steps * STRIDE_M) / 1000;
  const calories    = Math.round(steps * CAL_PER_STEP * (weight / 70));
  const goalPct     = Math.min(100, Math.round((steps / stepGoal) * 100));
  const weekTotal   = weeklySteps.reduce((s, d) => s + d.steps, 0);
  const weekGoal    = stepGoal * 7;
  const weekPct     = Math.min(100, Math.round((weekTotal / weekGoal) * 100));
  const maxBarSteps = Math.max(...weeklySteps.map(d => d.steps), stepGoal);
  const goalColor   = goalPct >= 100 ? '#6BAF8B' : goalPct >= 50 ? '#5058F0' : '#E6A820';
  const weekColor   = weekPct >= 100 ? '#6BAF8B' : weekPct >= 50 ? '#5058F0' : '#E6A820';
  const achievedDays  = weeklySteps.filter(d => d.steps >= stepGoal).length;
  const activeDays    = weeklySteps.filter(d => d.steps > 0).length;
  const weekAvg       = activeDays > 0 ? Math.round(weekTotal / activeDays) : 0;

  const confirmGoal = () => {
    const v = parseInt(goalInput.replace(/[^\d]/g, ''), 10);
    if (v >= 100 && v <= 200_000) {
      saveGoal(v);
      setStepGoal(v);
    }
    setEditingGoal(false);
  };

  return (
    <div className="space-y-3">
      {/* ── 걸음 수 카드 ─────────────────────────────────────── */}
      <div className="bg-surface-card rounded-xl border border-hairline p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Footprints size={17} className="text-cobalt" />
            <span className="font-kedu font-bold text-sm text-ink">오늘 걸음 수</span>
            {streak > 0 && (
              <span className="font-kedu text-[10px] bg-ochre/10 text-ochre border border-ochre/30 px-1.5 py-0.5 rounded-pill ml-1">
                🔥 {streak}일 연속
              </span>
            )}
          </div>
          <button
            onClick={isTracking ? stopTracking : startTracking}
            className={cn(
              'flex items-center gap-1 px-3 py-1.5 rounded-lg font-kedu font-bold text-xs transition-all active:scale-95',
              isTracking
                ? 'bg-coral/10 text-coral border border-coral/30'
                : 'bg-cobalt text-white',
            )}
          >
            {isTracking
              ? <><Square size={11} fill="currentColor" />중지</>
              : <><Play  size={11} fill="currentColor" />추적 시작</>}
          </button>
        </div>

        {/* 걸음 수 숫자 */}
        <div className="flex items-end gap-1.5 mb-3">
          <span className="font-myeong font-bold text-5xl text-cobalt leading-none">
            {steps.toLocaleString()}
          </span>
          <div className="pb-1">
            <span className="font-kedu text-sm text-muted">걸음</span>
          </div>

          {/* 목표 — 인라인 수정 */}
          <div className="ml-auto pb-1">
            {editingGoal ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  inputMode="numeric"
                  value={goalInput}
                  onChange={e => setGoalInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') confirmGoal();
                    if (e.key === 'Escape') setEditingGoal(false);
                  }}
                  className="w-20 text-right text-xs font-myeong border border-cobalt rounded-lg px-2 py-1 outline-none"
                  autoFocus
                />
                <button
                  onClick={confirmGoal}
                  className="p-1 rounded-md bg-cobalt/10 text-cobalt hover:bg-cobalt/20 transition-colors"
                >
                  <Check size={12} strokeWidth={2.5} />
                </button>
                <button
                  onClick={() => setEditingGoal(false)}
                  className="p-1 rounded-md bg-hairline text-muted hover:bg-surface-soft transition-colors"
                >
                  <X size={12} strokeWidth={2.5} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setGoalInput(String(stepGoal)); setEditingGoal(true); }}
                className="flex items-center gap-1 text-muted hover:text-cobalt transition-colors group"
              >
                <span className="font-kedu text-xs">/ 목표 {stepGoal.toLocaleString()}</span>
                <Pencil size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
          </div>
        </div>

        {/* 프로그레스 바 */}
        <div className="bg-hairline rounded-full h-3 mb-1.5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${goalPct}%`, background: goalColor }}
          />
        </div>
        <div className="flex justify-between text-xs mb-4">
          <span className="font-myeong" style={{ color: goalColor }}>{goalPct}% 달성</span>
          {steps < stepGoal && (
            <span className="font-myeong text-muted">
              {(stepGoal - steps).toLocaleString()}걸음 남음
            </span>
          )}
          {steps >= stepGoal && (
            <span className="font-kedu text-sage font-bold">목표 달성! 🎉</span>
          )}
        </div>

        {/* 3개 통계 */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-hairline">
          {[
            { icon: <Route size={15} className="text-cobalt" />,  label: '거리',   value: `${distKm.toFixed(2)}km` },
            { icon: <Flame size={15} className="text-coral" />,   label: '소모',   value: `${calories}kcal` },
            { icon: <Target size={15} className="text-sage" />,   label: '목표',   value: `${stepGoal.toLocaleString()}걸음` },
          ].map(({ icon, label, value }) => (
            <div key={label} className="flex flex-col items-center gap-1">
              {icon}
              <span className="font-myeong font-bold text-sm text-ink">{value}</span>
              <span className="font-kedu text-[10px] text-muted">{label}</span>
            </div>
          ))}
        </div>

        {/* 상태 메시지 */}
        {sensorError && (
          <p className="font-kedu text-xs text-coral mt-2 pt-2 border-t border-hairline">{sensorError}</p>
        )}
        {isTracking && !sensorError && (
          <p className="font-kedu text-xs text-sage mt-2 pt-2 border-t border-hairline flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sage animate-pulse inline-block" />
            걸음 추적 + GPS 경로 기록 중
          </p>
        )}
      </div>

      {/* ── GPS 지도 ──────────────────────────────────────────── */}
      <div className="bg-surface-card rounded-xl border border-hairline overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-hairline">
          <MapPin size={15} className="text-coral" />
          <span className="font-kedu font-bold text-sm text-ink">오늘의 경로</span>
          {route.length > 0 && (
            <span className="font-kedu text-xs text-muted ml-auto">
              {route.length}개 위치 · {distKm.toFixed(2)}km
            </span>
          )}
        </div>
        <div style={{ height: 280 }}>
          <WalkingMap route={route} isTracking={isTracking} />
        </div>
      </div>

      {/* ── 주간 걸음 수 차트 ─────────────────────────────────── */}
      <div className="bg-surface-card rounded-xl border border-hairline p-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={15} className="text-cobalt" />
          <span className="font-kedu font-bold text-sm text-ink">주간 걸음 수</span>
          <span className="font-kedu text-xs text-muted ml-auto">
            합계 {weekTotal.toLocaleString()}
          </span>
        </div>

        {/* 목표선 라벨 */}
        <div className="relative">
          <div className="flex items-end gap-1 h-28">
            {weeklySteps.map(({ day, steps: s }, i) => {
              const isToday = i === 6;
              const achieved = s >= stepGoal;
              const barH = maxBarSteps > 0 ? (s / maxBarSteps) * 100 : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full">
                  {/* 값 라벨 */}
                  {s > 0 && (
                    <span className="font-kedu text-[9px] text-muted leading-none">
                      {s >= 1000 ? `${(s / 1000).toFixed(1)}k` : s}
                    </span>
                  )}
                  <div className="flex-1 w-full flex items-end">
                    <div
                      className="w-full rounded-t-sm min-h-[2px] transition-all"
                      style={{
                        height: `${Math.max(barH, s > 0 ? 3 : 0)}%`,
                        background: achieved ? '#6BAF8B' : isToday ? '#5058F0' : '#D0D3E0',
                      }}
                    />
                  </div>
                  <span
                    className={cn('font-kedu text-[10px] leading-none',
                      isToday ? 'text-cobalt font-bold' : 'text-muted')}
                  >
                    {day}
                  </span>
                </div>
              );
            })}
          </div>
          {/* 목표 기준선 */}
          <div
            className="absolute left-0 right-0 border-t border-dashed border-sage/50 pointer-events-none"
            style={{ bottom: `calc(${(stepGoal / maxBarSteps) * 112}px + 16px)` }}
          >
            <span className="absolute -top-3.5 right-0 font-kedu text-[9px] text-sage/80 leading-none">
              목표
            </span>
          </div>

          {/* 주간 평균선 */}
          {weekAvg > 0 && (
            <div
              className="absolute left-0 right-0 border-t border-ochre/60 pointer-events-none"
              style={{ bottom: `calc(${(weekAvg / maxBarSteps) * 112}px + 16px)` }}
            >
              <span className="absolute -top-3.5 left-0 font-kedu text-[9px] text-ochre leading-none">
                평균 {weekAvg >= 1000 ? `${(weekAvg / 1000).toFixed(1)}k` : weekAvg}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-3 pt-2 border-t border-hairline">
          <span className="font-kedu text-xs text-muted">
            목표 달성일 <span className="text-sage font-bold">{achievedDays}</span>/7일
          </span>
          <span className="font-kedu text-xs font-bold" style={{ color: weekColor }}>
            주간 {weekPct}% 달성
          </span>
        </div>
      </div>

      {/* ── 주간 성취율 도넛 + 통계 ──────────────────────────── */}
      <div className="bg-surface-card rounded-xl border border-hairline p-4">
        <div className="flex items-center gap-2 mb-4">
          <Trophy size={15} className="text-ochre" />
          <span className="font-kedu font-bold text-sm text-ink">이번 주 성취율</span>
        </div>

        <div className="flex items-center gap-4">
          {/* SVG 도넛 */}
          <div className="flex-shrink-0">
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="30" fill="none" stroke="#E8E9F0" strokeWidth="9" />
              <circle
                cx="40" cy="40" r="30"
                fill="none"
                stroke={weekColor}
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 30}`}
                strokeDashoffset={`${2 * Math.PI * 30 * (1 - weekPct / 100)}`}
                transform="rotate(-90 40 40)"
                style={{ transition: 'stroke-dashoffset 0.6s ease' }}
              />
              <text x="40" y="44" textAnchor="middle" fontSize="15" fontWeight="800" fill="#1A1A2E">
                {weekPct}%
              </text>
            </svg>
          </div>

          {/* 수치 */}
          <div className="flex-1 space-y-2">
            {[
              { label: '주간 목표', value: `${weekGoal.toLocaleString()}걸음` },
              { label: '달성 걸음', value: `${weekTotal.toLocaleString()}걸음` },
              { label: '목표 달성일', value: `${achievedDays}일 / 7일` },
              { label: '연속 달성', value: streak > 0 ? `${streak}일` : '시작해봐요!' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center">
                <span className="font-kedu text-xs text-muted">{label}</span>
                <span className="font-myeong text-xs font-bold text-ink">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
