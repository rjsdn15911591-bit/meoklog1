# 먹로그 — REST API 엔드포인트 명세

> **Claude Code 작업 지시 문서 #3**
> 모든 API는 FastAPI로 구현합니다. 인증이 필요한 엔드포인트는 `🔐` 표시합니다.
> Base URL: `https://api.meallog.app` (로컬: `http://localhost:8000`)

---

## 1. 공통 규칙

### 요청 헤더
```
Content-Type: application/json
Authorization: Bearer {access_token}   ← 인증 필요 엔드포인트만
```

### 공통 응답 형식
```json
// 성공
{
  "success": true,
  "data": { ... },
  "message": "성공 메시지"
}

// 실패
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "사용자에게 보여줄 메시지",
    "detail": "개발자용 상세 메시지"
  }
}
```

### HTTP 상태 코드
| 코드 | 의미 |
|------|------|
| 200 | 성공 |
| 201 | 리소스 생성 성공 |
| 400 | 잘못된 요청 (유효성 검사 실패) |
| 401 | 인증 실패 (토큰 없음/만료) |
| 403 | 권한 없음 |
| 404 | 리소스 없음 |
| 409 | 충돌 (중복 등) |
| 422 | 요청 데이터 형식 오류 |
| 500 | 서버 내부 오류 |

### 날짜 포맷
- 날짜: `YYYY-MM-DD` (예: `2026-05-24`)
- 일시: ISO 8601 (`2026-05-24T13:30:00+09:00`)
- `log_date`는 항상 백엔드에서 `uploaded_at` 기준으로 자동 계산 (04:00 기준)

---

## 2. 인증 API (`/auth`)

### POST /auth/google
Google OAuth 코드로 로그인/회원가입 처리

```
Request Body:
{
  "code": "4/0AY0e-g7...",      // Google OAuth authorization code
  "redirect_uri": "http://localhost:3000/auth/callback"
}

Response 200:
{
  "success": true,
  "data": {
    "access_token": "eyJhbGci...",
    "token_type": "bearer",
    "expires_in": 604800,           // 7일 (초)
    "user": {
      "id": "uuid",
      "email": "user@gmail.com",
      "name": "홍길동",
      "avatar_url": "https://...",
      "is_new_user": true            // 신규 가입 여부
    }
  }
}
```

### POST /auth/refresh
액세스 토큰 갱신

```
Request Body:
{ "refresh_token": "eyJhbGci..." }

Response 200:
{
  "success": true,
  "data": {
    "access_token": "eyJhbGci...",
    "expires_in": 604800
  }
}
```

### POST /auth/dev-login ⚠️ 개발 환경 전용
개발 환경에서 즉시 로그인 (DB 유저 자동 생성)

`ENVIRONMENT=development`일 때만 동작. 프로덕션에서는 403 반환.

```
Request Body:
{
  "email": "test@example.com",
  "name": "테스트 유저"      // 선택 (기본값: email 앞부분)
}

Response 200:
{
  "success": true,
  "data": {
    "access_token": "eyJhbGci...",
    "user": {
      "id": "uuid",
      "email": "test@example.com",
      "name": "테스트 유저",
      "avatar_url": null
    }
  }
}

// 동작: DB에 해당 email 유저가 없으면 자동 생성
// 403: ENVIRONMENT != "development"
```

### POST /auth/logout 🔐
로그아웃 (토큰 무효화)

```
Response 200:
{ "success": true, "message": "로그아웃 완료" }
```

---

## 3. 사용자 API (`/users`)

### GET /users/me 🔐
내 프로필 조회

```
Response 200:
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@gmail.com",
    "name": "홍길동",
    "avatar_url": "https://...",
    "age": 22,
    "gender": "male",
    "height": 175.0,
    "weight": 70.0,
    "activity_level": "moderate",
    "goal_type": "maintain",
    "target_calories": 2200,
    "target_carbs": 275,
    "target_protein": 165,
    "target_fat": 73,
    "created_at": "2026-01-01T00:00:00+09:00"
  }
}
```

### PATCH /users/me 🔐
내 프로필 수정 (신체 정보, 목표 설정)

