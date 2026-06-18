'use client';

import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { X, Lock, ChevronRight, RefreshCw, Trash2, User, Palette, Database, CheckCircle2, XCircle, LayoutGrid, Cpu, Unlock, Eye, EyeOff, Monitor } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useMealStore } from '@/store/mealStore';
import { useGroupStore } from '@/store/groupStore';
import { useQueryClient } from '@tanstack/react-query';
import { useDevStore } from '@/store/devStore';

const DEV_PASSWORD = '060227';

const PAGES = [
  { label: '홈',       path: '/',             icon: '🏠' },
  { label: '로그인',   path: '/login',         icon: '🔑' },
  { label: '카메라',   path: '/camera',        icon: '📷' },
  { label: '로그',     path: '/log',           icon: '📋' },
  { label: '분석',     path: '/analysis',      icon: '📊' },
  { label: '그룹',     path: '/group',         icon: '👥' },
  { label: '비교',     path: '/compare',       icon: '🏆' },
  { label: '설정',     path: '/settings',      icon: '⚙️' },
  { label: '식사상세', path: '/meal/test-id',  icon: '🍱' },
];

const MOCK_USERS = [
  { id: 'dev-001', email: 'test@dev',  name: '김밥이',  age: 25, height: 175, weight: 70,  targetCalories: 2000, goalType: 'maintain', createdAt: '2024-01-01' },
  { id: 'dev-002', email: 'diet@dev',  name: '이도시락', age: 28, height: 162, weight: 55, targetCalories: 1500, goalType: 'lose',     createdAt: '2024-01-01' },
  { id: 'dev-003', email: 'fit@dev',   name: '박점심',  age: 30, height: 180, weight: 85,  targetCalories: 3000, goalType: 'gain',     createdAt: '2024-01-01' },
];

const COLORS = [
  { name: 'cobalt',   hex: '#5058f0' },
  { name: 'sage',     hex: '#70b080' },
  { name: 'peach',    hex: '#ffb084' },
  { name: 'lavender', hex: '#c0c0f0' },
  { name: 'ochre',    hex: '#e8b94a' },
  { name: 'coral',    hex: '#e85d4a' },
  { name: 'teal',     hex: '#90c0c0' },
  { name: 'canvas',   hex: '#f9f6f1' },
];

type Tab = 'pages' | 'auth' | 'design' | 'state' | 'utils';

