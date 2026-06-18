'use client';

export function DecoBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden>
      {/* 좌상단 큰 블롭 - 코발트 */}
      <div
        className="absolute -top-24 -left-24 w-72 h-72 rounded-full opacity-[0.07]"
        style={{ background: '#5058f0', filter: 'blur(60px)' }}
      />
      {/* 우상단 블롭 - 피치 */}
      <div
        className="absolute -top-10 -right-16 w-56 h-56 rounded-full opacity-[0.10]"
        style={{ background: '#ffb084', filter: 'blur(50px)' }}
      />
      {/* 중앙 좌측 블롭 - 세이지 */}
      <div
        className="absolute top-[35%] -left-20 w-48 h-48 rounded-full opacity-[0.08]"
        style={{ background: '#70b080', filter: 'blur(55px)' }}
      />
      {/* 중앙 우측 블롭 - 라벤더 */}
      <div
        className="absolute top-[45%] -right-12 w-40 h-40 rounded-full opacity-[0.09]"
        style={{ background: '#c0c0f0', filter: 'blur(45px)' }}
      />
      {/* 하단 블롭 - 오크라 */}
      <div
        className="absolute -bottom-16 left-1/3 w-60 h-48 rounded-full opacity-[0.07]"
        style={{ background: '#e8b94a', filter: 'blur(60px)' }}
      />

      {/* 구름 모양 SVG */}
      <svg
        className="absolute top-16 right-4 opacity-[0.06] w-32 h-20"
        viewBox="0 0 200 120"
        fill="#5058f0"
      >
        <ellipse cx="100" cy="80" rx="90" ry="40" />
        <ellipse cx="70" cy="60" rx="50" ry="45" />
        <ellipse cx="130" cy="65" rx="45" ry="40" />
        <ellipse cx="100" cy="55" rx="40" ry="38" />
      </svg>

      <svg
        className="absolute top-[30%] left-2 opacity-[0.05] w-24 h-16"
        viewBox="0 0 200 120"
        fill="#ffb084"
      >
        <ellipse cx="100" cy="80" rx="90" ry="40" />
        <ellipse cx="70" cy="60" rx="50" ry="45" />
        <ellipse cx="130" cy="65" rx="45" ry="40" />
        <ellipse cx="100" cy="55" rx="40" ry="38" />
      </svg>

      <svg
        className="absolute bottom-32 right-6 opacity-[0.05] w-28 h-18"
        viewBox="0 0 200 120"
        fill="#70b080"
      >
        <ellipse cx="100" cy="80" rx="90" ry="40" />
        <ellipse cx="60" cy="58" rx="55" ry="48" />
        <ellipse cx="140" cy="62" rx="48" ry="42" />
        <ellipse cx="100" cy="50" rx="42" ry="40" />
      </svg>

      {/* 점 패턴 */}
      <svg
        className="absolute top-[15%] left-[60%] opacity-[0.06] w-20 h-20"
        viewBox="0 0 80 80"
      >
        {[0, 1, 2, 3].map(row =>
          [0, 1, 2, 3].map(col => (
            <circle
              key={`${row}-${col}`}
              cx={10 + col * 20}
              cy={10 + row * 20}
              r="3"
              fill="#5058f0"
            />
          ))
        )}
      </svg>

      <svg
        className="absolute bottom-[25%] left-[10%] opacity-[0.05] w-16 h-16"
        viewBox="0 0 80 80"
      >
        {[0, 1, 2].map(row =>
          [0, 1, 2].map(col => (
            <circle
              key={`${row}-${col}`}
              cx={13 + col * 27}
              cy={13 + row * 27}
              r="3.5"
              fill="#e8b94a"
            />
          ))
        )}
      </svg>

      {/* 웨이브 라인 */}
      <svg
        className="absolute top-[55%] left-0 right-0 w-full opacity-[0.04]"
        viewBox="0 0 480 40"
        preserveAspectRatio="none"
      >
        <path
          d="M0,20 C60,5 120,35 180,20 C240,5 300,35 360,20 C420,5 450,30 480,20"
          stroke="#5058f0"
          strokeWidth="2"
          fill="none"
        />
      </svg>
      <svg
        className="absolute top-[60%] left-0 right-0 w-full opacity-[0.03]"
        viewBox="0 0 480 40"
        preserveAspectRatio="none"
      >
        <path
          d="M0,20 C80,35 160,5 240,20 C320,35 400,5 480,20"
          stroke="#ffb084"
          strokeWidth="2"
          fill="none"
        />
      </svg>
    </div>
  );
}
