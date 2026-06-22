# 먹로그 — 데이터베이스 스키마

> **Claude Code 작업 지시 문서 #2**
> Supabase(PostgreSQL) 기준으로 작성되었습니다. Alembic 마이그레이션으로 적용하세요.

---

## 1. ERD (Entity Relationship Diagram)

```
┌─────────────┐       ┌───────────────────┐       ┌─────────────────┐
│    users    │       │   meal_records    │       │  detected_foods │
│─────────────│       │───────────────────│       │─────────────────│
│ id (PK)     │──┐    │ id (PK)           │──┐    │ id (PK)         │
│ email       │  │    │ user_id (FK)      │◄─┘    │ meal_id (FK)    │◄─┐
│ name        │  └───►│ group_id (FK,null)│        │ food_item_id FK │  │
│ avatar_url  │       │ image_url         │        │ food_name       │  │
│ age         │       │ thumbnail_url     │        │ serving_size    │  │
│ gender      │       │ meal_type         │        │ calories        │  │
│ height      │       │ uploaded_at       │        │ carbs           │  │
│ weight      │       │ log_date          │        │ protein         │  │
│ activity_level│     │ total_calories    │        │ fat             │  │
│ goal_type   │       │ total_carbs       │        │ confidence      │  │
│ target_cals │       │ total_protein     │        │ is_edited       │  │
│ target_carbs│       │ total_fat         │        └─────────────────┘  │
│ target_prot │       │ caption           │                             │
│ target_fat  │       └───────────────────┘        ┌─────────────────┐  │
│ created_at  │                │                   │  food_items     │  │
└─────────────┘                │                   │─────────────────│  │
       │                       │                   │ id (PK)         │──┘
       │                       ▼                   │ food_name       │
       │              ┌─────────────────┐          │ calories        │
       │              │   reactions     │          │ carbs           │
       │              │─────────────────│          │ protein         │
       │              │ id (PK)         │          │ fat             │
       │              │ meal_id (FK)    │          │ serving_size    │
       │              │ user_id (FK)    │          │ category        │
       │              │ type            │          │ is_korean       │
       │              │ created_at      │          └─────────────────┘
       │              └─────────────────┘
       │
       │     ┌─────────────┐     ┌──────────────────┐
       │     │   groups    │     │  group_members   │
       │     │─────────────│     │──────────────────│
       │     │ id (PK)     │◄────│ group_id (FK)    │
       │     │ group_name  │     │ user_id (FK)     │◄────┘
       │     │ group_code  │     │ joined_at        │
       │     │ owner_id FK │     └──────────────────┘
       │     │ created_at  │
       │     └─────────────┘
       │
       │     ┌───────────────────────┐
       └────►│      comments         │
             │───────────────────────│
             │ id (PK)               │
             │ meal_id (FK)          │
             │ user_id (FK)          │
             │ content               │
             │ created_at            │
             └───────────────────────┘
```

---

## 2. 테이블 상세 정의

### 2.1 users

```sql
CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email             VARCHAR(255) UNIQUE NOT NULL,
  name              VARCHAR(100) NOT NULL,
  avatar_url        TEXT,
  
  -- 신체 정보 (선택 입력)
  age               SMALLINT CHECK (age BETWEEN 1 AND 120),
  gender            VARCHAR(10) CHECK (gender IN ('male', 'female')),
  height            DECIMAL(5,1),   -- cm (예: 175.5)
  weight            DECIMAL(5,1),   -- kg (예: 70.2)
  activity_level    VARCHAR(20) CHECK (activity_level IN (
                      'sedentary', 'light', 'moderate', 'active', 'very_active'
                    )),
  
  -- 목표 설정
  goal_type         VARCHAR(10) CHECK (goal_type IN ('lose', 'maintain', 'gain')),
  target_calories   SMALLINT,        -- kcal (자동 계산 또는 수동 입력)
  target_carbs      SMALLINT,        -- g
  target_protein    SMALLINT,        -- g
  target_fat        SMALLINT,        -- g
  
  -- 메타
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS (Row Level Security): 본인 데이터만 조회/수정 가능
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_self_access" ON users
  USING (auth.uid() = id);
```