```
Request Body (모든 필드 선택):
{
  "name": "홍길동",
  "age": 22,
  "gender": "male",
  "height": 175.0,
  "weight": 70.0,
  "activity_level": "moderate",    // sedentary|light|moderate|active|very_active
  "goal_type": "maintain"          // lose|maintain|gain
}

Response 200:
{
  "success": true,
  "data": { ...업데이트된 user 객체... },
  "message": "프로필이 업데이트되었습니다."
}

// 사이드이펙트: goal_type 또는 신체 정보 변경 시 target_calories 자동 재계산
```

### GET /users/me/daily-summary 🔐
오늘 나의 칼로리 요약

```
Query Params:
  date: YYYY-MM-DD (기본값: 오늘)

Response 200:
{
  "success": true,
  "data": {
    "log_date": "2026-05-24",
    "total_calories": 1540,
    "total_carbs": 195,
    "total_protein": 88,
    "total_fat": 42,
    "target_calories": 2200,
    "achievement_rate": 70.0,
    "meal_count": 3,
    "breakdown": {
      "breakfast": 430,
      "lunch": 780,
      "dinner": 0,
      "snack": 330
    }
  }
}
```

---

## 4. 식사 기록 API (`/meals`)

### POST /meals 🔐
음식 사진 업로드 + AI 분석 (핵심 엔드포인트)

```
Request: multipart/form-data
  image: File                 // 이미지 파일 (jpg/png/webp, 최대 10MB)
  meal_type: string           // breakfast|lunch|dinner|snack
  caption: string (선택)

Response 201:
{
  "success": true,
  "data": {
    "meal_id": "uuid",
    "image_url": "https://res.cloudinary.com/...",
    "thumbnail_url": "https://res.cloudinary.com/.../thumbnail",
    "meal_type": "lunch",
    "uploaded_at": "2026-05-24T12:35:00+09:00",
    "log_date": "2026-05-24",
    "ai_result": {
      "detected_foods": [
        {
          "id": "uuid",
          "food_name": "흰쌀밥",
          "serving_size": 200.0,
          "calories": 260,
          "carbs": 56.2,
          "protein": 5.0,
          "fat": 0.6,
          "confidence": 0.94,
          "is_edited": false
        },
        {
          "id": "uuid",
          "food_name": "제육볶음",
          "serving_size": 200.0,
          "calories": 520,
          "carbs": 20.0,
          "protein": 32.0,
          "fat": 30.0,
          "confidence": 0.87,
          "is_edited": false
        }
      ],
      "total_calories": 780,
      "total_carbs": 76.2,
      "total_protein": 37.0,
      "total_fat": 30.6,
      "is_multi_food_detected": false
    }
  }
}

// 처리 흐름:
// 1. Cloudinary에 이미지 업로드
// 2. MobileNetV2로 AI 분석
// 3. food_items DB에서 영양 정보 조회
// 4. meal_records + detected_foods에 저장
// 5. 같은 그룹 있으면 Realtime 이벤트 발행
```

### PATCH /meals/{meal_id}/foods 🔐
AI 분석 결과 수정 (음식명, 양, 칼로리)

```
Request Body:
{
  "detected_foods": [
    {
      "id": "uuid",                  // detected_food id
      "food_name": "제육볶음",         // 수정된 음식명
      "serving_size": 150.0,         // 수정된 양(g)
      "calories": 390,               // 수정된 칼로리
      "carbs": 15.0,
      "protein": 24.0,
      "fat": 22.5
    }
  ]
}

Response 200:
{
  "success": true,
  "data": {
    "meal_id": "uuid",
    "total_calories": 650,           // 재계산된 합계
    "total_carbs": 71.2,
    "total_protein": 29.0,
    "total_fat": 23.1,
    "detected_foods": [ ...수정된 목록... ]
  }
}
```

### GET /meals 🔐
날짜별 내 식사 기록 목록

```
Query Params:
  date: YYYY-MM-DD (필수)

Response 200:
{
  "success": true,
  "data": {
    "log_date": "2026-05-24",
    "meals": [
      {
        "id": "uuid",
        "meal_type": "breakfast",
        "image_url": "...",
        "thumbnail_url": "...",
        "total_calories": 430,
        "uploaded_at": "...",
        "detected_foods": [ ...목록... ]
      }
    ],
    "daily_total": {
      "calories": 1540,
      "carbs": 195,
      "protein": 88,
      "fat": 42
    }
  }
}
```

### GET /meals/{meal_id} 🔐
식사 상세 조회

