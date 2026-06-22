-- 먹로그 DB 마이그레이션 001
-- 추가: 그룹 인원 제한, 개인 하루로그, 공유 그룹 선택

-- 1. groups 테이블에 is_personal 컬럼 추가
ALTER TABLE groups ADD COLUMN IF NOT EXISTS is_personal BOOLEAN NOT NULL DEFAULT FALSE;

-- group_code 길이 확장 (PERSONAL-{uuid8} 형식 수용)
ALTER TABLE groups ALTER COLUMN group_code TYPE VARCHAR(20);

-- 2. meal_group_shares 테이블 생성 (식사 ↔ 그룹 다대다)
CREATE TABLE IF NOT EXISTS meal_group_shares (
    meal_id   UUID NOT NULL REFERENCES meal_records(id) ON DELETE CASCADE,
    group_id  UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    shared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (meal_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_meal_group_shares_group_id
    ON meal_group_shares (group_id);

CREATE INDEX IF NOT EXISTS idx_meal_group_shares_meal_id
    ON meal_group_shares (meal_id);

-- 3. Supabase Realtime 활성화 (그룹 피드 실시간 업데이트)
ALTER PUBLICATION supabase_realtime ADD TABLE meal_group_shares;