### 2.2 meal_records

```sql
CREATE TABLE meal_records (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id          UUID REFERENCES groups(id) ON DELETE SET NULL,
  
  -- 이미지
  image_url         TEXT NOT NULL,
  thumbnail_url     TEXT NOT NULL,
  
  -- 식사 분류
  meal_type         VARCHAR(10) NOT NULL CHECK (meal_type IN (
                      'breakfast', 'lunch', 'dinner', 'snack'
                    )),
  uploaded_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- 하루 기준 날짜 (04:00 기준으로 백엔드에서 계산하여 저장)
  log_date          DATE NOT NULL,
  
  -- 영양 합계 (detected_foods 합산값을 캐싱)
  total_calories    SMALLINT NOT NULL DEFAULT 0,
  total_carbs       SMALLINT NOT NULL DEFAULT 0,
  total_protein     SMALLINT NOT NULL DEFAULT 0,
  total_fat         SMALLINT NOT NULL DEFAULT 0,
  
  -- 부가 정보
  caption           VARCHAR(200),
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스: 날짜별, 사용자별 조회 성능
CREATE INDEX idx_meal_records_user_logdate ON meal_records(user_id, log_date DESC);
CREATE INDEX idx_meal_records_group_logdate ON meal_records(group_id, log_date DESC);
CREATE INDEX idx_meal_records_uploaded_at ON meal_records(uploaded_at DESC);

-- RLS
ALTER TABLE meal_records ENABLE ROW LEVEL SECURITY;

-- 본인 기록: 읽기/쓰기
CREATE POLICY "meal_own_access" ON meal_records
  USING (auth.uid() = user_id);

-- 같은 그룹원: 읽기만
CREATE POLICY "meal_group_read" ON meal_records
  FOR SELECT
  USING (
    group_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = meal_records.group_id
        AND group_members.user_id = auth.uid()
    )
  );
```

### 2.3 detected_foods

```sql
CREATE TABLE detected_foods (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id           UUID NOT NULL REFERENCES meal_records(id) ON DELETE CASCADE,
  food_item_id      UUID REFERENCES food_items(id),   -- null이면 수동 입력
  
  -- AI가 인식하거나 사용자가 수정한 값
  food_name         VARCHAR(100) NOT NULL,
  serving_size      DECIMAL(6,1) NOT NULL,  -- g
  calories          SMALLINT NOT NULL,
  carbs             DECIMAL(6,1) NOT NULL,   -- g
  protein           DECIMAL(6,1) NOT NULL,
  fat               DECIMAL(6,1) NOT NULL,
  
  -- AI 분석 메타
  confidence        DECIMAL(4,3),           -- 0.000 ~ 1.000
  is_edited         BOOLEAN NOT NULL DEFAULT false,
  
  sort_order        SMALLINT DEFAULT 0,      -- 표시 순서
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_detected_foods_meal ON detected_foods(meal_id);
```

### 2.4 food_items (영양 DB)