```
Response 200:
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "image_url": "...",
    "meal_type": "lunch",
    "uploaded_at": "...",
    "log_date": "2026-05-24",
    "total_calories": 780,
    "total_carbs": 76.2,
    "total_protein": 37.0,
    "total_fat": 30.6,
    "caption": "점심 정식",
    "detected_foods": [ ...상세 목록... ],
    "reactions": [
      { "type": "yummy", "count": 3, "users": ["민수", "서영", "지훈"] }
    ],
    "comments": [
      {
        "id": "uuid",
        "user": { "id": "uuid", "name": "민수", "avatar_url": "..." },
        "content": "맛있겠다 ㅠㅠ",
        "created_at": "..."
      }
    ]
  }
}
```

### DELETE /meals/{meal_id} 🔐
식사 기록 삭제 (본인 것만 가능)

```
Response 200:
{ "success": true, "message": "삭제되었습니다." }
```

---

## 5. 그룹 API (`/groups`)

### POST /groups 🔐
그룹 생성

```
Request Body:
{ "group_name": "다이어트 챌린지" }

Response 201:
{
  "success": true,
  "data": {
    "id": "uuid",
    "group_name": "다이어트 챌린지",
    "group_code": "AB3X9K2M",
    "owner_id": "uuid",
    "members": [
      { "user_id": "uuid", "name": "홍길동", "avatar_url": "...", "joined_at": "..." }
    ],
    "created_at": "..."
  }
}
```

### POST /groups/join 🔐
그룹 코드로 입장

```
Request Body:
{ "group_code": "AB3X9K2M" }

Response 200:
{
  "success": true,
  "data": { ...그룹 정보... },
  "message": "그룹에 참여했습니다."
}

// 오류 케이스:
// 404: 존재하지 않는 코드
// 409: 이미 그룹에 참여 중
```

### GET /groups 🔐
내가 속한 그룹 목록

```
Response 200:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "group_name": "다이어트 챌린지",
      "group_code": "AB3X9K2M",
      "member_count": 4,
      "is_owner": true,
      "joined_at": "..."
    }
  ]
}
```

### GET /groups/{group_id} 🔐
그룹 상세 정보

```
Response 200:
{
  "success": true,
  "data": {
    "id": "uuid",
    "group_name": "...",
    "group_code": "AB3X9K2M",
    "owner_id": "uuid",
    "members": [
      {
        "user_id": "uuid",
        "name": "홍길동",
        "avatar_url": "...",
        "joined_at": "...",
        "today_calories": 1540,      // 오늘 섭취 칼로리 (실시간)
        "target_calories": 2200
      }
    ],
    "created_at": "..."
  }
}
```

### GET /groups/{group_id}/feed 🔐
그룹 피드 (그룹원 식사 기록 목록)

```
Query Params:
  date: YYYY-MM-DD (기본값: 오늘)
  page: int (기본값: 1)
  limit: int (기본값: 20)

Response 200:
{
  "success": true,
  "data": {
    "meals": [
      {
        "id": "uuid",
        "user": { "id": "uuid", "name": "민수", "avatar_url": "..." },
        "meal_type": "lunch",
        "image_url": "...",
        "thumbnail_url": "...",
        "total_calories": 720,
        "caption": "오늘 점심",
        "uploaded_at": "2026-05-24T12:35:00+09:00",
        "reaction_summary": {
          "thumbsup": 2,
          "yummy": 3,
          "fire": 1
        },
        "comment_count": 2,
        "my_reaction": "yummy"       // 내가 누른 반응 (없으면 null)
      }
    ],
    "total": 15,
    "page": 1,
    "has_next": true
  }
}
```

### GET /groups/{group_id}/compare 🔐
그룹 칼로리 실시간 비교

```
Query Params:
  date: YYYY-MM-DD (기본값: 오늘)

Response 200:
{
  "success": true,
  "data": {
    "log_date": "2026-05-24",
    "group_average_calories": 1503,
    "rankings": [
      {
        "rank": 1,
        "user": { "id": "uuid", "name": "민수", "avatar_url": "..." },
        "today_calories": 2150,
        "target_calories": 2000,
        "achievement_rate": 107.5,
        "total_carbs": 268,
        "total_protein": 97,
        "total_fat": 71
      },
      {
        "rank": 2,
        "user": { "id": "uuid", "name": "서영", "avatar_url": "..." },
        "today_calories": 1820,
        "target_calories": 2000,
        "achievement_rate": 91.0,
        ...
      }
    ]
  }
}
```