export function DevPanel() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, setUser, setAccessToken, logout } = useAuthStore();
  const mealStore = useMealStore();
  const { currentGroupId, setCurrentGroupId } = useGroupStore();

  const { devMode, setDevMode } = useDevStore();

  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [pwInput, setPwInput] = useState('');
  const [pwError, setPwError] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [tab, setTab] = useState<Tab>('pages');
  const [toast, setToast] = useState('');
  const [backendOk, setBackendOk] = useState<boolean | null>(null);

  useEffect(() => { setMounted(true); }, []);

  /* Ctrl+F11 단축키 */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey && e.code === 'F11') {
        e.preventDefault();
        e.stopImmediatePropagation();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  }, []);

  function tryUnlock() {
    if (pwInput === DEV_PASSWORD) {
      setUnlocked(true);
      setPwError(false);
      setPwInput('');
    } else {
      setPwError(true);
      setPwInput('');
      setTimeout(() => setPwError(false), 1200);
    }
  }

  function close() {
    setIsOpen(false);
    setUnlocked(false);
    setPwInput('');
  }

  async function checkBackend() {
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

  /* SSR 단계에서는 아무것도 렌더링 안 함 */
  if (!mounted) return null;

  /* ── 공통 스타일 상수 ─────────────────────────────── */
  const S = {
    overlay: {
      position: 'fixed' as const,
      inset: 0,
      zIndex: 99999,
      backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    panel: {
      position: 'fixed' as const,
      bottom: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: '480px',
      maxHeight: '90vh',
      zIndex: 99999,
      background: '#f9f6f1',
      borderRadius: '16px 16px 0 0',
      display: 'flex',
      flexDirection: 'column' as const,
      boxShadow: '0 -8px 40px rgba(0,0,0,0.25)',
    },
  };

  if (!isOpen) return null;

  /* ── 비밀번호 모달 ──────────────────────────────────── */
  if (!unlocked) {
    return createPortal(
      <>
        <div style={S.overlay} onClick={close}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: '20px',
              padding: '32px 24px',
              width: '288px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: pwError ? '#e85d4a' : '#5058f0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.2s',
            }}>
              <Lock size={20} color="white" />
            </div>

            <div style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: '"KERIS-KEDU", sans-serif', fontWeight: 700, fontSize: 16, color: '#1a1a1a' }}>
                개발자 패널
              </p>
              <p style={{ fontFamily: '"KERIS-KEDU", sans-serif', fontSize: 13, color: '#6a6a6a', marginTop: 4 }}>
                비밀번호를 입력하세요
              </p>
            </div>

            <div style={{ position: 'relative', width: '100%' }}>
              <input
                autoFocus
                type={showPw ? 'text' : 'password'}
                value={pwInput}
                placeholder="비밀번호"
                onChange={e => setPwInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && tryUnlock()}
                style={{
                  width: '100%',
                  height: 44,
                  borderRadius: 10,
                  border: `2px solid ${pwError ? '#e85d4a' : '#e0d8cc'}`,
                  background: '#f2ede4',
                  textAlign: 'center',
                  fontSize: 16,
                  letterSpacing: pwInput ? '0.3em' : 0,
                  paddingRight: 40,
                  paddingLeft: 40,
                  color: '#1a1a1a',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPw(p => !p)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#9a9a9a',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {pwError && (
              <p style={{ fontFamily: '"KERIS-KEDU", sans-serif', fontSize: 12, color: '#e85d4a', marginTop: -8 }}>
                비밀번호가 틀렸습니다
              </p>
            )}

            <div style={{ display: 'flex', gap: 8, width: '100%' }}>
              <button
                onClick={close}
                style={{ flex: 1, height: 40, borderRadius: 10, border: 'none', background: '#f2ede4', cursor: 'pointer', fontFamily: '"KERIS-KEDU", sans-serif', fontSize: 14, color: '#6a6a6a' }}
              >
                취소
              </button>
              <button
                onClick={tryUnlock}
                style={{ flex: 1, height: 40, borderRadius: 10, border: 'none', background: '#5058f0', cursor: 'pointer', fontFamily: '"KERIS-KEDU", sans-serif', fontWeight: 700, fontSize: 14, color: '#fff' }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      </>,
      document.body
    );
  }

  /* ── 탭 목록 ─────────────────────────────────────── */
  const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
    { id: 'pages',  label: '페이지', icon: <LayoutGrid size={13} /> },
    { id: 'auth',   label: '인증',   icon: <User size={13} /> },
    { id: 'design', label: '디자인', icon: <Palette size={13} /> },
    { id: 'state',  label: '상태',   icon: <Database size={13} /> },
    { id: 'utils',  label: '유틸',   icon: <Cpu size={13} /> },
  ];

  /* ── 메인 패널 ──────────────────────────────────────── */
  return createPortal(
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 99998, backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={close} />

      <div style={S.panel}>
        {/* 헤더 */}
        <div style={{ background: '#5058f0', borderRadius: '16px 16px 0 0', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Unlock size={15} color="rgba(255,255,255,0.7)" />
            <span style={{ fontFamily: '"KERIS-KEDU", sans-serif', fontWeight: 700, fontSize: 15, color: '#fff' }}>DEV PANEL</span>
            <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.4)', marginLeft: 4 }}>Ctrl+F11</span>
          </div>
          <button onClick={close} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        {/* 탭 바 */}
        <div style={{ background: '#fff', borderBottom: '1px solid #e0d8cc', display: 'flex', overflowX: 'auto', flexShrink: 0 }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '10px 16px',
                fontFamily: '"KERIS-KEDU", sans-serif',
                fontSize: 12,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                border: 'none',
                borderBottom: `2px solid ${tab === t.id ? '#5058f0' : 'transparent'}`,
                background: 'none',
                color: tab === t.id ? '#5058f0' : '#6a6a6a',
                fontWeight: tab === t.id ? 700 : 400,
                cursor: 'pointer',
              }}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* 컨텐츠 */}
        <div style={{ overflowY: 'auto', flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>

          {/* 페이지 탭 */}
          {tab === 'pages' && PAGES.map(p => (
            <button
              key={p.path}
              onClick={() => { router.push(p.path); showToast(`→ ${p.path}`); close(); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: '#fff', border: '1px solid #e0d8cc',
                borderRadius: 12, padding: '10px 12px',
                cursor: 'pointer', textAlign: 'left', width: '100%',
              }}
            >
              <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{p.icon}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: '"KERIS-KEDU", sans-serif', fontSize: 14, color: '#1a1a1a', margin: 0 }}>{p.label}</p>
                <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#9a9a9a', margin: 0 }}>{p.path}</p>
              </div>
              <ChevronRight size={14} color="#9a9a9a" />
            </button>
          ))}

          {/* 인증 탭 */}
          {tab === 'auth' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{
                background: user ? 'rgba(112,176,128,0.12)' : 'rgba(232,93,74,0.1)',
                border: `1px solid ${user ? 'rgba(112,176,128,0.3)' : 'rgba(232,93,74,0.3)'}`,
                borderRadius: 12, padding: '10px 12px',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: user ? '#70b080' : '#e85d4a', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: '"KERIS-KEDU", sans-serif', fontWeight: 700, fontSize: 14, color: '#1a1a1a', margin: 0 }}>
                    {user ? `${user.name} 로그인됨` : '로그아웃 상태'}
                  </p>
                  {user && <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#6a6a6a', margin: 0 }}>{user.email}</p>}
                </div>
                {user && (
                  <button onClick={() => { logout(); showToast('로그아웃됨'); }}
                    style={{ fontFamily: '"KERIS-KEDU", sans-serif', fontSize: 12, color: '#e85d4a', border: '1px solid rgba(232,93,74,0.3)', background: 'none', borderRadius: 8, padding: '4px 8px', cursor: 'pointer' }}>
                    로그아웃
                  </button>
                )}
              </div>

              <p style={{ fontFamily: '"Nanum-Myeongjo", serif', fontSize: 10, color: '#9a9a9a', textTransform: 'uppercase', letterSpacing: '1px', margin: '4px 0 0 4px' }}>목업 유저로 로그인</p>

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
                        showToast(`✓ ${mu.name} 로그인`);
                      } else {
                        showToast('로그인 실패');
                      }
                    } catch {
                      showToast('백엔드 연결 실패');
                    }
                  }}
                  style={{
                    background: '#fff',
                    border: `1px solid ${user?.id === mu.id ? '#5058f0' : '#e0d8cc'}`,
                    borderRadius: 12, padding: '10px 12px',
                    display: 'flex', alignItems: 'center', gap: 10,
                    cursor: 'pointer', textAlign: 'left', width: '100%',
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#c0c0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"KERIS-KEDU", sans-serif', fontWeight: 700, fontSize: 14, color: '#5058f0', flexShrink: 0 }}>
                    {mu.name[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: '"KERIS-KEDU", sans-serif', fontWeight: 700, fontSize: 14, color: '#1a1a1a', margin: 0 }}>{mu.name}</p>
                    <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#6a6a6a', margin: 0 }}>목표 {mu.targetCalories}kcal · {mu.goalType}</p>
                  </div>
                  <p style={{ fontFamily: 'monospace', fontSize: 10, color: '#9a9a9a' }}>{mu.height}cm/{mu.weight}kg</p>
                </button>
              ))}
            </div>
          )}

          {/* 디자인 탭 */}
          {tab === 'design' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {COLORS.map(c => (
                  <button
                    key={c.name}
                    onClick={() => { navigator.clipboard?.writeText(c.hex); showToast(c.hex); }}
                    style={{ background: '#fff', border: '1px solid #e0d8cc', borderRadius: 12, padding: 8, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: c.hex, border: '1px solid rgba(0,0,0,0.1)' }} />
                    <p style={{ fontFamily: 'monospace', fontSize: 9, color: '#6a6a6a', margin: 0 }}>{c.name}</p>
                  </button>
                ))}
              </div>
              {[
                { label: 'KERIS-KEDU (감성)', family: '"KERIS-KEDU", sans-serif', weight: 700, sample: '먹로그 Muklog', sub: '오늘 점심은?' },
                { label: 'Nanum-Myeongjo (데이터)', family: '"Nanum-Myeongjo", serif', weight: 800, sample: '1,240 kcal', sub: '탄 180g · 단 95g · 지 42g' },
              ].map(f => (
                <div key={f.label} style={{ background: '#fff', border: '1px solid #e0d8cc', borderRadius: 12, padding: 12 }}>
                  <p style={{ fontFamily: 'monospace', fontSize: 9, color: '#9a9a9a', marginBottom: 6 }}>{f.label}</p>
                  <p style={{ fontFamily: f.family, fontWeight: f.weight, fontSize: 22, color: '#1a1a1a', margin: 0 }}>{f.sample}</p>
                  <p style={{ fontFamily: f.family, fontSize: 13, color: '#3a3a3a', margin: '2px 0 0' }}>{f.sub}</p>
                </div>
              ))}
            </div>
          )}

          {/* 상태 탭 */}
          {tab === 'state' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ background: '#fff', border: '1px solid #e0d8cc', borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                {backendOk === true  && <CheckCircle2 size={18} color="#70b080" />}
                {backendOk === false && <XCircle      size={18} color="#e85d4a" />}
                {backendOk === null  && <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid #e0d8cc', borderTopColor: '#5058f0', animation: 'spin 1s linear infinite' }} />}
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: '"KERIS-KEDU", sans-serif', fontSize: 13, color: '#1a1a1a', margin: 0 }}>{backendOk === true ? 'FastAPI 연결됨' : backendOk === false ? '서버 연결 실패' : '미확인'}</p>
                  <p style={{ fontFamily: 'monospace', fontSize: 10, color: '#9a9a9a', margin: 0 }}>localhost:8000</p>
                </div>
                <button onClick={checkBackend} style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: '"KERIS-KEDU", sans-serif', fontSize: 12, color: '#5058f0', border: '1px solid rgba(80,88,240,0.3)', background: 'none', borderRadius: 8, padding: '4px 8px', cursor: 'pointer' }}>
                  <RefreshCw size={11} /> 확인
                </button>
              </div>

              {[
                { label: 'Auth Store',   color: '#70b080', data: { logged: !!user, name: user?.name, target: user?.targetCalories } },
                { label: 'Meal Store',   color: '#e8b94a', data: { step: mealStore.step, mealType: mealStore.mealType, foods: mealStore.editedFoods.length } },
                { label: 'Group Store',  color: '#c0c0f0', data: { currentGroupId } },
              ].map(({ label, color, data }) => (
                <div key={label}>
                  <p style={{ fontFamily: '"Nanum-Myeongjo", serif', fontSize: 10, color: '#9a9a9a', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 4px 4px' }}>{label}</p>
                  <pre style={{ background: '#1a1a1a', color, fontFamily: 'monospace', fontSize: 11, lineHeight: 1.6, borderRadius: 10, padding: 10, overflowX: 'auto', margin: 0 }}>
                    {JSON.stringify(data, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}

          {/* 유틸 탭 */}
          {tab === 'utils' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'QueryClient 캐시 초기화', sub: 'TanStack Query 캐시 삭제',       color: '#5058f0', bg: 'rgba(80,88,240,0.08)',   action: () => { queryClient.clear(); showToast('캐시 초기화됨'); } },
                { label: '로그아웃',                sub: '인증 상태 초기화',                color: '#e8b94a', bg: 'rgba(232,185,74,0.08)',  action: () => { logout(); showToast('로그아웃됨'); } },
                { label: 'Meal Store 초기화',       sub: '업로드 진행 상태 리셋',            color: '#6a6a6a', bg: 'rgba(106,106,106,0.08)', action: () => { mealStore.reset(); showToast('Meal 초기화됨'); } },
                { label: '전체 초기화',             sub: '스토어 + localStorage 모두 삭제', color: '#e85d4a', bg: 'rgba(232,93,74,0.08)',   action: () => { logout(); mealStore.reset(); setCurrentGroupId(null); queryClient.clear(); try { localStorage.clear(); } catch {} showToast('전체 초기화됨'); } },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={item.action}
                  style={{
                    background: '#fff', border: '1px solid #e0d8cc', borderRadius: 12,
                    padding: '10px 12px', display: 'flex', alignItems: 'center',
                    gap: 12, cursor: 'pointer', textAlign: 'left', width: '100%',
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Trash2 size={16} color={item.color} />
                  </div>
                  <div>
                    <p style={{ fontFamily: '"KERIS-KEDU", sans-serif', fontWeight: 700, fontSize: 14, color: item.color, margin: 0 }}>{item.label}</p>
                    <p style={{ fontFamily: '"Nanum-Myeongjo", serif', fontSize: 11, color: '#9a9a9a', margin: 0 }}>{item.sub}</p>
                  </div>
                </button>
              ))}

              {/* 개발자 모드 토글 */}
              <div style={{
                background: devMode ? 'rgba(80,88,240,0.06)' : '#fff',
                border: `2px solid ${devMode ? '#5058f0' : '#e0d8cc'}`,
                borderRadius: 12, padding: 12, marginTop: 4,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Monitor size={14} color={devMode ? '#5058f0' : '#9a9a9a'} />
                  <p style={{ fontFamily: 'monospace', fontSize: 10, color: devMode ? '#5058f0' : '#9a9a9a', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>DEV MODE</p>
                  {devMode && (
                    <span style={{ background: '#5058f0', color: '#fff', fontSize: 9, fontWeight: 700, padding: '1px 7px', borderRadius: 999, fontFamily: 'monospace' }}>ON</span>
                  )}
                </div>
                <p style={{ fontFamily: '"Nanum-Myeongjo", serif', fontSize: 11, color: '#6a6a6a', marginBottom: 10, lineHeight: 1.5, margin: '0 0 10px' }}>
                  {devMode
                    ? '오른쪽 패널에서 API 로그, AI 분석, 상태를 확인하세요.'
                    : '활성화하면 화면 오른쪽에 개발자 패널이 표시됩니다.'}
                </p>
                <button
                  onClick={() => {
                    const next = !devMode;
                    setDevMode(next);
                    showToast(next ? '개발자 모드 켜짐' : '개발자 모드 꺼짐');
                    if (next) close();
                  }}
                  style={{
                    width: '100%', height: 40, borderRadius: 10, border: 'none',
                    background: devMode ? '#e85d4a' : '#5058f0',
                    cursor: 'pointer',
                    fontFamily: '"KERIS-KEDU", sans-serif', fontWeight: 700, fontSize: 14, color: '#fff',
                  }}
                >
                  {devMode ? '개발자 모드 끄기' : '개발자 모드 켜기'}
                </button>
              </div>

              <div style={{ background: '#fff', border: '1px solid #e0d8cc', borderRadius: 12, padding: 12, marginTop: 4 }}>
                <p style={{ fontFamily: '"Nanum-Myeongjo", serif', fontSize: 10, color: '#9a9a9a', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>빌드 정보</p>
                {[['Next.js', '14 App Router'], ['Tailwind CSS', '3.x'], ['환경', process.env.NODE_ENV ?? '-']].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                    <span style={{ fontFamily: '"Nanum-Myeongjo", serif', fontSize: 12, color: '#6a6a6a' }}>{k}</span>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#1a1a1a' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 하단 힌트 */}
        <div style={{ borderTop: '1px solid #ece7dd', background: '#fff', padding: '8px', textAlign: 'center', flexShrink: 0 }}>
          <p style={{ fontFamily: '"Nanum-Myeongjo", serif', fontSize: 10, color: '#9a9a9a', margin: 0 }}>ESC 또는 배경 클릭으로 닫기</p>
        </div>
      </div>

      {/* 토스트 */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
          background: '#1a1a1a', color: '#fff',
          fontFamily: '"KERIS-KEDU", sans-serif', fontSize: 13,
          padding: '8px 20px', borderRadius: 999,
          zIndex: 100000, whiteSpace: 'nowrap',
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        }}>
          {toast}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>,
    document.body
  );
}
