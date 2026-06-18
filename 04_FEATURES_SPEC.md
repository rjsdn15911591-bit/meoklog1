# 먹로그 — 기능별 상세 명세 & UI 구현 가이드

> **Claude Code 작업 지시 문서 #4**
> 각 화면의 컴포넌트 구조, 상태 관리, UI 흐름을 상세히 정의합니다.
> 모든 컴포넌트는 TypeScript + Tailwind CSS + shadcn/ui로 작성합니다.

---

## 1. 앱 전체 레이아웃

### 하단 탭 바 구성
```
┌─────────────────────────────────────────┐
│                 콘텐츠 영역               │
│                                         │
│                                         │
└─────────────────────────────────────────┘
┌──────┬──────┬──────┬──────┬─────────────┐
│  📷  │  📋  │  📊  │  👥  │     🏆      │
│카메라│ 로그 │분석  │그룹  │칼로리비교   │
└──────┴──────┴──────┴──────┴─────────────┘
```

### 라우팅 구조
```
/                        → 기본 홈 (로그 탭 — 날짜별 개인 식단 기록)
/login                   → 로그인 페이지
/camera                  → 카메라/업로드 탭
/group                   → 그룹 피드 탭
/group/[groupId]         → 특정 그룹 피드
/compare                 → 그룹 칼로리 비교 탭
/meal/[mealId]           → 식사 상세 페이지

미들웨어 (middleware.ts):
  인증 미보호: /login, /api/auth/**
  그 외 모든 경로: NextAuth 세션 필요
```

### BottomTabBar 컴포넌트
```tsx
// components/layout/BottomTabBar.tsx
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Camera, BookOpen, BarChart2, Users, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/camera',   icon: Camera,    label: '카메라' },
  { href: '/log',      icon: BookOpen,  label: '로그'   },
  { href: '/analysis', icon: BarChart2, label: '분석'   },
  { href: '/group',    icon: Users,     label: '그룹'   },
  { href: '/compare',  icon: Trophy,    label: '비교'   },
];

export function BottomTabBar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200
                    flex items-center justify-around h-16 px-2 safe-area-pb">
      {TABS.map(({ href, icon: Icon, label }) => {
        const isActive = pathname.startsWith(href);
        return (
          <button
            key={href}
            onClick={() => router.push(href)}
            className={cn(
              'flex flex-col items-center gap-0.5 p-2 rounded-xl transition-colors',
              isActive
                ? 'text-green-600'
                : 'text-gray-400 hover:text-gray-600'
            )}
          >
            <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
            <span className="text-[10px] font-medium">{label}</span>
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

## 7. 칼로리 비교 탭 (`/compare`)

### UI 구조
```
┌─────────────────────────────────────────┐
│  칼로리 비교         2026.05.24          │
│  다이어트 챌린지                         │
│                                         │
│  그룹 평균: 1,503 kcal                  │
│                                         │
│  순위  이름    섭취    목표    달성율     │
│  ─────────────────────────────────────  │
│  🥇 민수   2,150  2,000   108%          │
│       [███████████████████░] 108%      │
│                                         │
│  🥈 서영   1,820  2,000    91%          │
│       [████████████████░░░░]  91%      │
│                                         │
│  🥉 지훈   1,540  2,100    73%          │
│       [█████████████░░░░░░░]  73%      │
│                                         │
│  😅 지은       0  1,800     0%          │
│       [░░░░░░░░░░░░░░░░░░░░]   0%      │
│                                         │
│              [← 어제]  [오늘 →]         │
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

*문서 버전: v1.2 | 최초 작성: 2026-06 | 최종 수정: 2026-06-18*
