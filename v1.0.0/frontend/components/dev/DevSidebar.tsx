'use client';

import { useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  ChevronRight, RefreshCw, Trash2, CheckCircle2, XCircle,
  Wifi, Zap, LayoutGrid, User, Database, Cpu, Power, Palette,
  AlertTriangle, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useMealStore } from '@/store/mealStore';
import { useGroupStore } from '@/store/groupStore';
import { useDevStore, type ErrorType } from '@/store/devStore';

/* ─── 앱 디자인 팔레트 기반 사이드바 토큰 ─────────────── */
const C = {
  bg:       '#10103a',   // 매우 짙은 코발트-네이비
  bgHeader: '#080820',   // 거의 검정 코발트
  bgCard:   'rgba(80,88,240,0.07)',
  border:   '#2a2a6a',
  accent:   '#5058f0',   // 코발트
  accentLt: '#7a80f8',   // 밝은 코발트
  lav:      '#c0c0f0',   // 라벤더 (주 텍스트)
  lavMid:   '#8888c8',   // 중간 라벤더 (보조)
  lavDim:   '#4a4a8a',   // 어두운 라벤더 (뮤트)
  sage:     '#70b080',
  coral:    '#e85d4a',
  ochre:    '#e8b94a',
  teal:     '#90c0c0',
};

const PAGES = [
  { label: '홈',       path: '/',            icon: '🏠' },
  { label: '로그인',   path: '/login',        icon: '🔑' },
  { label: '카메라',   path: '/camera',       icon: '📷' },
  { label: '로그',     path: '/log',          icon: '📋' },
  { label: '분석',     path: '/analysis',     icon: '📊' },
  { label: '그룹',     path: '/group',        icon: '👥' },
  { label: '비교',     path: '/compare',      icon: '🏆' },
  { label: '설정',     path: '/settings',     icon: '⚙️' },
  { label: '식사상세', path: '/meal/test-id', icon: '🍱' },
];

const MOCK_USERS = [
  { id: 'dev-001', email: 'test@dev', name: '김밥이',   age: 25, height: 175, weight: 70,  targetCalories: 2000, goalType: 'maintain', createdAt: '2024-01-01' },
  { id: 'dev-002', email: 'diet@dev', name: '이도시락', age: 28, height: 162, weight: 55,  targetCalories: 1500, goalType: 'lose',     createdAt: '2024-01-01' },
  { id: 'dev-003', email: 'fit@dev',  name: '박점심',   age: 30, height: 180, weight: 85,  targetCalories: 3000, goalType: 'gain',     createdAt: '2024-01-01' },
];

const DESIGN_COLORS = [
  { name: 'cobalt',   hex: '#5058f0' }, { name: 'sage',     hex: '#70b080' },
  { name: 'peach',    hex: '#ffb084' }, { name: 'lavender', hex: '#c0c0f0' },
  { name: 'ochre',    hex: '#e8b94a' }, { name: 'coral',    hex: '#e85d4a' },
  { name: 'teal',     hex: '#90c0c0' }, { name: 'canvas',   hex: '#f9f6f1' },
];

type SideTab = 'errors' | 'network' | 'ai' | 'pages' | 'auth' | 'state' | 'design' | 'utils';

const METHOD_COLOR: Record<string, string> = {
  GET: C.teal, POST: C.sage, PATCH: C.ochre, PUT: C.ochre, DELETE: C.coral,
};

function formatError(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const first = parsed[0];
      const loc = Array.isArray(first.loc) ? first.loc.join(' › ') : '';
      const msg = first.msg ?? '';
      return loc ? `${loc}: ${msg}` : msg;
    }
  } catch {/* not JSON */}
  return raw;
}