### DELETE /groups/{group_id}/leave 🔐
그룹 탈퇴 (방장은 다른 멤버에게 양도 후 탈퇴 가능)

```
Response 200:
{ "success": true, "message": "그룹을 탈퇴했습니다." }
```

---

## 6. 반응 & 댓글 API

### POST /meals/{meal_id}/reactions 🔐
이모티콘 반응 추가/토글

```
Request Body:
{ "type": "yummy" }    // thumbsup|yummy|fire|muscle|sad

Response 200:
{
  "success": true,
  "data": {
    "action": "added",             // added 또는 removed (토글)
    "type": "yummy",
    "reaction_summary": {
      "thumbsup": 2,
      "yummy": 4
    }
  }
}
```

### GET /meals/{meal_id}/comments 🔐
댓글 목록

```
Response 200:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "user": { "id": "uuid", "name": "서영", "avatar_url": "..." },
      "content": "맛있겠다!!",
      "created_at": "..."
    }
  ]
}
```

### POST /meals/{meal_id}/comments 🔐
댓글 작성

```
Request Body:
{ "content": "진짜 맛있어 보인다" }

Response 201:
{
  "success": true,
  "data": { ...댓글 객체... }
}
```

### DELETE /meals/{meal_id}/comments/{comment_id} 🔐
댓글 삭제 (본인 것만)

```
Response 200:
{ "success": true, "message": "댓글이 삭제되었습니다." }
```

---

## 7. AI 분석 API (`/ai`)

### POST /ai/analyze 🔐
이미지 AI 분석만 수행 (저장 없이 미리보기용)

```
Request: multipart/form-data
  image: File

Response 200:
{
  "success": true,
  "data": {
    "detected_foods": [
      {
        "food_name": "흰쌀밥",
        "serving_size": 200.0,
        "calories": 260,
        "carbs": 56.2,
        "protein": 5.0,
        "fat": 0.6,
        "confidence": 0.94
      }
    ],
    "total_calories": 780,
    "processing_time_ms": 340
  }
}
```

### GET /ai/foods/search 🔐
음식 이름으로 영양DB 검색 (수정 시 자동완성용)

```
Query Params:
  q: string (검색어, 최소 1글자)
  limit: int (기본값: 10)

Response 200:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "food_name": "제육볶음",
      "calories": 260,
      "carbs": 10.0,
      "protein": 16.0,
      "fat": 15.0,
      "serving_size": 100
    }
  ]
}
```

---

## 8. FastAPI 구현 패턴 (백엔드 코드 가이드)

### main.py 구조
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, meals, groups, users, ai_analysis
from app.config import settings

app = FastAPI(
    title="먹로그 API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(auth.router, prefix="/auth", tags=["인증"])
app.include_router(users.router, prefix="/users", tags=["사용자"])
app.include_router(meals.router, prefix="/meals", tags=["식사 기록"])
app.include_router(groups.router, prefix="/groups", tags=["그룹"])
app.include_router(ai_analysis.router, prefix="/ai", tags=["AI 분석"])

@app.get("/health")
async def health_check():
    return {"status": "ok"}
```

### 인증 미들웨어 패턴
```python
# app/middleware/auth_middleware.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token expired or invalid")

    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user
```

### date_utils.py (04:00 기준 날짜 계산)
```python
# app/utils/date_utils.py
from datetime import datetime, date, timedelta
from zoneinfo import ZoneInfo

KST = ZoneInfo("Asia/Seoul")

def get_log_date(uploaded_at: datetime) -> date:
    """
    업로드 시각을 04:00 기준 날짜로 변환
    예) 2026-05-25 02:30 KST → 2026-05-24 (전날 식단으로 처리)
    예) 2026-05-25 05:00 KST → 2026-05-25
    """
    kst_time = uploaded_at.astimezone(KST)
    if kst_time.hour < 4:
        return (kst_time - timedelta(days=1)).date()
    return kst_time.date()

def get_day_range(log_date: date) -> tuple[datetime, datetime]:
    """
    log_date에 해당하는 실제 시간 범위 반환
    예) 2026-05-24 → (2026-05-24 04:00:00 KST, 2026-05-25 03:59:59 KST)
    """
    start = datetime(log_date.year, log_date.month, log_date.day, 4, 0, 0, tzinfo=KST)
    end = start + timedelta(days=1) - timedelta(seconds=1)
    return start, end
```

---

*문서 버전: v1.0 | 작성일: 2026-06*
