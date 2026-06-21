# 먹로그 — 기능별 상세 명세 & UI 구현 가이드

> **Claude Code 작업 지시 문서 #4**
> 각 화면의 컴포넌트 구조, 상태 관리, UI 흐름을 상세히 정의합니다.
> 모든 컴포넌트는 TypeScript + Tailwind CSS + shadcn/ui로 작성합니다.

---

## 1. 앱 전체 레이아웃

### 하단 탭 바 구성 (v1.5 — 4탭)
```
┌─────────────────────────────────────────────────┐
│                    콘텐츠 영역                    │
│                                                 │
└─────────────────────────────────────────────────┘
┌──────────┬──────────┬──────────────┬────────────┐
│    📷    │    📊    │      ✨      │     👥     │
│  카메라  │   분석   │   AI 코치   │    그룹    │
└──────────┴──────────┴──────────────┴────────────┘
```

> **v1.5 변경:** AI 코치 탭 추가 (분석과 그룹 사이).
> **v1.4 변경:** 로그 탭과 비교 탭을 제거하고 3탭으로 단순화.
> /log → /group 리다이렉트, /compare → /group 리다이렉트.

### 라우팅 구조
```
/                        → 기본 홈 (/camera 리다이렉트)
/login                   → 로그인 페이지
/onboarding              → 신체 정보 입력 (최초 로그인 시 자동 이동)
/camera                  → 카메라/업로드 탭
/analysis                → 칼로리 분석 탭 (일별/주간 탭 전환, PNG 내보내기)
/ai-coach                → AI 코치 탭 (맞춤 식단 / 운동 루틴)
/group                   → 그룹 목록 탭
/group/[groupId]         → 특정 그룹 상세 (피드 + 랭킹 탭 전환)
/settings                → 설정 (신체정보 수정 + 식사 알림 + 로그아웃)
/log                     → /group 리다이렉트 (v1.4 제거)
/compare                 → /group 리다이렉트 (v1.4 제거)
/meal/[mealId]           → 식사 상세 페이지 (소유자 편집 모드 포함)

미들웨어 (middleware.ts):
  인증 미보호: /login, /api/auth/**
  보호: /camera, /analysis, /group, /log, /ai-coach, /settings, /onboarding, /meal, /compare
```

### BottomTabBar 컴포넌트
```tsx
// components/layout/BottomTabBar.tsx
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Camera, BarChart2, Users, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/camera',   icon: Camera,    label: '카메라'  },
  { href: '/analysis', icon: BarChart2, label: '분석'    },
  { href: '/ai-coach', icon: Sparkles,  label: 'AI 코치' },
  { href: '/group',    icon: Users,     label: '그룹'    },
];

export function BottomTabBar() {
  const pathname = usePathname();
  const router   = useRouter();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-50
                    bg-surface-card border-t border-hairline flex items-center justify-around h-16 px-2">
      {TABS.map(({ href, icon: Icon, label }) => {
        const isActive = pathname.startsWith(href);
        return (
          <button
            key={href}
            onClick={() => router.push(href)}
            className={cn(
              'flex flex-col items-center gap-[3px] px-3 py-2 rounded-xl transition-all duration-150 min-w-[44px] min-h-[44px] justify-center',
              isActive ? 'text-cobalt' : 'text-muted'
            )}
          >
            <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
            <span className={cn('font-kedu text-[11px] leading-none', isActive ? 'font-bold' : 'font-normal')}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
```

---

## 2. 로그인 페이지 (`/login`)

### UI 구조
```
┌─────────────────────────────────────────┐
│                                         │
│           🍽️ 먹로그                      │
│     오늘 뭐 먹었는지 같이 기록해요          │
│                                         │
│    ┌─────────────────────────────────┐  │
│    │  G  Google로 계속하기            │  │
│    └─────────────────────────────────┘  │
│                                         │
│    친구들과 식단을 실시간으로 비교해보세요   │
│                                         │
└─────────────────────────────────────────┘
```

### 구현 코드 패턴
```tsx
// app/(auth)/login/page.tsx
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
      <div className="w-full max-w-sm space-y-8">
        {/* 로고 & 타이틀 */}
        <div className="text-center">
          <div className="text-6xl mb-4">🍽️</div>
          <h1 className="text-3xl font-bold text-gray-900">먹로그</h1>
          <p className="mt-2 text-gray-500">오늘 뭐 먹었는지 같이 기록해요</p>
        </div>

        {/* Google 로그인 버튼 */}
        <Button
          onClick={() => signIn('google', { callbackUrl: '/camera' })}
          className="w-full h-12 bg-white text-gray-700 border border-gray-300
                     hover:bg-gray-50 shadow-sm font-medium gap-3"
          variant="outline"
        >
          {/* Google SVG 아이콘 */}
          <GoogleIcon />
          Google로 계속하기
        </Button>

        {/* 부가 설명 */}
        <p className="text-center text-xs text-gray-400">
          친구들과 식단을 실시간으로 비교해보세요
        </p>
      </div>
    </div>
  );
}
```