```sql
CREATE TABLE food_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  food_name         VARCHAR(100) NOT NULL,
  food_name_en      VARCHAR(100),           -- 영문명 (Food-101 라벨 매핑용)
  
  -- 100g 기준 영양 정보
  calories          DECIMAL(6,1) NOT NULL,
  carbs             DECIMAL(6,1) NOT NULL,
  protein           DECIMAL(6,1) NOT NULL,
  fat               DECIMAL(6,1) NOT NULL,
  
  -- 기본 1회 제공량
  serving_size      DECIMAL(6,1) NOT NULL DEFAULT 100.0,  -- g
  
  -- 분류
  category          VARCHAR(50),            -- 예: '밥류', '국/찌개', '육류' 등
  is_korean         BOOLEAN NOT NULL DEFAULT false,
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_food_items_name ON food_items(food_name);
CREATE INDEX idx_food_items_name_en ON food_items(food_name_en);

-- 초기 데이터 (주요 음식 샘플 — 전체는 seed SQL 파일로 별도 관리)
INSERT INTO food_items (food_name, food_name_en, calories, carbs, protein, fat, serving_size, category, is_korean) VALUES
  ('흰쌀밥', 'steamed_rice', 130, 28.1, 2.5, 0.3, 200, '밥류', true),
  ('제육볶음', 'stir_fried_pork', 260, 10.0, 16.0, 15.0, 200, '육류', true),
  ('된장국', 'soybean_paste_soup', 60, 5.0, 4.0, 2.5, 200, '국/찌개', true),
  ('김치', 'kimchi', 15, 2.5, 1.0, 0.0, 100, '김치류', true),
  ('치킨', 'fried_chicken', 290, 15.0, 22.0, 16.0, 150, '튀김류', true),
  ('피자 1조각', 'pizza', 270, 33.0, 12.0, 10.0, 100, '패스트푸드', false),
  ('샐러드', 'salad', 80, 8.0, 3.0, 4.0, 150, '채소류', false);
```

### 2.5 groups

```sql
CREATE TABLE groups (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name        VARCHAR(50) NOT NULL,
  group_code        VARCHAR(20) UNIQUE NOT NULL,  -- 소셜: 8자리, 개인: PERSONAL-{uuid8}
  owner_id          UUID NOT NULL REFERENCES users(id),
  is_personal       BOOLEAN NOT NULL DEFAULT FALSE,  -- TRUE: 개인 하루로그 (탈퇴·참가 불가)
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_groups_code ON groups(group_code);

-- group_code 자동 생성 함수
CREATE OR REPLACE FUNCTION generate_group_code()
RETURNS VARCHAR(8) AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;
```

### 2.6 group_members

```sql
CREATE TABLE group_members (
  group_id          UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  PRIMARY KEY (group_id, user_id)
);

CREATE INDEX idx_group_members_user ON group_members(user_id);

-- RLS: 그룹 멤버만 조회 가능
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "group_members_access" ON group_members
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
        AND gm.user_id = auth.uid()
    )
  );
```

### 2.7 meal_group_shares (식사 ↔ 그룹 공유)

```sql
-- 식사 기록을 여러 그룹에 선택적으로 공유하는 다대다 테이블
-- 사용자가 저장 단계에서 공유할 그룹을 직접 선택함
CREATE TABLE meal_group_shares (
  meal_id           UUID NOT NULL REFERENCES meal_records(id) ON DELETE CASCADE,
  group_id          UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  shared_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  PRIMARY KEY (meal_id, group_id)
);

CREATE INDEX idx_meal_group_shares_group_id ON meal_group_shares (group_id);
CREATE INDEX idx_meal_group_shares_meal_id  ON meal_group_shares (meal_id);

-- Supabase Realtime 활성화 (그룹 피드 실시간 업데이트)
ALTER PUBLICATION supabase_realtime ADD TABLE meal_group_shares;
```

### 2.8 reactions

```sql
CREATE TABLE reactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id           UUID NOT NULL REFERENCES meal_records(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type              VARCHAR(20) NOT NULL CHECK (type IN (
                      'thumbsup', 'yummy', 'fire', 'muscle', 'sad'
                    )),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- 1인당 동일 식사에 동일 반응은 1회만
  UNIQUE (meal_id, user_id, type)
);

CREATE INDEX idx_reactions_meal ON reactions(meal_id);
```

### 2.9 comments

```sql
CREATE TABLE comments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id           UUID NOT NULL REFERENCES meal_records(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content           VARCHAR(500) NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_comments_meal ON comments(meal_id, created_at);
```

### 2.10 weight_records — v1.6 추가

