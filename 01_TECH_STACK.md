# 먹로그 — 기술 스택 & 환경 설정

> **Claude Code 작업 지시 문서 #1**
> 코드를 작성하기 전 이 문서의 설정을 완전히 따르세요. 여기서 정의한 버전·라이브러리와 다른 것을 임의로 사용하지 마세요.

---

## 1. 기술 스택 결정 및 이유

### 프론트엔드

| 기술 | 버전 | 선택 이유 |
|------|------|---------|
| **Next.js** | 14.x (App Router) | SSR/SSG 지원, Vercel 최적 배포, 파일 기반 라우팅 |
| **TypeScript** | 5.x | 타입 안전성, 자동완성, 런타임 오류 사전 방지 |
| **Tailwind CSS** | 3.x | 빠른 스타일링, 유틸리티 클래스, 반응형 손쉬움 |
| **shadcn/ui** | latest | Radix UI 기반 접근성 보장 컴포넌트, Tailwind 호환 |
| **Zustand** | 4.x | 전역 상태관리 (Redux보다 단순, Context보다 성능 좋음) |
| **TanStack Query** | 5.x | 서버 상태 캐싱, 로딩/에러 핸들링 자동화 |

### 백엔드

| 기술 | 버전 | 선택 이유 |
|------|------|---------|
| **FastAPI** | 0.111.x | Python AI 생태계 통합, 자동 Swagger 문서, 비동기 지원 |
| **Python** | 3.11.x | AI/ML 라이브러리 호환성 최고 |
| **SQLAlchemy** | 2.x | ORM, Supabase PostgreSQL과 연동 |
| **Alembic** | latest | DB 마이그레이션 관리 |
| **Pydantic** | 2.x | 요청/응답 데이터 검증 (FastAPI 내장) |
| **python-jose** | latest | JWT 토큰 검증 (ExpiredSignatureError 구분 포함) |

### AI / ML

| 기술 | 버전 | 선택 이유 |
|------|------|---------|
| **OpenAI GPT-4o Vision** | API | 이미지 1장 → 3단계 추론(크기측정→밀도결정→칼로리계산) → JSON 반환. 별도 학습·데이터셋 불필요 |
| **httpx** | latest | 비동기 OpenAI API 호출 (asyncio 완전 호환) |

> **AI 분석 핵심:** SYSTEM_PROMPT에 ~180종 음식 밀도표(kcal/100g) + 탄단지 비율표 내장. GPT-4o가 크기 기준점 탐지→밀도 선택→g×density÷100 계산을 순차 수행.
> **확장 시 (Phase 3):** YOLOv8 (ultralytics) 다중 객체 탐지, EasyOCR 인바디 분석 추가

### 인프라 & 서비스

| 서비스 | 용도 |
|--------|------|
| **Supabase** | PostgreSQL DB + Auth + Realtime + 보조 Storage |
| **Cloudinary** | 음식 사진 메인 스토리지, CDN, 썸네일 자동 생성 |
| **Vercel** | 프론트엔드 배포 (Next.js 최적화) |
| **Railway** | 백엔드(FastAPI) 배포 |
| **Google OAuth 2.0** | 소셜 로그인 |

---

## 2. 프로젝트 디렉토리 구조

