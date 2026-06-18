# 먹로그 (MealLog) — Technical Requirements Document

> **문서 유형:** TRD (Technical Requirements Document)
> **버전:** v1.2
> **작성일:** 2026-06
> **최종 수정:** 2026-06-18
> **상태:** Active — Phase 1 완료, Phase 2 준비 중
> **연관 문서:** PRD.md, 01_TECH_STACK.md, 02_DB_SCHEMA.md, 03_API_SPEC.md, 05_DESIGN_SYSTEM.md

---

## 목차

1. [시스템 아키텍처](#1-시스템-아키텍처)
2. [기술 스택 결정 근거](#2-기술-스택-결정-근거)
3. [프론트엔드 기술 요구사항](#3-프론트엔드-기술-요구사항)
4. [백엔드 기술 요구사항](#4-백엔드-기술-요구사항)
5. [AI / ML 기술 요구사항](#5-ai--ml-기술-요구사항)
6. [데이터베이스 요구사항](#6-데이터베이스-요구사항)
7. [외부 서비스 연동](#7-외부-서비스-연동)
8. [실시간 통신 설계](#8-실시간-통신-설계)
9. [인증 & 보안 설계](#9-인증--보안-설계)
10. [성능 요구사항 & 최적화 전략](#10-성능-요구사항--최적화-전략)
11. [배포 & 인프라](#11-배포--인프라)
12. [에러 처리 전략](#12-에러-처리-전략)
13. [테스트 요구사항](#13-테스트-요구사항)
14. [개발 환경 설정](#14-개발-환경-설정)

---

## 1. 시스템 아키텍처

### 1.1 전체 시스템 구조

```
┌──────────────────────────────────────────────────────────────────┐
│                        클라이언트 레이어                           │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Next.js 14 (App Router)                      │   │
│  │                                                          │   │
│  │  /camera   /log   /analysis   /group   /compare          │   │
│  │                                                          │   │
│  │  Zustand (전역 상태)  +  TanStack Query (서버 상태)        │   │
│  │  Socket.io-client (실시간)  +  Supabase Realtime         │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────┬─────────────────────────────────────┘
                             │  HTTPS / WebSocket (wss://)
┌────────────────────────────▼─────────────────────────────────────┐
│                        백엔드 레이어                               │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              FastAPI (Python 3.11)                        │   │
│  │                                                          │   │
│  │  /auth    /users    /meals    /groups    /ai              │   │
│  │                                                          │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │         AI 분석 서비스 (GPT-4o Vision API)       │    │   │
│  │  │  STEP1 크기측정→STEP2 밀도결정→STEP3 칼로리계산  │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────┬──────────────────────┬───────────────────────────────┘
           │                      │
┌──────────▼──────────┐  ┌───────▼──────────────────────────────┐
│     Supabase         │  │           Cloudinary                 │
│                      │  │                                      │
│  PostgreSQL (DB)     │  │  - 음식 사진 원본 저장                │
│  Auth (JWT 발급)     │  │  - 썸네일 자동 생성 (300×300 crop)   │
│  Realtime (변경 감지) │  │  - 글로벌 CDN 자동 배포              │
│  Storage (보조)      │  │  - 자동 포맷 최적화 (WebP 변환)      │
└─────────────────────┘  └──────────────────────────────────────┘

배포:
  프론트엔드 → Vercel (Next.js 최적화, Edge Network)
  백엔드     → Railway (Docker 컨테이너, 자동 배포)
```

### 1.2 데이터 흐름 — 핵심 루프 (음식 업로드 → 그룹 반영)

```
[클라이언트]
사진 선택 + 카테고리 선택
    │
    │  multipart/form-data  (HTTPS)
    ▼
[FastAPI: POST /meals]
    │
    ├─1─▶ [Cloudinary] 이미지 업로드
    │         ↓
    │     image_url, thumbnail_url 반환
    │
    ├─1─▶ [Cloudinary] 업로드  ──┐  (asyncio.gather 병렬 실행)
    │         ↓                  │
    │     image_url 반환         │
    │                            │
    ├─2─▶ [GPT-4o Vision API] ──┘
    │         ↓ STEP1: 기준점 탐지 → g/ml 측정
    │         ↓ STEP2: 조리 상태 → 밀도표 kcal/100g 선택
    │         ↓ STEP3: calories = g × density ÷ 100
    │     JSON (food_name, calories, carbs, protein, fat, debug) 반환
    │
    ├─3─▶ [Supabase PostgreSQL] meal_records + detected_foods 저장
    │
    └─4─▶ [meal_group_shares] 개인 하루로그 그룹에 자동 공유
              │
              ▼
[그룹원 클라이언트들]
Supabase Realtime (meal_group_shares INSERT) → TanStack Query 무효화 → 피드 갱신
```

---

## 2. 기술 스택 결정 근거

### 2.1 프론트엔드

| 기술 | 버전 | 선택 근거 | 대안 고려 |
|------|------|----------|----------|
| Next.js | 14.x | App Router SSR, Vercel 최적 배포, 파일 기반 라우팅, API Routes 프록시 | Vite+React (SSR 미지원) |
| TypeScript | 5.x | 컴파일 타임 타입 검증, 자동완성, 팀 코드 일관성 | JavaScript (타입 안전 미흡) |
| Tailwind CSS | 3.x | 유틸리티 클래스로 빠른 스타일링, 디자인 토큰 시스템과 자연 통합 | styled-components (번들 크기) |
| shadcn/ui | latest | Radix UI 기반 접근성, Tailwind 통합, 비설치형(코드 직접 포함) | MUI (번들 과대, 스타일 충돌) |
| Zustand | 4.x | 전역 상태 경량 관리, Redux 대비 보일러플레이트 90% 감소 | Redux Toolkit (과도함) |
| TanStack Query | 5.x | 서버 상태 캐싱·무효화 자동화, Realtime 연동 시 캐시 무효화 | SWR (기능 제한) |

### 2.2 백엔드

| 기술 | 버전 | 선택 근거 | 대안 고려 |
|------|------|----------|----------|
| FastAPI | 0.111.x | Python AI 생태계 직접 통합, 자동 Swagger 문서, 비동기 지원 | Express.js (AI 모델 연동 복잡) |
| Python | 3.11.x | httpx/openai 비동기 완전 지원, AI 생태계 최적 | Node.js (AI 라이브러리 부재) |
| SQLAlchemy | 2.x | 비동기 ORM, PostgreSQL 완전 지원, 마이그레이션 Alembic 연동 | Prisma (Python 미지원) |
| Pydantic | 2.x | FastAPI 내장, 요청/응답 자동 검증, 타입 문서 자동 생성 | marshmallow |

### 2.3 AI / ML

| 기술 | 버전 | 선택 근거 | 대안 고려 |
|------|------|----------|----------|
| OpenAI GPT-4o Vision | API | 사진 1장 → 음식명·칼로리·탄단지 JSON 반환, 별도 학습 불필요, 한국 음식 완전 지원 | MobileNetV2 (한국 음식 인식률 낮음, 별도 학습 필요) |
| httpx | latest | 비동기 OpenAI API 호출, asyncio 완전 호환 | requests (동기, FastAPI 비동기와 불일치) |

### 2.4 인프라

| 서비스 | 선택 근거 | 무료 티어 한도 |
|--------|----------|--------------|
| Supabase | PostgreSQL + Auth + Realtime 일체형, 무료 티어 충분 | DB 500MB, Realtime 200 동시 접속 |
| Cloudinary | 이미지 CDN + 썸네일 자동 생성 + 포맷 최적화 일체형 | 월 25GB 저장/대역폭 |
| Vercel | Next.js 제작사, Edge 배포 최적화, GitHub 자동 CI/CD | 월 100GB 대역폭 |
| Railway | Docker 기반 백엔드 배포, GitHub 자동 배포, 환경변수 관리 | 월 $5 무료 크레딧 |

---

## 3. 프론트엔드 기술 요구사항

### 3.1 프로젝트 구조

```
frontend/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (main)/
│   │   ├── layout.tsx          ← BottomTabBar 포함
│   │   ├── camera/page.tsx
│   │   ├── log/page.tsx
│   │   ├── analysis/page.tsx
│   │   ├── group/
│   │   │   ├── page.tsx
│   │   │   └── [groupId]/page.tsx
│   │   └── compare/page.tsx
│   ├── api/auth/[...nextauth]/route.ts
│   ├── globals.css             ← @font-face + CSS 변수
│   └── layout.tsx              ← 루트 레이아웃
├── components/
│   ├── ui/                     ← shadcn/ui 자동 생성
│   ├── meal/
│   │   ├── MealCard.tsx
│   │   ├── MealUploadForm.tsx
│   │   ├── NutritionDetail.tsx
│   │   └── CalorieBar.tsx
│   ├── group/
│   │   ├── GroupFeed.tsx
│   │   ├── CalorieRanking.tsx
│   │   └── GroupJoinModal.tsx
│   ├── analysis/
│   │   ├── DailyAnalysis.tsx
│   │   └── NutritionChart.tsx
│   └── layout/
│       ├── BottomTabBar.tsx
│       └── Header.tsx
├── hooks/
│   ├── useMealUpload.ts        ← 업로드 + AI 분석 통합 훅
│   ├── useGroupRealtime.ts     ← Supabase Realtime 구독
│   └── useDailyLog.ts
├── lib/
│   ├── api.ts                  ← Axios 인스턴스 + 인터셉터
│   ├── supabase.ts
│   └── utils.ts                ← 날짜 계산, 칼로리 계산
├── store/
│   ├── authStore.ts
│   ├── mealStore.ts
│   └── groupStore.ts
├── types/index.ts              ← 전체 TypeScript 타입
└── public/fonts/               ← KERISKEDU_*.ttf, NanumMyeongjo*.ttf
```

### 3.2 상태 관리 설계

```
전역 상태 (Zustand):
  authStore    → 로그인 유저 정보, 토큰
  mealStore    → 현재 업로드 중인 식사 데이터 (스텝 진행 상태)
  groupStore   → 현재 선택된 그룹 ID

서버 상태 (TanStack Query):
  ['meals', date]              → 날짜별 식사 목록
  ['daily-summary', date]      → 하루 칼로리 요약
  ['group-feed', groupId, date] → 그룹 피드
  ['calorie-compare', groupId, date] → 비교 데이터
  ['group-members', groupId]   → 그룹 멤버
  ['user-profile']             → 내 프로필

캐시 정책:
  staleTime: 5분  (피드, 로그)
  gcTime:    30분
  refetchOnWindowFocus: false  (모바일 앱 경험 유지)
```

### 3.3 폰트 로딩 요구사항

```
로딩 전략: font-display: swap
  - 폰트 로드 전: 시스템 폰트 임시 표시
  - 로드 완료 후: KERIS-KEDU / Nanum-Myeongjo 교체
  - CLS(Cumulative Layout Shift) 최소화를 위해 크기 유사한 fallback 설정

Next.js font 설정:
  app/layout.tsx에서 <link rel="preload"> 추가하여 LCP 개선
  또는 next/font/local 사용 권장

파일 경로: public/fonts/*.ttf (총 6개 파일)
```

### 3.4 이미지 업로드 클라이언트 요구사항

```typescript
// 업로드 허용 조건
허용 MIME 타입: image/jpeg, image/png, image/webp
최대 파일 크기: 10MB
최소 해상도:    224×224px (AI 분석 품질 보장)
권장 해상도:    1080×1080px 이상

// 클라이언트 측 전처리 (업로드 전)
1. 파일 크기 체크 → 10MB 초과 시 즉시 에러 표시
2. MIME 타입 체크 → 허용 외 타입 즉시 에러 표시
3. 미리보기 생성 → FileReader API로 base64 변환
4. 업로드는 원본 그대로 전송 (클라이언트 리사이즈 불필요, 서버에서 처리)
```

### 3.5 반응형 브레이크포인트

```
mobile:  375px ~  767px  (기본, 단일 컬럼)
tablet:  768px ~ 1023px  (선택, 2컬럼 카드)
desktop: 1024px ~        (선택, 최대 너비 480px 중앙 정렬 — 앱처럼 보이도록)

// 데스크탑에서도 모바일 앱 느낌 유지
.app-container {
  max-width: 480px;
  margin: 0 auto;
}
```

---

## 4. 백엔드 기술 요구사항

### 4.1 FastAPI 애플리케이션 구조

```
backend/
├── app/
│   ├── main.py              ← FastAPI 앱 진입점, lifespan 이벤트
│   ├── config.py            ← Pydantic Settings (환경변수 타입 검증)
│   ├── database.py          ← AsyncSession 팩토리, get_db 의존성
│   ├── models/              ← SQLAlchemy ORM 모델
│   │   ├── user.py
│   │   ├── meal.py          ← MealRecord, DetectedFood
│   │   ├── group.py         ← Group, GroupMember
│   │   └── food_item.py
│   ├── schemas/             ← Pydantic 요청/응답 스키마
│   │   ├── user.py
│   │   ├── meal.py
│   │   └── group.py
│   ├── routers/             ← 엔드포인트 라우터
│   │   ├── auth.py
│   │   ├── users.py
│   │   ├── meals.py
│   │   ├── groups.py
│   │   └── ai_analysis.py
│   ├── services/            ← 비즈니스 로직 레이어
│   │   ├── ai_service.py    ← MobileNetV2 싱글톤
│   │   ├── calorie_service.py
│   │   └── cloudinary_service.py
│   ├── middleware/
│   │   └── auth_middleware.py ← JWT 검증 의존성
│   └── utils/
│       ├── date_utils.py    ← 04:00 기준 날짜 계산
│       └── nutrition_db.py  ← 음식 영양 데이터
├── ai_model/
│   ├── model.py             ← FoodAIService 클래스
│   ├── preprocess.py
│   ├── food_labels.json     ← {index: 음식명} 매핑
│   └── weights/
│       └── mobilenetv2_food.h5
├── migrations/              ← Alembic 마이그레이션
├── requirements.txt
├── .env.example
└── Dockerfile
```

### 4.2 API 설계 원칙

```
RESTful 설계:
  GET    /meals          → 목록 조회
  POST   /meals          → 생성
  GET    /meals/{id}     → 단건 조회
  PATCH  /meals/{id}     → 부분 수정 (PUT 금지)
  DELETE /meals/{id}     → 삭제

HTTP 상태 코드:
  200 OK          → 성공 (조회, 수정, 삭제)
  201 Created     → 리소스 생성 성공
  400 Bad Request → 유효성 검사 실패
  401 Unauthorized → 토큰 없음/만료
  403 Forbidden   → 권한 없음 (타인 데이터 접근)
  404 Not Found   → 리소스 없음
  422 Unprocessable → 요청 형식 오류 (Pydantic 자동)
  500 Internal    → 서버 에러

공통 응답 포맷:
{
  "success": bool,
  "data": any | null,
  "message": str | null,
  "error": {
    "code": str,
    "message": str
  } | null
}
```

### 4.3 의존성 주입 패턴

```python
# 재사용 의존성 3종
async def get_db()          → AsyncSession
async def get_current_user() → User (JWT 검증 포함)
async def get_ai_service()  → FoodAIService (싱글톤)

# 라우터에서 사용 예시
@router.post("/meals")
async def create_meal(
    image: UploadFile = File(...),
    meal_type: MealType = Form(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    ai_service: FoodAIService = Depends(get_ai_service),
):
    ...
```

### 4.4 비동기 처리 요구사항

```python
# 모든 DB 조작: AsyncSession 사용 (동기 Session 금지)
# 모든 외부 API 호출: httpx.AsyncClient 사용 (requests 금지)
# AI 추론: 동기 TensorFlow → run_in_executor로 비동기 래핑

import asyncio
from concurrent.futures import ThreadPoolExecutor

executor = ThreadPoolExecutor(max_workers=2)

async def analyze_image_async(image_bytes: bytes):
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        executor,
        food_ai_service.predict,
        image_bytes
    )
    return result
```

### 4.5 하루 기준 날짜 계산 (핵심 비즈니스 로직)

```python
# app/utils/date_utils.py

from datetime import datetime, date, timedelta
from zoneinfo import ZoneInfo

KST = ZoneInfo("Asia/Seoul")

def get_log_date(uploaded_at: datetime) -> date:
    """
    업로드 시각 → 04:00 기준 log_date 변환
    
    Examples:
        2026-05-25 02:30 KST → 2026-05-24  (새벽 2시 = 전날)
        2026-05-25 05:00 KST → 2026-05-25  (오전 5시 = 당일)
        2026-05-25 23:59 KST → 2026-05-25  (자정 전 = 당일)
    """
    kst_time = uploaded_at.astimezone(KST)
    if kst_time.hour < 4:
        return (kst_time - timedelta(days=1)).date()
    return kst_time.date()

def get_day_range(log_date: date) -> tuple[datetime, datetime]:
    """
    log_date → 실제 시간 범위 반환
    
    Returns:
        (2026-05-24 04:00:00 KST, 2026-05-25 03:59:59 KST)
    """
    start = datetime(log_date.year, log_date.month, log_date.day,
                     4, 0, 0, tzinfo=KST)
    end = start + timedelta(days=1) - timedelta(seconds=1)
    return start, end
```

---

## 5. AI / ML 기술 요구사항 — GPT-4o Vision

### 5.1 서비스 개요

```
엔진:     OpenAI GPT-4o Vision API
방식:     SYSTEM_PROMPT 기반 3단계 Chain-of-Thought 추론
파일:     backend/app/services/ai_service.py (~800줄)
모델 ID:  "gpt-4o"
max_tokens: 3000 (다중 음식 분석 충분 커버)
response_format: {"type": "json_object"}
```

### 5.2 SYSTEM_PROMPT 구조

```
STEP 1 — 크기 기준점 탐지 (size_reference)
  - 한국 밥그릇 (소 150g / 중 200g / 대 250g)
  - 뚝배기 (소 14cm=580g / 중 16cm=780g / 대 18cm=980g)
  - 국·탕 그릇 (소 350g / 중 450g / 대 600g)
  - 테이크아웃 컵 (355ml), 머그컵 (240ml), 소주잔 (50ml)
  - 일반 접시, 손바닥, 젓가락 (23cm) 등 기준점 목록 포함
  - 출력: weight_g (추정 무게), size_ref (어떤 기준점 사용), reasoning

STEP 2 — 밀도 & 칼로리 결정 (density)
  - ~180종 음식 밀도표 내장 (한식·일식·중식·양식·간식·음료·과일 등)
  - 주요 한국 음식:
      삼계탕 80kcal/100g, 설렁탕 60kcal/100g, 된장찌개 50kcal/100g
      김치찌개 70kcal/100g, 흰쌀밥 130kcal/100g, 돼지갈비 250kcal/100g
  - 조리 상태에 따라 밀도 조정 (구이 > 볶음 > 찜 > 국물류)
  - 출력: kcal_per_100g, cooking_state, density_reason

STEP 3 — 최종 계산
  calories = weight_g × kcal_per_100g ÷ 100
  탄단지 비율 적용 → carbs / protein / fat (g) 계산
  - ~120종 탄단지 비율표 내장
  - 출력: food_name, serving_size, calories, carbs, protein, fat, debug{}
```

### 5.3 호출 구현

```python
# app/services/ai_service.py
import base64, json
from openai import AsyncOpenAI
from app.config import settings

class FoodVisionService:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    async def analyze_image(self, image_bytes: bytes) -> list[dict]:
        b64 = base64.b64encode(image_bytes).decode()
        response = await self.client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": [
                    {"type": "image_url",
                     "image_url": {"url": f"data:image/jpeg;base64,{b64}"}},
                    {"type": "text", "text": "위 음식을 분석해주세요."}
                ]}
            ],
            max_tokens=3000,
            response_format={"type": "json_object"},
        )
        data = json.loads(response.choices[0].message.content)
        return data.get("foods", [data])  # 단일/다중 음식 모두 처리

food_vision_service = FoodVisionService()
```

### 5.4 반환 JSON 형태

```json
{
  "foods": [
    {
      "food_name": "삼계탕",
      "serving_size": 780,
      "calories": 624,
      "carbs": 39,
      "protein": 70,
      "fat": 19,
      "debug": {
        "step1_ref": "뚝배기 중(780g)",
        "step2_density": "80 kcal/100g — 국물 포함 삼계탕",
        "step3_calc": "780 × 80 ÷ 100 = 624 kcal"
      }
    }
  ]
}
```

### 5.5 AI 분석 실패 처리

```
실패 케이스:
  1. OpenAI API 타임아웃   → 500 에러, "AI 분석 시간이 초과되었어요" + 재시도 버튼
  2. JSON 파싱 실패        → 500 에러, 수동 입력 폼으로 전환
  3. 음식 아닌 사진        → GPT-4o가 "food_name": "음식이 감지되지 않았습니다" 반환
  4. 이미지 전처리 실패    → 400 에러 "지원하지 않는 이미지 형식"

클라이언트 처리:
  AI 분석 실패 응답 수신 시 → 수동 입력 폼으로 자동 전환
  재시도 버튼 항상 노출
```

### 5.6 비용 & 성능

```
평균 응답 시간:  2~5초 (GPT-4o Vision, 사진 크기에 따라 다름)
토큰 소비:       입력 ~500 토큰 + 출력 ~400 토큰 = 약 900 토큰/요청
병렬 처리:       Cloudinary 업로드와 asyncio.gather로 병렬 실행 → 지연 최소화
Phase 3 확장:   YOLO 기반 다중 객체 탐지 후 GPT-4o에 객체별 분석 위임 가능
```

---

## 6. 데이터베이스 요구사항

### 6.1 PostgreSQL 버전 & 확장

```sql
버전:    PostgreSQL 15 (Supabase 기본)
확장:    uuid-ossp (gen_random_uuid() 사용)
         pgcrypto (보안 해싱 선택적)
타임존:  UTC 저장, 조회 시 KST 변환 (백엔드에서 처리)
```

### 6.2 테이블 목록 & 관계

```
users               (사용자)
  ↑ 1:N
meal_records        (식사 기록) ← 핵심 테이블
  ↑ 1:N
detected_foods      (AI 인식 음식 상세)

food_items          (음식 영양 DB) — 참조 테이블

groups              (그룹)
  ↑ 1:N
group_members       (그룹 멤버) — users와 M:N 브릿지

meal_records ↑ 1:N reactions    (이모티콘 반응)
meal_records ↑ 1:N comments     (댓글)
```

### 6.3 인덱스 전략

```sql
-- 조회 빈도가 높은 쿼리 기준 인덱스 설계

-- 1. 사용자별 날짜 식사 조회 (가장 빈번)
CREATE INDEX idx_meal_user_logdate
  ON meal_records(user_id, log_date DESC);

-- 2. 그룹 피드 조회
CREATE INDEX idx_meal_group_logdate
  ON meal_records(group_id, log_date DESC, uploaded_at DESC);

-- 3. 그룹 코드 조회 (입장 코드 검색)
CREATE UNIQUE INDEX idx_groups_code
  ON groups(group_code);

-- 4. 그룹 멤버 조회
CREATE INDEX idx_group_members_user
  ON group_members(user_id);

-- 5. 음식 DB 검색 (이름 자동완성)
CREATE INDEX idx_food_name ON food_items(food_name);
CREATE INDEX idx_food_name_en ON food_items(food_name_en);
```

### 6.4 Row Level Security (RLS) 정책

```sql
-- users: 본인 데이터만 접근
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_self_only" ON users
  USING (auth.uid() = id);

-- meal_records: 본인 + 같은 그룹원 읽기
ALTER TABLE meal_records ENABLE ROW LEVEL SECURITY;

-- 본인: 읽기/쓰기
CREATE POLICY "meal_own_rw" ON meal_records
  USING (auth.uid() = user_id);

-- 그룹원: 읽기만
CREATE POLICY "meal_group_r" ON meal_records
  FOR SELECT USING (
    group_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = meal_records.group_id
        AND group_members.user_id = auth.uid()
    )
  );

-- group_members: 같은 그룹원끼리 조회 가능
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "group_members_peer" ON group_members
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
        AND gm.user_id = auth.uid()
    )
  );
```

### 6.5 Alembic 마이그레이션 운용 규칙

```bash
# 새 마이그레이션 생성
alembic revision --autogenerate -m "add_caption_to_meal_records"

# 적용
alembic upgrade head

# 특정 버전으로 롤백
alembic downgrade -1

# 규칙:
# - 마이그레이션 파일 직접 편집 금지 (재생성)
# - 프로덕션 배포 전 반드시 스테이징에서 테스트
# - 컬럼 삭제 시 2단계 (nullable → 삭제) 마이그레이션 분리
```

---

## 7. 외부 서비스 연동

### 7.1 Cloudinary 연동 명세

```python
# 업로드 파라미터
upload_preset:  없음 (서명 방식)
folder:         f"meallog/{user_id}"
resource_type:  "image"
transformation: [{"quality": "auto", "fetch_format": "auto"}]
eager: [
    {
        "width": 300, "height": 300,
        "crop": "fill", "gravity": "auto",
        "quality": "auto", "fetch_format": "auto"
    }
]
eager_async: True  # 썸네일 비동기 생성

# 반환값 사용
image_url:     result["secure_url"]        # 원본 CDN URL
thumbnail_url: result["eager"][0]["secure_url"]  # 300×300 썸네일
public_id:     result["public_id"]         # 삭제 시 사용

# 삭제 (식사 기록 삭제 시 연동)
cloudinary.uploader.destroy(public_id)
```

### 7.2 Supabase Realtime 연동 명세

```typescript
// 프론트엔드 구독 설정
const channel = supabase
  .channel(`group-feed-${groupId}`)
  .on(
    'postgres_changes',
    {
      event:  'INSERT',        // 새 식사 업로드만 감지
      schema: 'public',
      table:  'meal_records',
      filter: `group_id=eq.${groupId}`,
    },
    (payload) => {
      // TanStack Query 캐시 무효화
      queryClient.invalidateQueries(['group-feed', groupId]);
      queryClient.invalidateQueries(['calorie-compare', groupId]);
    }
  )
  .subscribe();

// 구독 해제 (컴포넌트 언마운트 시)
return () => supabase.removeChannel(channel);

// Supabase 대시보드에서 Realtime 활성화 필요
// Database > Replication > meal_records, reactions, comments 추가
```

### 7.3 Google OAuth 연동

```
OAuth 2.0 Authorization Code Flow:

1. 클라이언트 → Google 로그인 페이지 리다이렉트
   (client_id, redirect_uri, scope: email profile)

2. Google → redirect_uri로 authorization code 전달

3. 클라이언트 → POST /auth/google { code, redirect_uri }

4. 백엔드 → Google Token Exchange API로 code → access_token 교환

5. 백엔드 → Google UserInfo API로 사용자 정보 조회
   (email, name, picture)

6. 백엔드 → users 테이블 upsert (신규: INSERT, 기존: UPDATE 최소화)

7. 백엔드 → JWT 발급 (payload: {sub: user_id, exp: 7일})

8. 클라이언트 → JWT 저장 (NextAuth session)

필요한 Google OAuth 설정:
  - Google Cloud Console에서 OAuth 2.0 클라이언트 ID 생성
  - 허가된 리디렉션 URI: http://localhost:3000/api/auth/callback/google
                         https://meallog.vercel.app/api/auth/callback/google
```

---

## 8. 실시간 통신 설계

### 8.1 Supabase Realtime 사용 범위 (Phase 1)

```
그룹 피드 실시간 업데이트:
  이벤트: meal_records INSERT
  필터:   group_id = 현재 그룹 ID
  동작:   group-feed 쿼리 캐시 무효화 → 자동 리페치

칼로리 비교 실시간 업데이트:
  이벤트: meal_records INSERT
  필터:   group_id = 현재 그룹 ID
  동작:   calorie-compare 쿼리 캐시 무효화

이모티콘 반응 실시간 (Phase 2):
  이벤트: reactions INSERT / DELETE
  동작:   해당 meal_id의 반응 카운트 업데이트
```

### 8.2 WebSocket 채팅 설계 (Phase 2)

```
라이브러리:   Socket.io (백엔드) + Socket.io-client (프론트엔드)
네임스페이스: /chat
룸:           group_{groupId}

이벤트 목록:
  클라이언트 → 서버:
    join_group:    { groupId, userId }
    send_message:  { groupId, content, userId }
    leave_group:   { groupId }

  서버 → 클라이언트:
    new_message:   { id, userId, name, content, createdAt }
    user_joined:   { userId, name }
    user_left:     { userId, name }
    error:         { code, message }

인증:
  Socket 연결 시 JWT 토큰 handshake에 포함
  서버에서 토큰 검증 후 그룹 멤버 여부 확인
```

---

## 9. 인증 & 보안 설계

### 9.1 JWT 토큰 구조

```python
# 토큰 페이로드
{
    "sub":   "user-uuid-here",   # 사용자 ID
    "email": "user@gmail.com",
    "iat":   1717200000,         # 발급 시각 (Unix timestamp)
    "exp":   1717804800,         # 만료 시각 (7일 후)
}

# 서명 알고리즘: HS256
# 시크릿 키: 32자 이상 랜덤 문자열 (환경변수)
# 저장 위치: NextAuth session (httpOnly cookie 기반)
```

### 9.2 API 보안 레이어

```
레이어 1: HTTPS 강제 (HTTP → HTTPS 리다이렉트)
레이어 2: CORS 제한 (허가된 Origin만: vercel 도메인, localhost:3000)
레이어 3: JWT 검증 미들웨어 (모든 /meals, /groups, /users 엔드포인트)
레이어 4: Supabase RLS (DB 레벨 접근 제어)
레이어 5: 입력값 검증 (Pydantic 스키마 자동 검증)

Rate Limiting (Phase 2에서 추가):
  이미지 업로드: 분당 10회
  AI 분석:       분당 10회
  로그인:        분당 5회
```

### 9.3 이미지 업로드 보안

```
클라이언트 검증:
  - 파일 타입: MIME 타입 체크 (image/jpeg, image/png, image/webp)
  - 파일 크기: 10MB 초과 즉시 거부

서버 검증:
  - Content-Type 재검증
  - 파일 매직 바이트 확인 (python-magic 라이브러리)
  - 10MB 초과 요청 즉시 413 응답

Cloudinary 업로드:
  - 서버 측 서명 방식 (클라이언트에서 직접 업로드 금지)
  - upload_preset 미사용 → 서버가 업로드 파라미터 완전 제어
```

---

## 10. 성능 요구사항 & 최적화 전략

### 10.1 목표 성능 지표

| 지표 | 목표값 | 측정 방법 |
|------|-------|----------|
| AI 분석 응답 시간 | ≤ 5초 | 업로드 시작 ~ 결과 표시 |
| 일반 API 응답 | ≤ 500ms | P95 기준 |
| 그룹 피드 실시간 반영 | ≤ 5초 | 업로드 완료 ~ 타 클라이언트 표시 |
| 페이지 LCP | ≤ 3초 | Chrome Lighthouse |
| 이미지 로드 | ≤ 1초 | Cloudinary CDN 썸네일 기준 |

### 10.2 프론트엔드 최적화

```
이미지 최적화:
  - next/image 컴포넌트 사용 (자동 WebP 변환, 지연 로딩)
  - 피드 목록에서는 thumbnail_url (300×300) 표시
  - 상세 화면에서만 image_url (원본) 로드

코드 스플리팅:
  - Next.js App Router 자동 코드 분할
  - Recharts (차트 라이브러리) dynamic import

캐싱:
  - TanStack Query staleTime: 5분
  - 이미지: Cloudinary CDN 캐시 헤더 (max-age: 1년)

번들 크기 최적화:
  - shadcn/ui: 사용하는 컴포넌트만 코드에 포함 (비설치형)
  - Tree-shaking: 미사용 lucide-react 아이콘 자동 제거
```

### 10.3 백엔드 최적화

```
AI 모델:
  - 앱 시작 시 1회 로드, 메모리 유지 (매 요청 로드 금지)
  - ThreadPoolExecutor(max_workers=2)로 동시 추론 처리
  - 배치 추론: 현재 단건, Phase 2에서 멀티 이미지 배치 고려

DB 쿼리:
  - N+1 쿼리 방지: SQLAlchemy selectinload / joinedload 사용
  - 그룹 피드 조회: meal_records + user 정보 JOIN 단일 쿼리
  - 페이지네이션: 기본 page_size=20, cursor 기반 (offset 금지)

커넥션 풀:
  - SQLAlchemy AsyncEngine: pool_size=10, max_overflow=20
```

### 10.4 데이터베이스 최적화

```
읽기 최적화:
  - 핵심 인덱스 6개 적용 (섹션 6.3 참조)
  - 그룹 칼로리 비교 쿼리: 단일 집계 쿼리 (N회 개별 조회 금지)

쓰기 최적화:
  - meal_records.total_calories 등 합계 컬럼 캐싱
    (detected_foods 집계 결과를 meal_records에 저장)
  - detected_foods 수정 시 meal_records 합계 자동 업데이트 (트리거 또는 서비스 레이어)
```

---

## 11. 배포 & 인프라

### 11.1 배포 아키텍처

```
GitHub Repository
    │
    ├─ main 브랜치 → 자동 배포 트리거
    │
    ├─▶ Vercel (프론트엔드)
    │     - Next.js 빌드 자동화
    │     - Edge Network 전 세계 CDN
    │     - 환경변수: NEXT_PUBLIC_* (클라이언트 노출) + 서버 전용
    │     - Preview URL: PR마다 자동 생성
    │
    └─▶ Railway (백엔드)
          - Dockerfile 기반 컨테이너 빌드
          - 자동 배포 (main push 시)
          - 환경변수: Railway 대시보드 설정
          - 헬스체크: GET /health → 200 OK
```

### 11.2 환경별 설정

```
로컬 개발:
  프론트엔드: http://localhost:3000
  백엔드:     http://localhost:8000
  DB:        Supabase 프로젝트 (개발용)

스테이징 (선택):
  프론트엔드: https://meallog-dev.vercel.app
  백엔드:     https://meallog-api-dev.railway.app

프로덕션:
  프론트엔드: https://meallog.vercel.app
  백엔드:     https://meallog-api.railway.app
```

### 11.3 Dockerfile (백엔드)

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# 시스템 의존성 (OpenCV, Pillow 등)
RUN apt-get update && apt-get install -y \
    libglib2.0-0 libsm6 libxext6 libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

# Python 의존성
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 소스 코드
COPY . .

# AI 모델 가중치 포함 (빌드 시 포함 또는 외부 스토리지에서 다운로드)
# COPY ai_model/weights/ ./ai_model/weights/

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 11.4 환경변수 목록 (전체)

```bash
# === 프론트엔드 (frontend/.env.local) ===

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...

# 백엔드 URL
NEXT_PUBLIC_API_URL=http://localhost:8000       # 개발
# NEXT_PUBLIC_API_URL=https://meallog-api.railway.app  # 프로덕션

# NextAuth (Google OAuth)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=최소32자이상랜덤문자열
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxx

# === 백엔드 (backend/.env) ===

# Database
DATABASE_URL=postgresql+asyncpg://postgres:pass@db.xxxx.supabase.co:5432/postgres

# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJh...  # RLS 우회 가능 (서버에서만 사용)

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=000000000000000
CLOUDINARY_API_SECRET=xxxx

# JWT
JWT_SECRET_KEY=최소32자이상랜덤문자열
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080  # 7일

# AI Model
MODEL_PATH=./ai_model/weights/mobilenetv2_food.h5
FOOD_LABELS_PATH=./ai_model/food_labels.json

# 환경
ENVIRONMENT=development         # development | production
ALLOWED_ORIGINS=http://localhost:3000
```

---

## 12. 에러 처리 전략

### 12.1 에러 코드 정의

```
AUTH_001   토큰 없음
AUTH_002   토큰 만료
AUTH_003   토큰 유효하지 않음
AUTH_004   권한 없음

MEAL_001   이미지 파일 없음
MEAL_002   지원하지 않는 이미지 형식
MEAL_003   이미지 크기 초과 (10MB)
MEAL_004   Cloudinary 업로드 실패
MEAL_005   AI 분석 실패
MEAL_006   음식 인식 결과 없음 (confidence 전체 < 1%)
MEAL_007   식사 기록 없음

GROUP_001  그룹 코드 없음 (잘못된 코드)
GROUP_002  이미 그룹 멤버
GROUP_003  그룹 최대 인원 초과
GROUP_004  그룹 생성 실패

SYSTEM_001 DB 연결 실패
SYSTEM_002 외부 서비스 연결 실패
SYSTEM_003 AI 모델 로드 실패
```

### 12.2 클라이언트 에러 UX

```
에러 표시 원칙:
  - 에러 메시지는 사용자 친화적 언어 (기술 용어 금지)
  - 에러 발생 위치 근처에 인라인 표시 (모달/토스트 남용 금지)
  - 항상 "다시 시도" 또는 "대안 행동" 제시

케이스별 처리:
  AI 분석 실패    → "음식을 인식하지 못했어요. 직접 입력해볼까요?" + 수동 입력 폼
  이미지 업로드 실패 → "업로드에 실패했어요. 다시 시도해주세요." + 재시도 버튼
  그룹 코드 오류  → "코드를 다시 확인해주세요." (인라인, 입력창 하단)
  네트워크 오류   → "인터넷 연결을 확인해주세요." + 재시도 버튼
  401 인증 만료   → 자동으로 로그인 페이지 리다이렉트
```

### 12.3 서버 에러 로깅

```python
# 로깅 전략
import logging

logger = logging.getLogger(__name__)

# 레벨별 사용:
# logger.info()    → 정상 동작 주요 이벤트 (AI 모델 로드 완료, 사용자 로그인 등)
# logger.warning() → 비정상이나 서비스 영향 없음 (AI confidence 낮음 등)
# logger.error()   → 서비스 영향 있는 오류 (DB 쿼리 실패, Cloudinary 실패 등)
# logger.critical() → 즉시 대응 필요 (AI 모델 로드 실패, DB 연결 불가 등)

# Phase 2: Sentry 연동으로 에러 추적 자동화
```

---

## 13. 테스트 요구사항

### 13.1 테스트 전략

```
Phase 1 (MVP): 핵심 흐름 수동 E2E 테스트 + 단위 테스트 일부

우선순위 1 — 단위 테스트 (필수):
  - get_log_date() 함수 (04:00 기준 날짜 계산)
  - calculate_bmr(), calculate_tdee() 함수
  - 칼로리 합산 로직
  - 그룹 코드 생성 로직

우선순위 2 — API 통합 테스트:
  - POST /meals — 이미지 업로드 + AI 분석 흐름
  - POST /groups + POST /groups/join — 그룹 생성 및 입장
  - GET /groups/{id}/compare — 실시간 비교 데이터

우선순위 3 — E2E 테스트 (수동):
  - 신규 사용자 온보딩 전체 흐름
  - 음식 사진 업로드 → 그룹 피드 반영 확인
  - 칼로리 비교 실시간 업데이트 확인
```

### 13.2 핵심 단위 테스트 케이스

```python
# tests/test_date_utils.py

def test_get_log_date_before_4am():
    """새벽 2시 30분 → 전날 날짜"""
    dt = datetime(2026, 5, 25, 2, 30, tzinfo=KST)
    assert get_log_date(dt) == date(2026, 5, 24)

def test_get_log_date_after_4am():
    """오전 5시 → 당일 날짜"""
    dt = datetime(2026, 5, 25, 5, 0, tzinfo=KST)
    assert get_log_date(dt) == date(2026, 5, 25)

def test_get_log_date_exactly_4am():
    """정확히 4시 00분 → 당일"""
    dt = datetime(2026, 5, 25, 4, 0, tzinfo=KST)
    assert get_log_date(dt) == date(2026, 5, 25)

def test_get_log_date_midnight():
    """자정 0시 → 전날"""
    dt = datetime(2026, 5, 25, 0, 0, tzinfo=KST)
    assert get_log_date(dt) == date(2026, 5, 24)


# tests/test_calorie_utils.py

def test_calculate_bmr_male():
    """남성 BMR: 키 175, 몸무게 70, 나이 22"""
    bmr = calculate_bmr(weight=70, height=175, age=22, gender='male')
    expected = 10*70 + 6.25*175 - 5*22 + 5  # = 1,699.75
    assert abs(bmr - expected) < 1

def test_calculate_target_calories_lose():
    """감량 목표: TDEE - 500"""
    assert calculate_target_calories(tdee=2200, goal_type='lose') == 1700

def test_calculate_target_calories_minimum():
    """최소 1200 kcal 보장"""
    assert calculate_target_calories(tdee=1400, goal_type='lose') == 1200
```

---

## 14. 개발 환경 설정

### 14.1 로컬 개발 시작 순서

```bash
# 1. 레포지토리 클론
git clone https://github.com/your-repo/meallog.git
cd meallog

# 2. 프론트엔드 설정
cd frontend
cp .env.example .env.local
# .env.local 값 채우기

npm install
npm run dev
# → http://localhost:3000

# 3. 백엔드 설정 (새 터미널)
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

pip install -r requirements.txt

cp .env.example .env
# .env 값 채우기

alembic upgrade head            # DB 마이그레이션

uvicorn app.main:app --reload --port 8000
# → http://localhost:8000
# → http://localhost:8000/docs  (Swagger UI)

# 4. 폰트 파일 배치
cp 폰트_파일/*.ttf frontend/public/fonts/

# 5. AI 모델 가중치 배치
cp mobilenetv2_food.h5 backend/ai_model/weights/
cp food_labels.json    backend/ai_model/
```

### 14.2 코드 품질 도구

```bash
# 프론트엔드
npm run lint        # ESLint 검사
npm run type-check  # TypeScript 타입 검사
npx prettier --write .  # 포맷팅

# 백엔드
black app/          # 코드 포맷팅
isort app/          # import 정렬
mypy app/           # 타입 검사
pytest tests/       # 테스트 실행
```

### 14.3 Git 브랜치 전략

```
main          → 프로덕션 배포 브랜치
develop       → 개발 통합 브랜치
feature/*     → 기능 개발 브랜치 (예: feature/meal-upload)
fix/*         → 버그 수정 브랜치
hotfix/*      → 긴급 프로덕션 수정

PR 규칙:
  - feature/* → develop (코드 리뷰 후 머지)
  - develop   → main (스프린트 완료 후 배포)
  - 직접 main push 금지
```

---

*TRD 버전: v1.2 | 최초 작성: 2026-06 | 최종 수정: 2026-06-18*
*이 문서는 먹로그 AI와 머신러닝 수업 기말 프로젝트 기준으로 작성되었습니다.*
