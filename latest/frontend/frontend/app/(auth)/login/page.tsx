'use client';

import { signIn } from 'next-auth/react';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z" />
      <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z" />
      <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z" />
      <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.31z" />
    </svg>
  );
}

/* 앱의 세 가지 핵심 가치를 색상으로 상징화 */
const FEATURES = [
  {
    emoji: '📷',
    title: '사진 한 장',
    desc: '음식을 찍으면 끝',
    /* peach = 따뜻함, 식욕, 음식 포착의 순간 */
    bg: '#ffb084',
    text: '#1a1a1a',
  },
  {
    emoji: '🧠',
    title: 'AI 분석',
    desc: '칼로리 자동 계산',
    /* lavender = 기술, AI, 분석의 색 */
    bg: '#c0c0f0',
    text: '#1a1a1a',
  },
  {
    emoji: '👥',
    title: '그룹 공유',
    desc: '같이 먹는 재미',
    /* cobalt = 신뢰, 커뮤니티, 연결 */
    bg: '#5058f0',
    text: '#ffffff',
  },
];

export default function LoginPage() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: '#f9f6f1' }}
    >
      {/* 상단 히어로 영역 — 접시를 중심으로 하루의 식사를 표현 */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-6">

        {/* 접시 일러스트 — 이 앱의 본질: 식사를 기록하는 공간 */}
        <div
          className="relative flex items-center justify-center mb-8 animate-fade-slide-up"
          style={{ width: 160, height: 160 }}
        >
          {/* 접시 외곽 림 — 천천히 회전하며 "언제나 준비된 상태"를 표현 */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              border: '2px solid rgba(255,176,132,0.4)',
              animation: 'spinSlow 25s linear infinite',
            }}
          />
          {/* 접시 본체 */}
          <div
            className="absolute rounded-full bg-white shadow-sm"
            style={{ inset: 10 }}
          />
          {/* 접시 중심 오목한 부분 */}
          <div
            className="absolute rounded-full"
            style={{ inset: 28, background: '#f2ede4' }}
          />

          {/* 중앙 앱 아이덴티티 이모지 */}
          <span
            className="relative z-10 animate-float-slow"
            style={{ fontSize: 40 }}
          >
            🍽️
          </span>

          {/* 식사 시간대 이모지 — 하루의 식사 리듬을 접시 주위에 배치 */}
          {[
            { emoji: '🌅', angle: 0,   size: 20, label: '아침' },
            { emoji: '☀️', angle: 90,  size: 20, label: '점심' },
            { emoji: '🌙', angle: 180, size: 20, label: '저녁' },
            { emoji: '🍪', angle: 270, size: 18, label: '간식' },
          ].map(({ emoji, angle, size, label }) => {
            const rad = (angle * Math.PI) / 180;
            const r   = 74;
            const x   = Math.round((80 + r * Math.sin(rad) - 12) * 100) / 100;
            const y   = Math.round((80 - r * Math.cos(rad) - 12) * 100) / 100;
            return (
              <span
                key={label}
                className="absolute pointer-events-none select-none animate-float-slow"
                style={{
                  left: x, top: y,
                  fontSize: size,
                  opacity: 0.65,
                  animationDelay: `${angle / 90 * 0.6}s`,
                  animationDuration: `${3.5 + angle / 90 * 0.3}s`,
                }}
                title={label}
              >
                {emoji}
              </span>
            );
          })}
        </div>

        {/* 앱 이름과 슬로건 */}
        <div className="text-center mb-8 animate-fade-slide-up stagger-2">
          <h1
            className="font-kedu font-bold text-ink"
            style={{ fontSize: 38, letterSpacing: '-0.5px', lineHeight: 1.1 }}
          >
            먹로그
          </h1>
          <p
            className="font-kedu text-muted mt-2"
            style={{ fontSize: 15 }}
          >
            AI가 분석하는 나만의 식사 일기
          </p>
          {/* 영양소 균형 바 — 앱의 핵심 기능을 한 줄로 시각화 */}
          <div
            className="flex rounded-pill overflow-hidden mx-auto mt-3"
            style={{ width: 80, height: 4 }}
          >
            <div style={{ flex: 5, background: '#e8b94a' }} title="탄수화물" />
            <div style={{ flex: 3, background: '#70b080' }} title="단백질" />
            <div style={{ flex: 2, background: '#e85d4a' }} title="지방" />
          </div>
          <p className="font-myeong text-muted-soft mt-1" style={{ fontSize: 10 }}>
            탄수화물 · 단백질 · 지방 자동 분석
          </p>
        </div>

        {/* 세 가지 핵심 가치 카드 */}
        <div
          className="grid grid-cols-3 gap-3 w-full max-w-sm mb-8 animate-fade-slide-up stagger-3"
        >
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="flex flex-col items-center gap-2 rounded-xl py-4 px-2 animate-fade-slide-up"
              style={{
                background: f.bg,
                animationDelay: `${0.15 + i * 0.06}s`,
              }}
            >
              <span style={{ fontSize: 24 }}>{f.emoji}</span>
              <div className="text-center">
                <p
                  className="font-kedu font-bold"
                  style={{ fontSize: 12, color: f.text }}
                >
                  {f.title}
                </p>
                <p
                  className="font-kedu"
                  style={{ fontSize: 10, color: f.text, opacity: 0.7, marginTop: 2 }}
                >
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* 로그인 버튼 */}
        <div className="w-full max-w-sm space-y-3 animate-fade-slide-up stagger-4">
          <button
            onClick={() => signIn('google', { callbackUrl: '/camera' })}
            className="w-full h-13 bg-surface-card border border-hairline rounded-xl font-kedu font-bold flex items-center justify-center gap-3 active:scale-95 transition-transform shadow-sm"
            style={{ height: 52, fontSize: 15, color: '#1a1a1a' }}
          >
            <GoogleIcon />
            Google로 계속하기
          </button>

          <p
            className="text-center font-kedu text-muted"
            style={{ fontSize: 12 }}
          >
            로그인하면{' '}
            <span className="text-cobalt">식사 기록</span>과{' '}
            <span style={{ color: '#70b080' }}>건강 목표</span>가 저장돼요
          </p>
        </div>
      </div>

      {/* 하단 브랜딩 */}
      <div className="pb-8 text-center animate-fade-slide-up stagger-5">
        <p className="font-myeong text-muted-soft" style={{ fontSize: 11 }}>
          먹로그 · AI 식사 기록 앱
        </p>
      </div>
    </div>
  );
}