```
meallog/
├── frontend/                          # Next.js 앱
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       └── page.tsx           # 로그인 페이지
│   │   ├── (main)/
│   │   │   ├── layout.tsx             # 하단 탭 바 + OnboardingGuard + NotificationScheduler
│   │   │   ├── camera/
│   │   │   │   └── page.tsx           # 카메라/업로드 탭
│   │   │   ├── analysis/
│   │   │   │   ├── page.tsx           # 분석 탭 (SSR 비활성화 wrapper)
│   │   │   │   └── AnalysisContent.tsx # 일별/주간 탭, 카드 저장
│   │   │   ├── ai-coach/
│   │   │   │   └── page.tsx           # AI 코치 탭 (식단/운동 루틴 + PNG 내보내기)
│   │   │   ├── group/
│   │   │   │   ├── page.tsx           # 그룹 목록 탭
│   │   │   │   └── [groupId]/
│   │   │   │       └── page.tsx
│   │   │   └── compare/
│   │   │       └── page.tsx           # /group 리다이렉트 (v1.4 제거)
│   │   ├── meal/
│   │   │   └── [mealId]/
│   │   │       └── page.tsx           # 식사 상세 (소유자 편집 모드 포함)
│   │   ├── onboarding/
│   │   │   └── page.tsx               # 신체 정보 입력 (최초 로그인 필수)
│   │   ├── settings/
│   │   │   └── page.tsx               # 설정 (신체정보 수정 + 식사알림 + 로그아웃)
│   │   ├── api/                       # Next.js API Routes
│   │   │   ├── ai-coach/
│   │   │   │   └── route.ts           # OpenAI GPT-4o-mini 프록시
│   │   │   └── auth/
│   │   │       └── [...nextauth]/
│   │   │           └── route.ts
│   │   ├── globals.css
│   │   ├── layout.tsx                 # 루트 레이아웃
│   │   └── page.tsx                   # 루트 페이지 (로그 탭 — 기본 홈)
│   ├── components/
│   │   ├── ui/                        # shadcn/ui 자동 생성 컴포넌트
│   │   ├── meal/
│   │   │   ├── MealCard.tsx           # 식사 카드 (사진+칼로리)
│   │   │   ├── MealUploadForm.tsx     # 사진 업로드 + AI 결과 수정 폼
│   │   │   ├── FoodSearchModal.tsx    # 음식 검색 + 즐겨찾기 (localStorage 별표)
│   │   │   └── AddCustomFoodModal.tsx # 음식 직접 추가 (3단계 폼)
│   │   ├── group/
│   │   │   ├── GroupFeed.tsx          # 그룹 피드
│   │   │   ├── GroupJoinModal.tsx     # 그룹 생성/참가 모달
│   │   │   └── GroupSettingsModal.tsx # 그룹 설정 (오너 전용)
│   │   ├── analysis/
│   │   │   ├── DailyAnalysis.tsx      # 하루 분석 카드
│   │   │   ├── NutritionChart.tsx     # 영양소 도넛 차트
│   │   │   ├── WeeklyTrendChart.tsx   # 주간 칼로리 바 차트
│   │   │   └── DailySummaryCardModal.tsx # 하루 요약 카드 PNG 내보내기
│   │   ├── NotificationScheduler.tsx  # 브라우저 식사 알림 예약 (layout에 마운트)
│   │   ├── OnboardingGuard.tsx        # 온보딩 완료 여부 감시 + 리다이렉트
│   │   ├── dev/                       # 개발자 모드 컴포넌트
│   │   │   ├── DevSidebar.tsx         # 우측 고정 오버레이 (에러·네트워크·AI 디버그)
│   │   │   ├── DevPanel.tsx           # 내부 패널 탭 렌더러
│   │   │   └── DevErrorListener.tsx   # window.onerror / console.error 수집
│   │   └── layout/
│   │       └── BottomTabBar.tsx       # 하단 탭 바 (4탭: 카메라/분석/AI코치/그룹)
│   ├── lib/
│   │   ├── api.ts                     # Axios + snake↔camelCase 자동변환 + devStore 로깅
│   │   └── supabase.ts                # Supabase 클라이언트
│   ├── store/
│   │   ├── authStore.ts               # 로그인 상태 (accessToken은 런타임만)
│   │   ├── mealStore.ts               # 식사 기록 업로드 상태
│   │   └── devStore.ts                # 개발자 모드 상태 (ApiLog, AiDebug, ErrorLog)
│   ├── types/
│   │   └── index.ts                   # TypeScript 타입 정의 전체
│   ├── hooks/
│   │   ├── useMealUpload.ts           # 사진 업로드 + AI 분석 + 그룹 공유 훅
│   │   └── useGroupRealtime.ts        # Supabase Realtime 구독 (meal_group_shares)
│   ├── middleware.ts                   # NextAuth 세션 보호 미들웨어
│   ├── providers.tsx                   # QueryClient + SessionProvider + AuthInitializer
│   ├── public/
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── backend/                           # FastAPI 앱
│   ├── app/
│   │   ├── main.py                    # FastAPI 앱 진입점 (lifespan + 마이그레이션)
│   │   ├── config.py                  # 환경변수, 설정 (Pydantic Settings)
│   │   ├── database.py                # AsyncSession + SQLite/PostgreSQL 분기
│   │   ├── models/                    # SQLAlchemy ORM 모델
│   │   │   ├── user.py
│   │   │   ├── meal.py                # MealRecord, DetectedFood, MealGroupShare
│   │   │   ├── group.py               # Group, GroupMember
│   │   │   ├── social.py              # Reaction, Comment
│   │   │   └── food_item.py
│   │   ├── schemas/                   # Pydantic 스키마
│   │   │   ├── meal.py                # MealFoodsUpdate
│   │   │   └── group.py
│   │   ├── routers/                   # API 라우터
│   │   │   ├── auth.py
│   │   │   ├── meals.py               # CRUD + 반응/댓글
│   │   │   ├── groups.py
│   │   │   ├── users.py
│   │   │   ├── ai_analysis.py
│   │   │   └── foods.py               # 음식 DB 검색
│   │   ├── services/                  # 비즈니스 로직
│   │   │   ├── ai_service.py          # GPT-4o Vision 3단계 추론 서비스 (~800줄)
│   │   │   └── cloudinary_service.py  # 이미지 업로드
│   │   ├── middleware/
│   │   │   └── auth_middleware.py     # JWT 검증 (ExpiredSignatureError 구분)
│   │   └── utils/
│   │       └── date_utils.py          # 하루 기준 04:00 계산
│   ├── migrations/                    # Alembic 마이그레이션
│   ├── requirements.txt
│   ├── .env.example
│   └── Dockerfile
│
└── README.md
```