```sql
CREATE TABLE weight_records (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weight            DECIMAL(5,1) NOT NULL,   -- kg
  recorded_at       DATE NOT NULL,            -- 기록 날짜 (하루 1회, 같은 날 덮어쓰기)
  note              TEXT,
  
  UNIQUE (user_id, recorded_at)              -- 같은 날 중복 방지
);

CREATE INDEX idx_weight_records_user_date ON weight_records(user_id, recorded_at DESC);
```

> **규칙:** 같은 날짜에 기록이 있으면 덮어쓰기(upsert). `POST /users/me/weight`에서 처리.

### 2.11 user_favorite_foods — v1.6 추가

```sql
CREATE TABLE user_favorite_foods (
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  food_id           UUID NOT NULL REFERENCES food_items(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  PRIMARY KEY (user_id, food_id)
);

CREATE INDEX idx_user_favorites_user ON user_favorite_foods(user_id, created_at DESC);
```

> **v1.5까지:** localStorage 저장만 (재로그인 시 유실).
> **v1.6:** 백엔드 DB에 동기화 — 어느 기기에서나 즐겨찾기 유지.

---

## 3. Supabase Realtime 설정

그룹 피드 실시간 업데이트를 위해 아래 테이블에 Realtime을 활성화합니다.

```sql
-- Supabase Dashboard > Database > Replication에서 설정하거나 SQL로:

ALTER PUBLICATION supabase_realtime ADD TABLE meal_records;
ALTER PUBLICATION supabase_realtime ADD TABLE reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
```

### 프론트엔드 Realtime 구독 코드 패턴
```typescript
// hooks/useGroupRealtime.ts
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

export function useGroupRealtime(groupId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`group-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'meal_records',
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          // 새 식사 기록 올라오면 그룹 피드 캐시 무효화
          queryClient.invalidateQueries({ queryKey: ['group-feed', groupId] });
          queryClient.invalidateQueries({ queryKey: ['calorie-compare', groupId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, queryClient]);
}
```

---

## 4. Alembic 마이그레이션 설정

```python
# backend/migrations/env.py 핵심 설정
from app.database import Base
from app.models import user, meal, group, food_item  # 모든 모델 임포트

target_metadata = Base.metadata
```

```bash
# 마이그레이션 생성 & 적용
alembic revision --autogenerate -m "initial_schema"
alembic upgrade head

# 롤백
alembic downgrade -1
```

---

## 5. 주요 쿼리 패턴

### 특정 날짜 식단 조회 (04:00 기준)
```sql
-- 2026-05-24 식단 = 2026-05-24 04:00 ~ 2026-05-25 03:59:59
SELECT * FROM meal_records
WHERE user_id = $1
  AND log_date = '2026-05-24'
ORDER BY uploaded_at ASC;
```

### 하루 총 칼로리 합산
```sql
SELECT
  user_id,
  SUM(total_calories) AS daily_total_calories,
  SUM(total_carbs)    AS daily_total_carbs,
  SUM(total_protein)  AS daily_total_protein,
  SUM(total_fat)      AS daily_total_fat
FROM meal_records
WHERE log_date = $1
  AND group_id = $2
GROUP BY user_id;
```

### 그룹 칼로리 비교 (목표 대비)
```sql
SELECT
  u.id,
  u.name,
  u.avatar_url,
  u.target_calories,
  COALESCE(SUM(m.total_calories), 0) AS today_calories,
  ROUND(
    COALESCE(SUM(m.total_calories), 0)::numeric /
    NULLIF(u.target_calories, 0) * 100, 1
  ) AS achievement_rate
FROM group_members gm
JOIN users u ON u.id = gm.user_id
LEFT JOIN meal_records m
  ON m.user_id = u.id
  AND m.group_id = $1
  AND m.log_date = $2
WHERE gm.group_id = $1
GROUP BY u.id, u.name, u.avatar_url, u.target_calories
ORDER BY today_calories DESC;
```

---

*문서 버전: v1.6 | 최초 작성: 2026-06 | 최종 수정: 2026-06-22*