---

## 3. 카메라 탭 (`/camera`) — 핵심 기능

### 전체 업로드 플로우
```
Step 1: 사진 선택/촬영
  ↓
Step 2: 식사 카테고리 선택 (아침/점심/저녁/간식)
  ↓ (시간 기반 자동 추천)
Step 3: AI 분석 중 (로딩)
  ↓
Step 4: 분석 결과 확인 & 수정
  ↓
Step 5: 저장 완료
```

### UI 단계별 구조
```
─── Step 1: 사진 선택 ───────────────────────────
┌─────────────────────────────────────────────┐
│                                             │
│   ┌─────────────────────────────────────┐   │
│   │                                     │   │
│   │        📷 사진을 찍거나              │   │
│   │           업로드하세요               │   │
│   │                                     │   │
│   │    [카메라 촬영]    [갤러리 선택]     │   │
│   └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘

─── Step 3: AI 분석 중 ──────────────────────────
┌─────────────────────────────────────────────┐
│  ┌──────────────────────────────────────┐   │
│  │    [업로드한 음식 사진 미리보기]       │   │
│  └──────────────────────────────────────┘   │
│                                             │
│         🔍 AI가 음식을 분석하고 있어요...    │
│         [████████░░░░░░░░░░] 60%           │
│                                             │
└─────────────────────────────────────────────┘

─── Step 4: 결과 확인 ───────────────────────────
┌─────────────────────────────────────────────┐
│  [음식 사진]                                 │
│                                             │
│  AI 분석 결과                                │
│  ┌─────────────────────────────────────┐   │
│  │ 🍚 흰쌀밥      200g   260 kcal  [✏️] │   │
│  │ 🥩 제육볶음    200g   520 kcal  [✏️] │   │
│  │ 🍲 된장국      200g   120 kcal  [✏️] │   │
│  │ 🥬 김치        100g    30 kcal  [✏️] │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  한 끼 합계:  930 kcal                      │
│  탄: 100g  단: 48g  지: 36g                 │
│                                             │
│  [+ 음식 추가]    [오늘 목표의 42%]           │
│                                             │
│  [캡션 입력...]                              │
│                                             │
│  ────────────────────────────────────────  │
│              [저장하기]                      │
└─────────────────────────────────────────────┘
```

### MealUploadForm 컴포넌트 상태 관리
```tsx
// hooks/useMealUpload.ts
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AIAnalysisResult, DetectedFood, MealType } from '@/types';

type UploadStep = 'select' | 'category' | 'analyzing' | 'review' | 'done';

export function useMealUpload() {
  const queryClient = useQueryClient();

  const [step, setStep] = useState<UploadStep>('select');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mealType, setMealType] = useState<MealType>(getAutoMealType());
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);
  const [editedFoods, setEditedFoods] = useState<DetectedFood[]>([]);
  const [caption, setCaption] = useState('');

  // 파일 선택 핸들러
  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setStep('category');
  };

  // 업로드 + AI 분석 뮤테이션
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error('No file selected');

      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('meal_type', mealType);
      if (caption) formData.append('caption', caption);

      const res = await api.post('/meals', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          // 진행률 업데이트
        }
      });
      return res.data;
    },
    onSuccess: (data) => {
      setAiResult(data.data.ai_result);
      setEditedFoods(data.data.ai_result.detected_foods);
      setStep('review');
    },
    onError: () => {
      setStep('select'); // 실패 시 처음으로
    }
  });

  // 음식 수정 저장 뮤테이션
  const saveMutation = useMutation({
    mutationFn: (mealId: string) =>
      api.patch(`/meals/${mealId}/foods`, { detected_foods: editedFoods }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals'] });
      queryClient.invalidateQueries({ queryKey: ['daily-summary'] });
      setStep('done');
    }
  });

  return {
    step, selectedFile, previewUrl, mealType, setMealType,
    aiResult, editedFoods, setEditedFoods, caption, setCaption,
    handleFileSelect,
    startAnalysis: uploadMutation.mutate,
    saveEdits: saveMutation.mutate,
    isAnalyzing: uploadMutation.isPending,
    isSaving: saveMutation.isPending,
  };
}

// 현재 시간 기반 식사 카테고리 자동 추천
function getAutoMealType(): MealType {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 11)  return 'breakfast';
  if (hour >= 11 && hour < 16) return 'lunch';
  if (hour >= 16 && hour < 21) return 'dinner';
  return 'snack';
}
```

---

## 4. 로그 탭 (`/log`)

### UI 구조
```
┌─────────────────────────────────────────┐
│  < 2026년 5월 >                          │
│  ← [  24일  ] →                         │ ← 좌우 슬라이드로 날짜 이동
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ 아침    📷[사진]   430 kcal       │  │
│  │         오트밀, 바나나, 아몬드밀크  │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │ 점심    📷[사진]   780 kcal       │  │
│  │         흰쌀밥, 제육볶음, 된장국   │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │ 저녁    (기록 없음)                │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │ 간식    📷[사진]   330 kcal       │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ─────────────────────────────────────  │
│  하루 합계: 1,540 / 2,200 kcal          │
│  [████████████░░░░░░░] 70%             │
│  탄: 195g  단: 88g  지: 42g            │
└─────────────────────────────────────────┘
```