---

## 3. 환경변수 설정

### frontend/.env.local
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...

# 백엔드 API
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000

# NextAuth (Google OAuth)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### backend/.env
```bash
# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres:password@db.xxxx.supabase.co:5432/postgres

# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJh...

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# JWT
JWT_SECRET_KEY=your-jwt-secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# OpenAI (GPT-4o Vision)
OPENAI_API_KEY=sk-your-openai-api-key

# 환경
ENVIRONMENT=development
ALLOWED_ORIGINS=http://localhost:3000
```

---

## 4. 패키지 설치 명령어

### 프론트엔드 초기 세팅
```bash
# 프로젝트 생성
npx create-next-app@latest frontend --typescript --tailwind --app --src-dir=false

cd frontend

# 핵심 패키지
npm install @supabase/supabase-js
npm install next-auth@beta
npm install zustand
npm install @tanstack/react-query
npm install axios
# UI 컴포넌트
npx shadcn@latest init
npx shadcn@latest add button card dialog input label progress tabs badge avatar

# 차트
npm install recharts

# 날짜 처리
npm install date-fns

# 아이콘
npm install lucide-react

# 이미지 업로드
npm install react-dropzone
```

### 백엔드 초기 세팅
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

pip install fastapi uvicorn[standard]
pip install sqlalchemy alembic
pip install psycopg2-binary
pip install python-multipart
pip install python-jose[cryptography]
pip install passlib[bcrypt]
pip install httpx
pip install supabase
pip install cloudinary
pip install python-dotenv
pip install pydantic-settings

# AI (GPT-4o Vision)
pip install openai==1.35.0

# 개발 도구
pip install pytest pytest-asyncio
```

---

## 5. 로컬 개발 실행 순서

```bash
# 1. Supabase 프로젝트 생성 후 .env 설정

# 2. 백엔드 실행
cd backend
source venv/bin/activate
alembic upgrade head           # DB 마이그레이션 실행
uvicorn app.main:app --reload --port 8000

# 3. 프론트엔드 실행 (새 터미널)
cd frontend
npm run dev                    # http://localhost:3000

# 4. API 문서 확인
# http://localhost:8000/docs   (Swagger UI)
# http://localhost:8000/redoc  (ReDoc)
```

---

## 6. 배포 설정

### Vercel (프론트엔드)
```bash
# Vercel CLI
npm i -g vercel
vercel                        # 최초 배포
vercel --prod                 # 프로덕션 배포

