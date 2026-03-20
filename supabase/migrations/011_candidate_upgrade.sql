-- ============================================
-- 후보 제품 구조 업그레이드
-- 단가/단위/수량/사진/스펙 추가
-- ============================================

-- 1. candidates 테이블에 컬럼 추가
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS unit_price DECIMAL(12,0);
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS price_unit TEXT DEFAULT '원';
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS quantity DECIMAL(10,2);
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS spec_details JSONB;

-- 2. candidate_photos 테이블
CREATE TABLE candidate_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE NOT NULL,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  description TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE candidate_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_all" ON candidate_photos FOR ALL USING (
  EXISTS (
    SELECT 1 FROM candidates c
    JOIN board_items bi ON bi.id = c.board_item_id
    WHERE c.id = candidate_photos.candidate_id AND is_project_member(bi.project_id)
  )
);

-- 3. 기존 데이터에 단가/단위 채우기 (바닥재 후보들)
UPDATE candidates SET unit_price = 156250, price_unit = '원/㎡', quantity = 7.68
  WHERE id IN (SELECT id FROM candidates WHERE board_item_id = 'b1000000-0000-0000-0000-000000000001');

UPDATE candidates SET unit_price = 125000, price_unit = '원/㎡', quantity = 28
  WHERE board_item_id = 'b1000000-0000-0000-0000-000000000006' AND name LIKE '%마루%';

UPDATE candidates SET unit_price = 150000, price_unit = '원/㎡', quantity = 28
  WHERE board_item_id = 'b1000000-0000-0000-0000-000000000006' AND name LIKE '%대리석%';

-- 벽 타일 후보
UPDATE candidates SET unit_price = 39683, price_unit = '원/㎡', quantity = 20.16
  WHERE board_item_id = 'b1000000-0000-0000-0000-000000000002' AND name LIKE '%화이트%';

UPDATE candidates SET unit_price = 59524, price_unit = '원/㎡', quantity = 20.16
  WHERE board_item_id = 'b1000000-0000-0000-0000-000000000002' AND name LIKE '%그레이%';

UPDATE candidates SET unit_price = 19841, price_unit = '원/㎡', quantity = 20.16
  WHERE board_item_id = 'b1000000-0000-0000-0000-000000000002' AND name LIKE '%페인트%';

-- 단품 (세면대, 싱크대 등) — price_unit을 '원/개'로
UPDATE candidates SET price_unit = '원/개', quantity = 1
  WHERE board_item_id IN ('b1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000017')
  AND unit_price IS NULL;

-- 조명 후보
UPDATE candidates SET price_unit = '원/세트', quantity = 1
  WHERE board_item_id = 'b1000000-0000-0000-0000-000000000009';

-- spec_details 예시 데이터
UPDATE candidates SET spec_details = '{"크기":"300×600mm","두께":"10mm","마감":"무광"}'::jsonb
  WHERE name LIKE '%화이트 타일%';

UPDATE candidates SET spec_details = '{"크기":"600×600mm","두께":"12mm","마감":"폴리싱"}'::jsonb
  WHERE name LIKE '%그레이 대리석%';

UPDATE candidates SET spec_details = '{"유형":"수성","도포 횟수":"2회"}'::jsonb
  WHERE name LIKE '%방수 페인트%';

UPDATE candidates SET spec_details = '{"색온도":"3000K","밝기":"조절 가능"}'::jsonb
  WHERE name LIKE '%한지 펜던트%';

UPDATE candidates SET spec_details = '{"색온도":"4000K","크기":"Φ100mm","수량":"6개"}'::jsonb
  WHERE name LIKE '%매입 다운라이트%';

UPDATE candidates SET spec_details = '{"구성":"간접 LED + 한지 펜던트","색온도":"2700K~4000K"}'::jsonb
  WHERE name LIKE '%간접 조명%';