### 구현 포인트
```tsx
// hooks/useDailyLog.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { format, addDays, subDays } from 'date-fns';

export function useDailyLog(date: Date) {
  const dateStr = format(date, 'yyyy-MM-dd');

  const { data, isLoading } = useQuery({
    queryKey: ['meals', dateStr],
    queryFn: () => api.get(`/meals?date=${dateStr}`).then(r => r.data.data),
    staleTime: 1000 * 60 * 5, // 5분 캐시
  });

  return { meals: data?.meals ?? [], dailyTotal: data?.daily_total, isLoading };
}
```

---

## 5. 칼로리 분석 탭 (`/analysis`)

### UI 구조
```
┌─────────────────────────────────────────┐
│  내 칼로리 분석               2026.05.24 │
│                                         │
│  BMI                                    │
│  ┌─────────────────────────────────┐   │
│  │  키 175cm  몸무게 70kg           │   │
│  │  BMI: 22.9  ✅ 정상 범위        │   │
│  └─────────────────────────────────┘   │
│                                         │
│  오늘 섭취량                            │
│  ┌─────────────────────────────────┐   │
│  │  1,540 / 2,200 kcal             │   │
│  │  [██████████░░░░░░░] 70%       │   │
│  │  남은 섭취량: 660 kcal          │   │
│  └─────────────────────────────────┘   │
│                                         │
│  영양소 분석                            │
│  ┌──────────┬──────────┬───────────┐   │
│  │ 탄수화물 │  단백질  │   지방    │   │
│  │  195g    │   88g    │   42g     │   │
│  │  55%     │   22%    │   23%     │   │
│  └──────────┴──────────┴───────────┘   │
│  [도넛 차트 - 탄단지 비율]               │
│                                         │
│  ⚙️ 목표 설정 변경                      │
└─────────────────────────────────────────┘
```

### 칼로리 계산 유틸
```typescript
// lib/utils.ts
export function calculateBMR(
  weight: number, height: number, age: number, gender: 'male' | 'female'
): number {
  const base = 10 * weight + 6.25 * height - 5 * age;
  return gender === 'male' ? base + 5 : base - 161;
}

const ACTIVITY_FACTORS = {
  sedentary:   1.2,
  light:       1.375,
  moderate:    1.55,
  active:      1.725,
  very_active: 1.9,
} as const;

export function calculateTDEE(
  bmr: number,
  activityLevel: keyof typeof ACTIVITY_FACTORS
): number {
  return Math.round(bmr * ACTIVITY_FACTORS[activityLevel]);
}

export function calculateTargetCalories(
  tdee: number,
  goalType: 'lose' | 'maintain' | 'gain'
): number {
  const adjustments = { lose: -500, maintain: 0, gain: 300 };
  return Math.max(1200, tdee + adjustments[goalType]);
}

export function calculateBMI(weight: number, height: number): number {
  const heightM = height / 100;
  return Math.round((weight / (heightM * heightM)) * 10) / 10;
}

export function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return '저체중';
  if (bmi < 23.0) return '정상';
  if (bmi < 25.0) return '과체중';
  return '비만';
}
```

---

## 6. 그룹 탭 (`/group`)

### 그룹 없을 때 (신규)
```
┌─────────────────────────────────────────┐
│  그룹                                   │
│                                         │
│        아직 그룹이 없어요                │
│        친구들을 초대해 같이 먹로그를      │
│        시작해보세요!                     │
│                                         │
│    [+ 새 그룹 만들기]                    │
│    [그룹 코드로 참가하기]                │
│                                         │
└─────────────────────────────────────────┘
```

### 그룹 피드 (그룹 있을 때)
```
┌─────────────────────────────────────────┐
│  다이어트 챌린지 👥4              AB3X9K │ ← 그룹명 + 인원 + 코드 복사
│  ← [  2026.05.24  ] →                  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ 👤 민수   점심   12:35            │  │
│  │ ┌─────────────────────────────┐  │  │
│  │ │     [음식 사진]              │  │  │
│  │ │     720 kcal               │  │  │
│  │ └─────────────────────────────┘  │  │
│  │ 👍2  😋3  🔥1     💬 댓글 3개   │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ 👤 서영   아침   08:15            │  │
│  │ ┌─────────────────────────────┐  │  │
│  │ │     [음식 사진]              │  │  │
│  │ │     430 kcal               │  │  │
│  │ └─────────────────────────────┘  │  │
│  │ 😋1                💬 댓글 0개   │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### GroupFeed 컴포넌트 핵심 구현
```tsx
// components/group/GroupFeed.tsx
'use client';