# 환경변수는 Vercel Dashboard > Settings > Environment Variables에서 설정
```

### Railway (백엔드)
```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
# Railway CLI
npm install -g @railway/cli
railway login
railway init
railway up
```

---

## 7. TypeScript 타입 정의 전체 (types/index.ts)

```typescript
// ======= 사용자 =======
export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  age?: number;
  gender?: 'male' | 'female';
  height?: number;       // cm
  weight?: number;       // kg
  activityLevel?: ActivityLevel;
  goalType?: GoalType;
  targetCalories?: number;
  targetCarbs?: number;
  targetProtein?: number;
  targetFat?: number;
  createdAt: string;
}

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type GoalType = 'lose' | 'maintain' | 'gain';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

// ======= 음식 =======
export interface FoodItem {
  id: string;
  foodName: string;
  calories: number;      // kcal per 100g
  carbs: number;         // g per 100g
  protein: number;       // g per 100g
  fat: number;           // g per 100g
  servingSize: number;   // g (기본 1회 제공량)
}

export interface DetectedFood {
  foodItemId: string;
  foodName: string;
  servingSize: number;   // g (사용자 수정 가능)
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  confidence: number;    // 0.0 ~ 1.0
  isEdited: boolean;
}

// ======= 식사 기록 =======
export interface MealRecord {
  id: string;
  userId: string;
  groupId?: string;
  imageUrl: string;
  thumbnailUrl: string;
  mealType: MealType;
  uploadedAt: string;    // ISO 8601
  logDate: string;       // YYYY-MM-DD (04:00 기준)
  totalCalories: number;
  totalCarbs: number;
  totalProtein: number;
  totalFat: number;
  detectedFoods: DetectedFood[];
  caption?: string;
  reactions?: Reaction[];
  comments?: Comment[];
  user?: Pick<User, 'id' | 'name' | 'avatarUrl'>;
}

// ======= 그룹 =======
export interface Group {
  id: string;
  groupName: string;
  groupCode: string;     // 6자리 입장 코드
  ownerId: string;
  members: GroupMember[];
  createdAt: string;
}

export interface GroupMember {
  userId: string;
  groupId: string;
  joinedAt: string;
  user: Pick<User, 'id' | 'name' | 'avatarUrl'>;
}

// ======= 소셜 =======
export type ReactionType = 'thumbsup' | 'yummy' | 'fire' | 'muscle' | 'sad';

export interface Reaction {
  id: string;
  mealId: string;
  userId: string;
  type: ReactionType;
  user?: Pick<User, 'id' | 'name'>;
}

export interface Comment {
  id: string;
  mealId: string;
  userId: string;
  content: string;
  createdAt: string;
  user?: Pick<User, 'id' | 'name' | 'avatarUrl'>;
}

// ======= 칼로리 비교 =======
export interface DailyCalorieSummary {
  userId: string;
  name: string;
  avatarUrl?: string;
  totalCalories: number;
  targetCalories: number;
  achievementRate: number;  // 0.0 ~ (초과 가능)
  totalCarbs: number;
  totalProtein: number;
  totalFat: number;
}

// ======= AI 분석 =======
export interface AIAnalysisResult {
  detectedFoods: DetectedFood[];
  totalCalories: number;
  totalCarbs: number;
  totalProtein: number;
  totalFat: number;
  isMultiFoodDetected: boolean;
}
```

---

## 8. Zustand 스토어 구성

| 스토어 | 목적 | 주요 상태 |
|--------|------|---------|
| `authStore` | 인증 상태 | `accessToken` (런타임만, localStorage 미저장) |
| `mealStore` | 업로드 중 식사 | `step`, `aiResult`, `selectedGroups` |
| `devStore` | 개발자 모드 | `devMode`, `logs[]`, `aiDebug`, `errors[]` |

`devStore`는 비 React 컨텍스트(Axios 인터셉터 등)에서도 `useDevStore.getState()`로 접근 가능.

---

*문서 버전: v1.5 | 최초 작성: 2026-06 | 최종 수정: 2026-06-22*