export function DevSidebar() {
  const router         = useRouter();
  const queryClient    = useQueryClient();
  const { user, setUser, setAccessToken, logout } = useAuthStore();
  const mealStore      = useMealStore();
  const { currentGroupId, setCurrentGroupId } = useGroupStore();
  const { devMode, setDevMode, logs, clearLogs, aiDebug, setAiDebug, errors, clearErrors } = useDevStore();

  const [mounted,      setMounted]      = useState(false);
  const [tab,          setTab]          = useState<SideTab>('errors');
  const [expandedErr,  setExpandedErr]  = useState<string | null>(null);
  const [toast,     setToast]     = useState('');
  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const [width,     setWidth]     = useState(292);

  const isDragging  = useRef(false);
  const dragStartX  = useRef(0);
  const dragStartW  = useRef(0);
  const currentW    = useRef(292);

  useEffect(() => { currentW.current = width; }, [width]);

  useEffect(() => { setMounted(true); }, []);

  /* localStorage에서 저장된 너비 복원 */
  useEffect(() => {
    const saved = localStorage.getItem('devSidebarWidth');
    if (saved) {
      const n = parseInt(saved, 10);
      if (n >= 220 && n <= 800) { setWidth(n); currentW.current = n; }
    }
  }, []);

  /* 드래그 리사이즈 핸들러 */
  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!isDragging.current) return;
      const delta = dragStartX.current - e.clientX; // 왼쪽으로 드래그 → 넓어짐
      const next = Math.max(220, Math.min(800, dragStartW.current + delta));
      setWidth(next);
    }
    function onUp() {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      localStorage.setItem('devSidebarWidth', String(currentW.current));
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);

  function handleResizeStart(e: React.MouseEvent) {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartW.current = currentW.current;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  }

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  }, []);

  async function checkBackend() {
    setBackendOk(null);
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 3000);
      const res = await fetch('http://localhost:8000/health', { signal: ctrl.signal });
      clearTimeout(timer);
      setBackendOk(res.ok);
    } catch {
      setBackendOk(false);
    }
  }

  if (!mounted || !devMode) return null;

  const TABS: { id: SideTab; label: string; icon: ReactNode }[] = [
    { id: 'errors',  label: '에러',     icon: <AlertTriangle size={10} /> },
    { id: 'network', label: '네트워크', icon: <Wifi   size={10} /> },
    { id: 'ai',      label: 'AI분석',   icon: <Zap    size={10} /> },
    { id: 'pages',   label: '페이지',   icon: <LayoutGrid size={10} /> },
    { id: 'auth',    label: '인증',     icon: <User   size={10} /> },
    { id: 'state',   label: '상태',     icon: <Database size={10} /> },
    { id: 'design',  label: '디자인',   icon: <Palette  size={10} /> },
    { id: 'utils',   label: '유틸',     icon: <Cpu    size={10} /> },
  ];

  const errorCount   = errors.length;
  const apiErrCount  = logs.filter(l => !l.ok).length;

  return createPortal(
    <div style={{
      position: 'fixed',
      right: 0,
      top: 0,
      bottom: 0,
      width,
      zIndex: 9990,
      background: C.bg,
      borderLeft: `1px solid ${C.border}`,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'monospace',
      boxShadow: '-6px 0 28px rgba(10,8,50,0.6)',
    }}>

      {/* ── 리사이즈 핸들 ──────────────────────── */}
      <div
        onMouseDown={handleResizeStart}
        title="드래그하여 너비 조절"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 6,
          cursor: 'ew-resize',
          zIndex: 1,
          background: 'transparent',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = `rgba(80,88,240,0.4)`; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
      />

      {/* ── 헤더 ─────────────────────────────── */}
      <div style={{
        background: C.bgHeader,
        padding: '10px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1px solid ${C.border}`,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.sage, boxShadow: `0 0 6px ${C.sage}` }} />
          <span style={{ color: C.lav, fontSize: 11, fontWeight: 700, letterSpacing: '0.14em' }}>DEV MODE</span>
          <span style={{ color: C.lavDim, fontSize: 8, marginLeft: 2 }}>Ctrl+F11</span>
        </div>
        <button
          onClick={() => setDevMode(false)}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            color: C.coral,
            border: `1px solid rgba(232,93,74,0.4)`,
            background: 'rgba(232,93,74,0.1)',
            borderRadius: 6,
            padding: '3px 9px',
            cursor: 'pointer',
            fontSize: 10,
            fontFamily: 'monospace',
          }}
        >
          <Power size={10} /> 끄기
        </button>
      </div>

      {/* ── 탭 바 ────────────────────────────── */}
      <div style={{
        display: 'flex',
        overflowX: 'auto',
        borderBottom: `1px solid ${C.border}`,
        flexShrink: 0,
        background: C.bgHeader,
      }}>
        {TABS.map(t => {
          const isActive = tab === t.id;
          const badgeCount = t.id === 'errors' ? errorCount : t.id === 'network' ? apiErrCount : 0;
          const showBadge = badgeCount > 0;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                position: 'relative',
                display: 'flex', alignItems: 'center', gap: 3,
                padding: '7px 9px',
                fontSize: 9,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                border: 'none',
                borderBottom: `2px solid ${isActive ? C.accent : 'transparent'}`,
                background: 'none',
                color: isActive ? C.lav : C.lavMid,
                fontWeight: isActive ? 700 : 400,
                cursor: 'pointer',
                fontFamily: 'monospace',
              }}
            >
              {t.icon}{t.label}
              {showBadge && (
                <span style={{
                  position: 'absolute', top: 4, right: 2,
                  background: C.coral, color: '#fff',
                  fontSize: 7, fontWeight: 700,
                  borderRadius: 999, padding: '0px 3px', lineHeight: '12px',
                  minWidth: 12, textAlign: 'center',
                }}>
                  {badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── 컨텐츠 ──────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>

        {/* ─ 에러 콘솔 ─ */}
        {tab === 'errors' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2px 4px' }}>
              <span style={{ color: C.lavMid, fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                에러 로그 ({errors.length})
              </span>
              {errors.length > 0 && (
                <button onClick={clearErrors} style={{ color: C.lavMid, border: 'none', background: 'none', cursor: 'pointer', fontSize: 8, display: 'flex', alignItems: 'center', gap: 2, fontFamily: 'monospace' }}>
                  <Trash2 size={8} /> 초기화
                </button>
              )}
            </div>

            {errors.length === 0 ? (
              <div style={{ color: C.lavMid, fontSize: 10, textAlign: 'center', padding: '28px 0', lineHeight: 1.7 }}>
                에러 없음 ✓<br />
                <span style={{ fontSize: 8, color: C.lavDim }}>개발자 모드 켜진 동안 발생한 에러가 여기 표시됩니다</span>
              </div>
            ) : (
              errors.map(err => {
                const isExpanded = expandedErr === err.id;
                const TYPE_META: Record<ErrorType, { label: string; color: string; bg: string }> = {
                  runtime: { label: 'JS',      color: C.coral,  bg: 'rgba(232,93,74,0.15)'  },
                  promise: { label: 'PROMISE', color: C.ochre,  bg: 'rgba(232,185,74,0.15)' },
                  console: { label: 'CONSOLE', color: C.lavMid, bg: 'rgba(136,136,200,0.12)' },
                };
                const meta = TYPE_META[err.type];
                const stackLines = err.stack
                  ? err.stack.split('\n').filter(l => l.trim()).slice(0, 6)
                  : [];

                return (
                  <div key={err.id} style={{
                    background: 'rgba(232,93,74,0.05)',
                    border: `1px solid rgba(232,93,74,0.2)`,
                    borderLeft: `3px solid ${meta.color}`,
                    borderRadius: 5,
                    overflow: 'hidden',
                  }}>
                    {/* 헤더 행 */}
                    <div
                      onClick={() => setExpandedErr(isExpanded ? null : err.id)}
                      style={{ padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 6 }}
                    >
                      <span style={{
                        background: meta.bg, color: meta.color,
                        fontSize: 7, fontWeight: 700, padding: '1px 5px',
                        borderRadius: 3, flexShrink: 0, marginTop: 1,
                        fontFamily: 'monospace',
                      }}>
                        {meta.label}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          color: C.lav, fontSize: 9, lineHeight: 1.4,
                          wordBreak: 'break-word',
                          display: '-webkit-box',
                          WebkitLineClamp: isExpanded ? undefined : 2,
                          WebkitBoxOrient: 'vertical' as const,
                          overflow: isExpanded ? 'visible' : 'hidden',
                        }}>
                          {err.message}
                        </div>
                        {err.source && (
                          <div style={{ color: C.lavDim, fontSize: 7, marginTop: 2 }}>
                            {err.source}{err.line ? `:${err.line}` : ''}{err.col ? `:${err.col}` : ''}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
                        <span style={{ fontSize: 7, color: C.lavDim }}>
                          {new Date(err.time).toLocaleTimeString('ko-KR', { hour12: false })}
                        </span>
                        {(stackLines.length > 0) && (
                          isExpanded
                            ? <ChevronUp size={10} color={C.lavDim} />
                            : <ChevronDown size={10} color={C.lavDim} />
                        )}
                      </div>
                    </div>

                    {/* 스택 트레이스 */}
                    {isExpanded && stackLines.length > 0 && (
                      <div style={{
                        borderTop: `1px solid rgba(232,93,74,0.15)`,
                        background: 'rgba(0,0,0,0.2)',
                        padding: '6px 8px',
                      }}>
                        <div style={{ color: C.lavDim, fontSize: 7, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                          Stack Trace
                        </div>
                        {stackLines.map((line, i) => (
                          <div key={i} style={{
                            fontSize: 8, color: i === 0 ? C.coral : C.lavMid,
                            fontFamily: 'monospace', lineHeight: 1.5,
                            wordBreak: 'break-all',
                          }}>
                            {line.trim()}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </>
        )}

        {/* ─ 네트워크 ─ */}
        {tab === 'network' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2px 4px' }}>
              <span style={{ color: C.lavDim, fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                API 로그 ({logs.length})
                {errorCount > 0 && <span style={{ color: C.coral, marginLeft: 6 }}>{errorCount} 오류</span>}
              </span>
              {logs.length > 0 && (
                <button onClick={clearLogs} style={{ color: C.lavDim, border: 'none', background: 'none', cursor: 'pointer', fontSize: 8, display: 'flex', alignItems: 'center', gap: 2, fontFamily: 'monospace' }}>
                  <Trash2 size={8} /> 초기화
                </button>
              )}
            </div>

            {logs.length === 0 ? (
              <div style={{ color: C.lavDim, fontSize: 10, textAlign: 'center', padding: '28px 0', lineHeight: 1.7 }}>
                요청 없음<br />
                <span style={{ fontSize: 8 }}>API 호출 시 여기에 표시됩니다</span>
              </div>
            ) : (
              logs.map(log => (
                <div key={log.id} style={{
                  background: log.ok ? 'rgba(112,176,128,0.05)' : 'rgba(232,93,74,0.07)',
                  border: `1px solid ${log.ok ? 'rgba(112,176,128,0.2)' : 'rgba(232,93,74,0.25)'}`,
                  borderRadius: 5,
                  padding: '5px 7px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                    <span style={{ fontSize: 8, fontWeight: 700, color: METHOD_COLOR[log.method] ?? C.lav, flexShrink: 0 }}>
                      {log.method}
                    </span>
                    <span style={{ fontSize: 8, color: C.lavMid, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.endpoint}
                    </span>
                    <span style={{ fontSize: 9, color: log.ok ? C.sage : C.coral, flexShrink: 0, fontWeight: 700 }}>
                      {log.status ?? '---'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 7, color: C.lavDim }}>
                      {new Date(log.time).toLocaleTimeString('ko-KR', { hour12: false })}
                    </span>
                    {log.durationMs != null && (
                      <span style={{ fontSize: 7, color: log.durationMs > 2000 ? C.ochre : C.lavDim }}>
                        {log.durationMs}ms
                      </span>
                    )}
                  </div>
                  {log.error && (
                    <div style={{ marginTop: 3, fontSize: 8, color: C.coral, wordBreak: 'break-all', lineHeight: 1.4 }}>
                      ⚠ {formatError(log.error)}
                    </div>
                  )}
                </div>
              ))
            )}
          </>
        )}

        {/* ─ AI 분석 ─ */}
        {tab === 'ai' && (
          <>
            {!aiDebug ? (
              <div style={{ color: C.lavMid, fontSize: 10, textAlign: 'center', padding: '28px 0', lineHeight: 1.8 }}>
                AI 분석 데이터 없음<br />
                <span style={{ fontSize: 8, color: C.lavDim }}>음식 사진을 업로드하면 결과가 표시됩니다</span>
              </div>
            ) : (
              <>
                <div style={{ color: C.lavMid, fontSize: 8, marginBottom: 4, padding: '0 2px' }}>
                  분석 시각: {new Date(aiDebug.time).toLocaleTimeString('ko-KR', { hour12: false })}
                  {' · '}{aiDebug.foods.length}개 인식
                </div>

                {aiDebug.foods.map((food, i) => (
                  <div key={i} style={{
                    background: 'rgba(80,88,240,0.07)',
                    border: `1px solid rgba(80,88,240,0.22)`,
                    borderLeft: `3px solid ${C.accent}`,
                    borderRadius: 5,
                    padding: '8px 9px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0,
                  }}>
                    {/* 음식 이름 */}
                    <div style={{ color: C.lav, fontSize: 12, fontWeight: 700, marginBottom: 7 }}>
                      {i + 1}. {food.foodName}
                    </div>

                    {/* ── STEP 1: 크기 측정 ── */}
                    <div style={{ marginBottom: 6 }}>
                      <div style={{ color: C.accentLt, fontSize: 8, fontWeight: 700, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        STEP 1 · 크기 측정
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '2px 8px', fontSize: 9 }}>
                        {food.sizeRef && (
                          <>
                            <span style={{ color: C.lavMid, whiteSpace: 'nowrap' }}>기준점</span>
                            <span style={{ color: C.lav }}>{food.sizeRef}</span>
                          </>
                        )}
                        {food.sizeEstimate && (
                          <>
                            <span style={{ color: C.lavMid, whiteSpace: 'nowrap' }}>치수 추정</span>
                            <span style={{ color: C.teal }}>{food.sizeEstimate}</span>
                          </>
                        )}
                        {(food.count != null || food.gramsPerUnit) && (
                          <>
                            <span style={{ color: C.lavMid, whiteSpace: 'nowrap' }}>수량 계산</span>
                            <span style={{ color: C.ochre }}>
                              {food.count != null && food.gramsPerUnit
                                ? `${food.count}개 × ${food.gramsPerUnit} = ${food.servingSize}g`
                                : food.gramsPerUnit ?? `${food.count}개`}
                            </span>
                          </>
                        )}
                        <span style={{ color: C.lavMid, whiteSpace: 'nowrap' }}>→ 인식 양</span>
                        <span style={{ color: C.lav, fontWeight: 700 }}>{food.servingSize}g</span>
                      </div>
                    </div>

                    {/* ── STEP 2: 조리 상태 & 밀도 ── */}
                    <div style={{ marginBottom: 6 }}>
                      <div style={{ color: C.accentLt, fontSize: 8, fontWeight: 700, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        STEP 2 · 조리 상태 &amp; 밀도
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '2px 8px', fontSize: 9 }}>
                        {food.cookingState && (
                          <>
                            <span style={{ color: C.lavMid, whiteSpace: 'nowrap' }}>조리 상태</span>
                            <span style={{ color: '#ffb084' }}>{food.cookingState}</span>
                          </>
                        )}
                        <span style={{ color: C.lavMid, whiteSpace: 'nowrap' }}>적용 밀도</span>
                        <span style={{ color: C.ochre }}>
                          {food.densityUsed ?? `${food.kcalPer100}kcal/100g (역산)`}
                        </span>
                      </div>
                    </div>

                    {/* ── STEP 3: 칼로리 계산 ── */}
                    <div style={{
                      background: 'rgba(0,0,0,0.25)',
                      borderRadius: 4,
                      padding: '5px 7px',
                    }}>
                      <div style={{ color: C.accentLt, fontSize: 8, fontWeight: 700, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        STEP 3 · 칼로리 계산
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 9 }}>
                        <span style={{ color: C.lav }}>{food.servingSize}g</span>
                        <span style={{ color: C.lavDim }}>×</span>
                        <span style={{ color: C.ochre }}>{food.kcalPer100}kcal</span>
                        <span style={{ color: C.lavDim }}>÷ 100 =</span>
                        <span style={{ color: C.sage, fontWeight: 700, fontSize: 11 }}>{food.calories}kcal</span>
                      </div>
                    </div>

                    {/* 탄단지 */}
                    <div style={{
                      marginTop: 5, paddingTop: 5,
                      borderTop: `1px solid rgba(80,88,240,0.18)`,
                      display: 'flex', gap: 10, fontSize: 8, color: C.lavMid,
                    }}>
                      <span>탄 {food.carbs}g</span>
                      <span>단 {food.protein}g</span>
                      <span>지 {food.fat}g</span>
                    </div>
                  </div>
                ))}

                {/* 합계 */}
                <div style={{
                  background: 'rgba(112,176,128,0.08)',
                  border: `1px solid rgba(112,176,128,0.25)`,
                  borderRadius: 5, padding: '7px 10px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ fontSize: 9, color: C.lavMid }}>총 칼로리</span>
                  <span style={{ fontSize: 15, color: C.sage, fontWeight: 700 }}>
                    {aiDebug.foods.reduce((s, f) => s + f.calories, 0).toLocaleString()}kcal
                  </span>
                </div>

                <button
                  onClick={() => setAiDebug(null)}
                  style={{ color: C.lavMid, border: `1px solid ${C.border}`, background: 'none', borderRadius: 5, padding: '4px 0', cursor: 'pointer', fontSize: 9, width: '100%', fontFamily: 'monospace' }}
                >
                  초기화
                </button>
              </>
            )}
          </>
        )}

        {/* ─ 페이지 ─ */}
        {tab === 'pages' && PAGES.map(p => (
          <button
            key={p.path}
            onClick={() => { router.push(p.path); showToast(`→ ${p.path}`); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: C.bgCard, border: `1px solid ${C.border}`,
              borderRadius: 5, padding: '7px 8px',
              cursor: 'pointer', textAlign: 'left', width: '100%',
            }}
          >
            <span style={{ fontSize: 14, width: 20, textAlign: 'center', flexShrink: 0 }}>{p.icon}</span>
            <div style={{ flex: 1 }}>
              <p style={{ color: C.lav, fontSize: 11, margin: 0 }}>{p.label}</p>
              <p style={{ color: C.lavDim, fontSize: 8, margin: 0 }}>{p.path}</p>
            </div>
            <ChevronRight size={11} color={C.lavDim} />
          </button>
        ))}

        {/* ─ 인증 ─ */}
        {tab === 'auth' && (
          <>
            <div style={{
              background: user ? 'rgba(112,176,128,0.07)' : 'rgba(232,93,74,0.07)',
              border: `1px solid ${user ? 'rgba(112,176,128,0.2)' : 'rgba(232,93,74,0.2)'}`,
              borderRadius: 5, padding: '7px 8px',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: user ? C.sage : C.coral, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ color: C.lav, fontSize: 11, margin: 0 }}>{user ? user.name : '로그아웃'}</p>
                {user && <p style={{ color: C.lavDim, fontSize: 8, margin: 0 }}>{user.email}</p>}
              </div>
              {user && (
                <button onClick={() => { logout(); showToast('로그아웃'); }}
                  style={{ fontSize: 8, color: C.coral, border: `1px solid rgba(232,93,74,0.3)`, background: 'none', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', fontFamily: 'monospace' }}>
                  로그아웃
                </button>
              )}
            </div>

            <div style={{ color: C.lavDim, fontSize: 8, margin: '4px 2px 2px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>목업 유저</div>

            {MOCK_USERS.map(mu => (
              <button
                key={mu.id}
                onClick={async () => {
                  try {
                    const res = await fetch('http://localhost:8000/auth/dev-login', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email: mu.email, name: mu.name }),
                    });
                    const data = await res.json();
                    if (data.success) {
                      setUser({ ...mu, id: data.data.user.id } as never);
                      setAccessToken(data.data.access_token);
                      showToast(`✓ ${mu.name}`);
                    } else {
                      showToast('로그인 실패');
                    }
                  } catch { showToast('연결 실패'); }
                }}
                style={{
                  background: C.bgCard,
                  border: `1px solid ${user?.id === mu.id ? C.accent : C.border}`,
                  borderRadius: 5, padding: '6px 8px',
                  display: 'flex', alignItems: 'center', gap: 8,
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                }}
              >
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: `rgba(192,192,240,0.12)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.accentLt, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                  {mu.name[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ color: C.lav, fontSize: 10, margin: 0 }}>{mu.name}</p>
                  <p style={{ color: C.lavDim, fontSize: 8, margin: 0 }}>{mu.targetCalories}kcal · {mu.goalType}</p>
                </div>
              </button>
            ))}
          </>
        )}

        {/* ─ 상태 ─ */}
        {tab === 'state' && (
          <>
            <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 5, padding: '6px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
              {backendOk === true  && <CheckCircle2 size={13} color={C.sage} />}
              {backendOk === false && <XCircle      size={13} color={C.coral} />}
              {backendOk === null  && (
                <div style={{ width: 13, height: 13, borderRadius: '50%', border: `2px solid ${C.border}`, borderTopColor: C.accent, animation: 'dev-spin 1s linear infinite', flexShrink: 0 }} />
              )}
              <div style={{ flex: 1 }}>
                <p style={{ color: C.lav, fontSize: 10, margin: 0 }}>
                  {backendOk === true ? 'FastAPI 연결됨' : backendOk === false ? '연결 실패' : '미확인'}
                </p>
                <p style={{ color: C.lavDim, fontSize: 8, margin: 0 }}>localhost:8000</p>
              </div>
              <button onClick={checkBackend} style={{ display: 'flex', alignItems: 'center', gap: 3, color: C.accentLt, border: `1px solid rgba(80,88,240,0.35)`, background: 'none', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', fontSize: 8, fontFamily: 'monospace' }}>
                <RefreshCw size={8} /> 확인
              </button>
            </div>

            {[
              { label: 'Auth Store',  color: C.sage,  data: { logged: !!user, name: user?.name, target: user?.targetCalories } },
              { label: 'Meal Store',  color: C.ochre, data: { step: mealStore.step, mealType: mealStore.mealType, foods: mealStore.editedFoods.length } },
              { label: 'Group Store', color: C.lav,   data: { currentGroupId } },
            ].map(({ label, color, data }) => (
              <div key={label}>
                <p style={{ color: C.lavDim, fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '4px 0 2px 2px' }}>{label}</p>
                <pre style={{ background: '#06060f', color, fontSize: 8.5, lineHeight: 1.65, borderRadius: 5, padding: 8, overflowX: 'auto', margin: 0, border: `1px solid ${C.border}` }}>
                  {JSON.stringify(data, null, 2)}
                </pre>
              </div>
            ))}
          </>
        )}

        {/* ─ 디자인 ─ */}
        {tab === 'design' && (
          <>
            <p style={{ color: C.lavDim, fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px 2px' }}>컬러 팔레트</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5 }}>
              {DESIGN_COLORS.map(col => (
                <button
                  key={col.name}
                  onClick={() => { navigator.clipboard?.writeText(col.hex); showToast(col.hex); }}
                  style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 6, padding: 5, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}
                >
                  <div style={{ width: 30, height: 30, borderRadius: 5, backgroundColor: col.hex, border: '1px solid rgba(255,255,255,0.1)' }} />
                  <p style={{ fontSize: 7, color: C.lavDim, margin: 0 }}>{col.name}</p>
                </button>
              ))}
            </div>
            <p style={{ color: C.lavDim, fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '8px 0 4px 2px' }}>타이포그래피</p>
            {[
              { family: '"KERIS-KEDU", sans-serif', weight: 700,  sample: '먹로그 Muklog', sub: '오늘 점심은?',           label: 'KEDU' },
              { family: '"Nanum-Myeongjo", serif',  weight: 800,  sample: '1,240 kcal',   sub: '탄 180g · 단 95g · 지 42g', label: 'Myeongjo' },
            ].map(f => (
              <div key={f.label} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 5, padding: 8 }}>
                <p style={{ fontSize: 7, color: C.lavDim, marginBottom: 4 }}>{f.label}</p>
                <p style={{ fontFamily: f.family, fontWeight: f.weight, fontSize: 18, color: C.lav, margin: 0 }}>{f.sample}</p>
                <p style={{ fontFamily: f.family, fontSize: 11, color: C.lavMid, margin: '2px 0 0' }}>{f.sub}</p>
              </div>
            ))}
          </>
        )}

        {/* ─ 유틸 ─ */}
        {tab === 'utils' && (
          <>
            {[
              { label: 'QueryClient 캐시 초기화', color: C.accentLt, action: () => { queryClient.clear(); showToast('캐시 초기화'); } },
              { label: 'Meal Store 초기화',       color: C.ochre,    action: () => { mealStore.reset(); showToast('Meal 초기화'); } },
              { label: 'API 로그 초기화',          color: C.teal,     action: () => { clearLogs(); showToast('로그 초기화'); } },
              { label: '전체 초기화',             color: C.coral,    action: () => {
                logout(); mealStore.reset(); setCurrentGroupId(null);
                queryClient.clear(); clearLogs();
                try { localStorage.clear(); } catch {}
                showToast('전체 초기화');
              }},
            ].map(item => (
              <button
                key={item.label}
                onClick={item.action}
                style={{
                  background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 5,
                  padding: '7px 8px', display: 'flex', alignItems: 'center',
                  gap: 8, cursor: 'pointer', textAlign: 'left', width: '100%',
                }}
              >
                <Trash2 size={12} color={item.color} />
                <span style={{ color: item.color, fontSize: 10, fontFamily: 'monospace' }}>{item.label}</span>
              </button>
            ))}

            <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 5, padding: 8, marginTop: 4 }}>
              <p style={{ color: C.lavDim, fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>빌드 정보</p>
              {[['Next.js', '14 App Router'], ['Tailwind', '3.x'], ['환경', process.env.NODE_ENV ?? '-']].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                  <span style={{ color: C.lavMid, fontSize: 8 }}>{k}</span>
                  <span style={{ color: C.lav, fontSize: 8 }}>{v}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── 토스트 ─────────────────────────── */}
      {toast && (
        <div style={{
          position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
          background: C.bgHeader, color: C.lav,
          border: `1px solid ${C.border}`,
          fontSize: 9, padding: '4px 14px', borderRadius: 999,
          whiteSpace: 'nowrap', fontFamily: 'monospace',
          boxShadow: `0 2px 12px rgba(10,8,50,0.5)`,
        }}>
          {toast}
        </div>
      )}

      <style>{`@keyframes dev-spin { to { transform: rotate(360deg); } }`}</style>
    </div>,
    document.body
  );
}