import { useGroupRealtime } from '@/hooks/useGroupRealtime';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { MealCard } from '@/components/meal/MealCard';
import { format } from 'date-fns';

interface Props {
  groupId: string;
  date: Date;
}

export function GroupFeed({ groupId, date }: Props) {
  const dateStr = format(date, 'yyyy-MM-dd');

  // Supabase Realtime으로 새 업로드 자동 반영
  useGroupRealtime(groupId);

  const { data, isLoading } = useQuery({
    queryKey: ['group-feed', groupId, dateStr],
    queryFn: () => api.get(`/groups/${groupId}/feed?date=${dateStr}`).then(r => r.data.data),
  });

  if (isLoading) return <FeedSkeleton />;

  return (
    <div className="space-y-4 pb-20">
      {data?.meals.map((meal) => (
        <MealCard key={meal.id} meal={meal} showUser />
      ))}
      {data?.meals.length === 0 && (
        <EmptyFeedMessage />
      )}
    </div>
  );
}
```

---

## 7. 그룹 랭킹 탭 (`/group/[groupId]` → 랭킹 탭) — v1.4 변경

> **v1.4 변경:** 독립 `/compare` 탭 → 각 그룹 상세 페이지(`/group/[groupId]`) 내 "랭킹" 탭으로 통합.
> 소셜 그룹에만 피드/랭킹 탭 전환 버튼 표시. 개인 하루로그는 피드만.

### UI 구조
```
┌─────────────────────────────────────────┐
│  다이어트 챌린지   [AB3X9K 복사] [⚙️]   │ ← 오너에게만 설정 기어 표시
│                                         │
│  ┌─────────────┐ ┌─────────────┐        │
│  │    피드     │ │    랭킹     │  ← 탭   │
│  └─────────────┘ └─────────────┘        │
│  ← [ 2026.06.21 ] →                    │
│                                         │
│  그룹 평균: 1,503 kcal                  │
│                                         │
│  🥇 민수   2,150 / 2,000kcal   108%    │
│       [███████████████████░] 108%      │
│                                         │
│  🥈 서영   1,820 / 2,000kcal    91%    │
│       [████████████████░░░░]  91%      │
│                                         │
│  🥉 지훈   1,540 / 2,100kcal    73%    │
│       [█████████████░░░░░░░]  73%      │
│                                         │
│  😅 지은      0 / 1,800kcal      0%    │
│       [░░░░░░░░░░░░░░░░░░░░]   0%      │
└─────────────────────────────────────────┘
```

### CalorieRanking 컴포넌트
```tsx
// components/group/CalorieRanking.tsx
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Progress } from '@/components/ui/progress';
import { Avatar } from '@/components/ui/avatar';
import type { DailyCalorieSummary } from '@/types';

const RANK_EMOJIS = ['🥇', '🥈', '🥉'];

interface RankingRowProps {
  rank: number;
  summary: DailyCalorieSummary;
  isMe: boolean;
}

function RankingRow({ rank, summary, isMe }: RankingRowProps) {
  const percent = Math.min(Math.round(summary.achievementRate), 200);
  const isOver = summary.achievementRate > 100;

  return (
    <div className={`p-4 rounded-xl ${isMe ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-xl">{RANK_EMOJIS[rank - 1] ?? rank + '위'}</span>
        <Avatar src={summary.avatarUrl} size={32} />
        <span className="font-semibold text-gray-800">{summary.name}</span>
        {isMe && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">나</span>}
        <div className="ml-auto text-right">
          <span className="font-bold text-gray-900">
            {summary.totalCalories.toLocaleString()} kcal
          </span>
          <span className={`ml-2 text-sm font-semibold ${isOver ? 'text-red-500' : 'text-green-600'}`}>
            {Math.round(summary.achievementRate)}%
          </span>
        </div>
      </div>
      <Progress
        value={Math.min(percent, 100)}
        className={`h-2 ${isOver ? '[&>div]:bg-red-400' : '[&>div]:bg-green-400'}`}
      />
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>탄 {summary.totalCarbs}g</span>
        <span>단 {summary.totalProtein}g</span>
        <span>지 {summary.totalFat}g</span>
        <span>목표 {summary.targetCalories?.toLocaleString() ?? '미설정'}</span>
      </div>
    </div>
  );
}
```

---

## 8. AI 분석 서비스 (백엔드) — GPT-4o Vision 3단계 추론

### 설계 개요
```
ai_service.py 핵심 구조:
  - SYSTEM_PROMPT: ~800줄 (STEP1·2·3 지시 + ~180종 음식 밀도표 + 탄단지 비율표)
  - FoodVisionService.analyze_image(): base64 인코딩 → OpenAI Chat Completions 호출
  - max_tokens: 3000 (멀티 음식 분석 충분히 커버)
  - 응답 JSON 파싱 후 detected_foods[] 형태로 반환
```

### 3단계 추론 흐름
```
STEP 1 — 크기 기준점 탐지
  사진에서 기준점 찾기: 그릇(한국 밥그릇 200g, 뚝배기 소 580g~대 980g),
  컵(테이크아웃 355ml), 손바닥(130g), 젓가락 길이(23cm) 등
  → 음식 실제 g/ml 측정

STEP 2 — 밀도 & 칼로리 결정
  조리 상태 판단 → 밀도표에서 kcal/100g 선택
  예시: 삼계탕 80kcal/100g (국물 포함), 돼지갈비 250kcal/100g (구이)
  → "density": 80, "reason": "삼계탕 국물이 포함되어 100g당 칼로리 낮음"

STEP 3 — 최종 계산
  calories = weight_g × kcal_per_100g ÷ 100
  carbs/protein/fat = calories × 비율 ÷ 4 (또는 ÷ 9 for fat)
  → 음식명·칼로리·탄단지·지방·1회제공량·debug 필드를 JSON으로 반환
```

### 반환 형태
```python
[
  {
    "food_name": "삼계탕",
    "serving_size": 800,       # g
    "calories": 640,
    "carbs": 40,               # g
    "protein": 72,             # g
    "fat": 19,                 # g
    "debug": {
      "step1_size": "뚝배기 중(780g) 기준",
      "step2_density": "80 kcal/100g (국물 포함)",
      "step3_calc": "780 × 80 ÷ 100 = 624"
    }
  }
]
```

### 핵심 구현 포인트
```python
# ai_service.py
response = await self.client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": [
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}},
            {"type": "text", "text": "위 음식을 분석해주세요."}
        ]}
    ],
    max_tokens=3000,
    response_format={"type": "json_object"},
)
```

---

## 9. 이미지 업로드 서비스

### cloudinary_service.py
```python
# backend/app/services/cloudinary_service.py
import cloudinary
import cloudinary.uploader
from app.config import settings

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET
)

async def upload_meal_image(image_bytes: bytes, user_id: str) -> dict:
    """
    Cloudinary에 음식 사진 업로드
    - 원본 저장
    - 썸네일 자동 생성 (300×300 크롭)
    """
    result = cloudinary.uploader.upload(
        image_bytes,
        folder=f"meallog/{user_id}",
        resource_type="image",
        transformation=[
            {"quality": "auto", "fetch_format": "auto"}  # 자동 최적화
        ],
        eager=[
            # 썸네일: 300×300 자동 크롭
            {
                "width": 300, "height": 300,
                "crop": "fill", "gravity": "auto",
                "quality": "auto", "fetch_format": "auto"
            }
        ],
        eager_async=True
    )

    return {
        "image_url": result["secure_url"],
        "thumbnail_url": result["eager"][0]["secure_url"] if result.get("eager") else result["secure_url"],
        "public_id": result["public_id"]
    }
```

---

## 10. 에러 처리 & 로딩 상태 컨벤션

### 프론트엔드 에러 처리 패턴
```tsx
// 모든 API 호출에 통일된 에러/로딩 처리
const { data, isLoading, isError, error } = useQuery({ ... });

if (isLoading) return <SkeletonComponent />;

if (isError) return (
  <div className="flex flex-col items-center py-12 text-gray-400">
    <span className="text-4xl mb-3">😵</span>
    <p>불러오는 데 실패했어요</p>
    <button onClick={() => refetch()} className="mt-3 text-green-600 text-sm">
      다시 시도
    </button>
  </div>
);
```

### 전역 API 에러 처리 (Axios 인터셉터)
```typescript
// lib/api.ts
import axios from 'axios';
import { getSession } from 'next-auth/react';
import { useAuthStore } from '@/store/authStore';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 30000,  // AI 분석은 시간이 걸릴 수 있어 30초
});

// getSession() 결과 60초 캐시 — 매 요청마다 네트워크 호출 방지
let _sessionCache: { token: string | null; ts: number } | null = null;

// 요청 인터셉터: 토큰 자동 첨부
// Zustand 스토어 토큰(개발 로그인) 우선, 없으면 NextAuth 세션 사용
api.interceptors.request.use(async (config) => {
  const storeToken = useAuthStore.getState().accessToken;
  if (storeToken) {
    config.headers.Authorization = `Bearer ${storeToken}`;
    return config;
  }
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

// 응답 인터셉터: 401 시 로그인 페이지로
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

---

## 11. 공통 UI 컴포넌트

### DatePickerModal (`components/ui/DatePickerModal.tsx`)
날짜 네비게이션이 있는 모든 페이지(로그·분석·비교·그룹 상세)에서 공용으로 사용하는 달력 모달.

```
동작:
  - 날짜 텍스트를 클릭 → 하단에서 슬라이드업
  - 월 ← → 으로 월 이동
  - 오늘 이후 날짜 비활성 (미래 선택 불가)
  - 일요일 coral, 토요일 cobalt 색상
  - 선택된 날짜: peach 배경
  - 오늘 날짜: peach 테두리
  - "오늘로 이동" 버튼
  - 바깥 영역 클릭 시 닫힘

Props:
  value: Date       // 현재 선택된 날짜
  onChange: (d: Date) => void
  onClose: () => void
```

적용 페이지: `/log`, `/analysis`, `/compare`, `/group/[groupId]`

```tsx
// 사용 패턴 (모든 날짜 네비 페이지 동일)
const [showPicker, setShowPicker] = useState(false);

{showPicker && (
  <DatePickerModal
    value={date}
    onChange={setDate}
    onClose={() => setShowPicker(false)}
  />
)}

<button onClick={() => setShowPicker(true)} className="font-jalnan text-base text-ink ...">
  {formatDisplayDate(date)}
</button>
```

### 카메라 탭 — 이중 파일 입력
카메라 버튼과 갤러리 버튼은 각각 별도의 `<input>` 을 사용한다.

```tsx
// 카메라 직접 촬영 (모바일에서 카메라 앱 열림)
<input ref={cameraInputRef} type="file" accept="image/*"
  capture="environment" className="hidden" onChange={handleFileChange} />

// 갤러리에서 선택 (파일 관리자)
<input ref={fileInputRef} type="file"
  accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
```

`capture="environment"` 속성이 없으면 모바일에서 카메라 대신 파일 관리자가 열린다.

---

## 12. 개발자 모드 (DevSidebar)

### 접근 경로
```
Ctrl + F11 → 비밀번호 확인 모달 → 유틸 탭 → [개발자 모드 켜기]
```

### 탭 구성
```
에러 콘솔 탭:
  - window.onerror, unhandledrejection, console.error 수집 (DevErrorListener)
  - type: 'runtime' | 'promise' | 'console'
  - ErrorLog: { id, type, message, stack?, timestamp }

네트워크 탭:
  - Axios 인터셉터로 모든 API 요청/응답 로그
  - ApiLog: { id, method, url, status, duration, requestData, responseData }
  - 상태코드별 색상 (2xx=sage, 4xx=ochre, 5xx=coral)

AI 분석 탭:
  - GPT-4o STEP1/2/3 추론 결과 시각화
  - AiDebug: { step1, step2, step3, foods[] }
  - 가장 최근 분석 결과만 유지

기타 탭:
  - 현재 페이지 경로, 인증 상태, 환경변수 노출
  - 디자인 토큰 (색상 팔레트) 미리보기
```

### UI 스펙
```
위치:      우측 고정 (position: fixed, right: 0)
너비:      드래그로 조절 (220px ~ 800px, 기본 360px)
배경:      cobalt (#5058f0) 헤더 + surface-card 본문
탭 헤더:   lavender (#c0c0f0) 활성 탭
z-index:  9999 (모든 UI 위)
토글:      X 버튼 또는 Ctrl+F11
```

---

---

## 13. 식사 상세 페이지 (`/meal/[mealId]`) — v1.3 추가

### 이모지 플로팅 애니메이션
```tsx
// 리액션 버튼 클릭 → spawnEmojis() 호출
type FloatingEmoji = { id: number; emoji: string; x: number; y: number; drift: number; delay: number };

const spawnEmojis = (emoji: string, btn: HTMLButtonElement) => {
  const rect = btn.getBoundingClientRect();
  const cx = rect.left + rect.width / 2 - 15;  // 버튼 중앙 기준 좌측 오프셋
  const cy = rect.top;
  const newEmojis = Array.from({ length: 3 }, (_, i) => ({
    id: Date.now() + i,
    emoji,
    x: cx + (Math.random() - 0.5) * 6,   // ±3px 시작 분산
    y: cy,
    drift: (Math.random() - 0.5) * 70,    // ±35px 좌우 drift
    delay: i * 0.12,                       // 0.12s stagger
  }));
  setFloatingEmojis((prev) => [...prev, ...newEmojis]);
  setTimeout(() => { /* 2.2초 후 DOM 제거 */ }, 2200);
};

// 렌더링: position: fixed + pointer-events: none + z-50
{floatingEmojis.map((fe) => (
  <span
    key={fe.id}
    className="fixed pointer-events-none select-none text-2xl z-50 animate-float-emoji"
    style={{ left: fe.x, top: fe.y, '--emoji-drift': `${fe.drift}px`, animationDelay: `${fe.delay}s` }}
  >
    {fe.emoji}
  </span>
))}
```

**globals.css 키프레임:**
```css
@keyframes floatEmojiUp {
  0%   { transform: translateY(0) translateX(0) scale(1.2); opacity: 1; }
  60%  { opacity: 1; }
  100% { transform: translateY(-200px) translateX(var(--emoji-drift, 0px)) scale(0.5); opacity: 0; }
}
.animate-float-emoji { animation: floatEmojiUp 1.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; }
```

### 프로필 사진 비율 수정
댓글·작성자 아바타에 `object-cover` + `overflow-hidden` wrapper 적용.
`avatarUrl` 없을 때 이름 첫 글자 ochre 배경 원 fallback.

```tsx
<div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
  {avatarUrl ? (
    <Image src={avatarUrl} width={28} height={28} className="object-cover w-full h-full" />
  ) : (
    <div className="w-full h-full bg-ochre flex items-center justify-center font-kedu font-bold text-xs text-white">
      {name[0]}
    </div>
  )}
</div>
```

### 식사 사진 하단 라운딩
```tsx
<div className="relative w-full aspect-[4/3] bg-surface-soft rounded-b-2xl overflow-hidden">
  <Image src={meal.imageUrl} alt="식사 사진" fill className="object-cover" />
</div>
```

---

---

## 14. 그룹 설정 모달 (`GroupSettingsModal`) — v1.4 추가

### 접근 경로
그룹 상세(`/group/[groupId]`) 헤더 우측 ⚙️ 버튼 → 오너(owner)에게만 표시.

### UI 구조
```
┌─────────────────────────────────────────┐
│  그룹 설정                           ✕  │
│                                         │
│  그룹 이름                              │
│  ┌─────────────────────────────────┐   │
│  │ 다이어트 챌린지               ✕  │   │
│  └─────────────────────────────────┘   │
│  최대 30자                              │
│                                         │
│  인원 제한         현재 4명             │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐       │
│  │ 2│ │ 3│ │ 4│ │ 5│ │ 6│ │ 7│       │
│  └──┘ └──┘ └──┘ └──┘ └──┘ └──┘       │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐       │
│  │ 8│ │ 9│ │10│ │11│ │12│          │  │
│  └──┘ └──┘ └──┘ └──┘ └──┘          │  │
│                                         │
│          [   저장하기   ]               │
└─────────────────────────────────────────┘
```

### 동작 규칙
- 그룹명: 1~30자, 빈 문자열 불허
- 인원 제한: 2~12명, 현재 멤버 수보다 낮게 설정 불가
- 변경 없으면 저장 버튼 비활성
- 저장 성공 시 `['group', groupId]` 쿼리 무효화 → 헤더 그룹명 즉시 갱신

### API
```
PATCH /groups/{group_id}
Body: { group_name?: string, max_members?: number }
→ 오너만 허용, 개인 그룹(is_personal=true) 수정 불가
```

### z-index
`z-[200]` — 하단 탭바(`z-50`)보다 앞에 위치해야 함.

---

## 15. AI 서비스 개선 — v1.4 추가

### 칼로리 보정 (`_correct_calories`)
GPT-4o가 `(탄수화물+단백질+지방)` 그램 합계를 칼로리로 반환하는 오류 자동 수정.

```python
def _correct_calories(self, foods: list) -> list:
    for f in foods:
        carbs, protein, fat = float(f.get("carbs",0)), float(f.get("protein",0)), float(f.get("fat",0))
        gram_sum = carbs + protein + fat
        cal = float(f.get("calories", 0))
        # 칼로리가 그램합과 5% 이내면 잘못 계산된 것으로 판단
        if gram_sum > 0 and abs(cal - gram_sum) / gram_sum < 0.05:
            f["calories"] = round(carbs * 4 + protein * 4 + fat * 9)
    return foods
```

### 중복 제거 (`_deduplicate_foods`)
AI가 같은 음식을 여러 번 반환할 때 자동 dedup.

```python
def _deduplicate_foods(self, foods: list) -> list:
    seen = set()
    result = []
    for f in foods:
        key = (f.get("food_name",""), float(f.get("serving_size",0)), int(f.get("calories",0)))
        if key not in seen:
            seen.add(key)
            result.append(f)
    return result
```

---

## 16. KST 시간 표시 — v1.4 추가

백엔드는 UTC naive datetime을 ISO 문자열로 반환 (`2026-06-21T09:30:00` — Z 없음).
프론트엔드에서 `+Z`를 붙여 UTC로 파싱 후 `Intl.DateTimeFormat`으로 KST 변환.

```typescript
// lib/utils.ts
export function formatTime(dateString: string): string {
  const normalized =
    dateString.endsWith('Z') || dateString.includes('+') ? dateString : dateString + 'Z';
  const date = new Date(normalized);
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Seoul',
  }).format(date);
}
```

---

---

## 17. AI 코치 페이지 (`/ai-coach`) — v1.5 추가

### UI 구조
```
┌─────────────────────────────────────────┐
│  AI 코치                            ⚙️  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ 🔥 체중 감량 목표                  │  │
│  │    175cm · 70kg · 보통 활동        │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌─────────────────┐ ┌─────────────────┐│
│  │  🍽️ 맞춤 식단   │ │  💪 운동 루틴   ││
│  └─────────────────┘ └─────────────────┘│
│                                         │
│  [✨ AI 맞춤 식단 추천받기]  [📥 저장]  │
│                                         │
│  총 권장 칼로리: 1,700 kcal             │
│  탄수 210g · 단백 90g · 지방 47g        │
│                                         │
│  🌅 아침   430kcal                      │
│  ─── 현미밥, 계란프라이, 김치...        │
│                                         │
│  ☀️ 점심   620kcal                      │
│  ─── 닭가슴살 도시락, 샐러드...         │
│                                         │
│  💡 영양사 팁                           │
│  • 탄수화물은 복합당질(현미·잡곡)...    │
└─────────────────────────────────────────┘
```

### 핵심 기능
- **신체 정보 요약 카드**: 목표·키·몸무게·활동량 한눈에 표시. 미입력 시 설정 안내.
- **식단 탭**: GPT-4o-mini가 아침/점심/저녁/간식 메뉴를 JSON으로 생성. 총 칼로리 + 매크로 표시.
- **운동 탭**: 1주일 요일별 스케줄(집중 부위, 운동목록, 소요시간, 휴식일) 생성.
- **운동명 구글 링크**: 각 운동명 클릭 → `google.com/search?q={운동명}+운동+방법` 새 탭.
- **PNG 내보내기**: 결과 생성 후 "저장" 버튼 → Canvas API로 고해상도(8x DPR) PNG 다운로드.
  - 식단 카드: 프로필·칼로리·매크로바·끼니별·팁 섹션
  - 운동 카드: 프로필·주간소모·요일별스케줄·팁 섹션
  - 공통: 먹로그 로고 + "powered by 먹로그" 워터마크
- **재추천**: 같은 탭에서 "다시 추천받기" 버튼으로 새 결과 생성 가능.

### API
```
POST /api/ai-coach  (Next.js API Route — 프론트엔드 → OpenAI 프록시)
Body: { type: 'diet' | 'exercise', profile: { age, gender, height, weight, activityLevel, goalType, targetCalories } }
Response: DietResult | ExerciseResult (JSON)
```

### 환경변수
```
OPENAI_API_KEY=sk-...   (프론트엔드 .env.local + Vercel 환경변수)
```

---

## 18. 즐겨찾기 기능 (`FoodSearchModal`) — v1.5 추가

음식 검색 모달에서 자주 먹는 음식을 별표(⭐)로 저장.

- **저장소**: `localStorage['food-favorites']` — `FoodSearchItem[]` JSON
- **탭**: "⭐ 즐겨찾기 N" 탭 추가 (기존 "전체" / "유저 등록 제외" + 신규)
- **토글**: 음식 카드 우측 별표 버튼 → 즐겨찾기 추가/해제
- **검색**: 즐겨찾기 탭에서도 음식명 검색 가능

---

## 19. 식사 알림 (`/settings` + `NotificationScheduler`) — v1.5 추가

브라우저 Notification API 기반 식사 시간 알림.

### 설정 흐름
1. 설정 탭 → "식사 알림" 섹션
2. 알림 권한 없으면 "알림 권한 허용" 버튼 표시
3. 아침/점심/저녁/간식 각각 토글 + 시간 입력
4. 설정은 `localStorage['meal-notifications']` 저장

### NotificationScheduler
- `app/(main)/layout.tsx`에 마운트 (모든 메인 페이지에서 동작)
- 마운트 시 오늘 남은 설정된 알림 시간에 `setTimeout` 예약
- 자정 넘으면 다음날 다시 예약
- `storage` 이벤트 감지 → 설정 변경 시 즉시 재예약

---

## 20. 식사 기록 수정 (`/meal/[mealId]`) — v1.5 추가

식사 상세 페이지에서 소유자만 음식 목록을 편집 가능.

### 편집 모드 진입
헤더 우측 연필(✏️) 아이콘 버튼 → 편집 모드 활성화.

### 편집 모드 UI
- 음식 행 우측 X 버튼으로 개별 삭제
- "음식 추가하기" 버튼 → FoodSearchModal 열림
- 실시간 합계 칼로리 표시 (수정 반영)
- 헤더: "저장" (✓) / "취소" (←) 버튼
- 편집 중에는 리액션·댓글 숨김

### API
```
PATCH /meals/{meal_id}/foods
Body: { detected_foods: DetectedFood[] }
→ 소유자만 허용
```

---

## 21. 하루 요약 카드 PNG 내보내기 (`/analysis`) — v1.5 추가

분석 탭 일별 뷰에서 "카드로 저장" 버튼 클릭 → `DailySummaryCardModal`.

### 카드 섹션
1. 먹로그 로고 + 날짜
2. 칼로리 달성률 (색상 코드: 110%↑ coral, 100%↑ cobalt, 80%↑ ochre, 그 외 sage)
3. 영양소 분포 (탄수/단백/지방 비율 바 + g 표시)
4. 끼니별 섭취 (프로그레스 바)
5. 섭취 음식 목록 (최대 10개)
6. "powered by 먹로그" 워터마크

### 기술
- Canvas API, DPR=8 (4K급 출력), 세로형 9:16 비율 보장
- PNG lossless 다운로드 (`canvas.toBlob`)
- 파일명: `먹로그_{날짜}.png`

---

*문서 버전: v1.5 | 최초 작성: 2026-06 | 최종 수정: 2026-06-22*
