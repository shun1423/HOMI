-- ============================================
-- 집짓기 에이전트 — Phase 1 스키마
-- ============================================

-- 1. projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. project_members
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- 3. spaces (공간)
CREATE TABLE spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon_key TEXT DEFAULT 'storage',
  color TEXT DEFAULT '#9B8B7A',
  sort_order INT DEFAULT 0,
  -- 평면도 레이아웃 데이터
  floor_x REAL DEFAULT 0,
  floor_y REAL DEFAULT 0,
  floor_width REAL DEFAULT 160,
  floor_height REAL DEFAULT 150,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- 4. board_items (프로젝트 보드 항목)
CREATE TABLE board_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'undecided'
    CHECK (status IN ('undecided', 'has_candidates', 'decided', 'purchased', 'installed')),
  decision_content TEXT,
  notes TEXT,
  estimated_budget DECIMAL(12,0),
  -- 비용 세분화
  cost_material DECIMAL(12,0),
  cost_labor DECIMAL(12,0),
  cost_delivery DECIMAL(12,0),
  cost_other DECIMAL(12,0),
  -- 자재 스펙
  spec_width TEXT,
  spec_height TEXT,
  spec_area TEXT,
  spec_quantity TEXT,
  spec_color TEXT,
  spec_model_name TEXT,
  spec_product_code TEXT,
  spec_purchase_url TEXT,
  -- 시공 정보
  contractor_id UUID,
  construction_date DATE,
  construction_end_date DATE,
  construction_notes TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- 5. candidates (후보 제품)
CREATE TABLE candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_item_id UUID REFERENCES board_items(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  brand TEXT,
  price DECIMAL(12,0),
  image_url TEXT,
  pros TEXT,
  cons TEXT,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  purchase_url TEXT,
  notes TEXT,
  is_selected BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. board_item_photos (항목별 사진)
CREATE TABLE board_item_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_item_id UUID REFERENCES board_items(id) ON DELETE CASCADE NOT NULL,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  stage TEXT DEFAULT 'reference'
    CHECK (stage IN ('reference', 'before', 'during', 'after')),
  description TEXT,
  taken_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. board_item_showrooms (항목별 쇼룸)
CREATE TABLE board_item_showrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_item_id UUID REFERENCES board_items(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  distance_km REAL,
  visit_status TEXT DEFAULT 'not_visited'
    CHECK (visit_status IN ('not_visited', 'planned', 'visited')),
  rating INT CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. board_item_memos (항목별 메모)
CREATE TABLE board_item_memos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_item_id UUID REFERENCES board_items(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. board_item_history (항목 변경 이력)
CREATE TABLE board_item_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_item_id UUID REFERENCES board_items(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. door_windows (문/창문 — 평면도)
CREATE TABLE door_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('door', 'window')),
  wall TEXT NOT NULL CHECK (wall IN ('top', 'bottom', 'left', 'right')),
  position REAL NOT NULL DEFAULT 0.5,
  width REAL NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. contractors (시공업자)
CREATE TABLE contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  specialty TEXT[],
  rating INT CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- board_items.contractor_id FK (deferred because contractors created after)
ALTER TABLE board_items
  ADD CONSTRAINT fk_board_items_contractor
  FOREIGN KEY (contractor_id) REFERENCES contractors(id) ON DELETE SET NULL;

-- 12. chat_messages (채팅)
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  intent TEXT,
  action_taken JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- updated_at 자동 업데이트 트리거
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON spaces FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON board_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON candidates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON contractors FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- RLS 정책
-- ============================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_item_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_item_showrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_item_memos ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_item_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE door_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- 프로젝트 멤버 확인 함수
CREATE OR REPLACE FUNCTION is_project_member(p_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = p_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- projects: 멤버만 조회, 소유자만 수정
CREATE POLICY "members_select" ON projects FOR SELECT USING (is_project_member(id));
CREATE POLICY "members_insert" ON projects FOR INSERT WITH CHECK (true);
CREATE POLICY "members_update" ON projects FOR UPDATE USING (is_project_member(id));

-- project_members: 자기 프로젝트만
CREATE POLICY "members_select" ON project_members FOR SELECT USING (user_id = auth.uid() OR is_project_member(project_id));
CREATE POLICY "members_insert" ON project_members FOR INSERT WITH CHECK (true);

-- project_id 기반 테이블들 일괄 정책
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['spaces', 'board_items', 'contractors', 'chat_messages']
  LOOP
    EXECUTE format('CREATE POLICY "members_all" ON %I FOR ALL USING (is_project_member(project_id))', tbl);
  END LOOP;
END;
$$;

-- board_item 하위 테이블들 (board_item_id 기반)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['candidates', 'board_item_photos', 'board_item_showrooms', 'board_item_memos', 'board_item_history']
  LOOP
    EXECUTE format('
      CREATE POLICY "members_all" ON %I FOR ALL USING (
        EXISTS (
          SELECT 1 FROM board_items bi
          WHERE bi.id = %I.board_item_id AND is_project_member(bi.project_id)
        )
      )', tbl, tbl);
  END LOOP;
END;
$$;

-- door_windows (space_id 기반)
CREATE POLICY "members_all" ON door_windows FOR ALL USING (
  EXISTS (
    SELECT 1 FROM spaces s
    WHERE s.id = door_windows.space_id AND is_project_member(s.project_id)
  )
);

-- ============================================
-- Storage 버킷
-- ============================================

INSERT INTO storage.buckets (id, name, public) VALUES
  ('photos', 'photos', true),
  ('documents', 'documents', false),
  ('mood-images', 'mood-images', true),
  ('candidates', 'candidates', true),
  ('receipts', 'receipts', false);

-- Storage RLS: 인증된 사용자 업로드 허용
CREATE POLICY "auth_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_select" ON storage.objects FOR SELECT TO authenticated USING (true);
CREATE POLICY "public_select" ON storage.objects FOR SELECT TO anon USING (bucket_id IN ('photos', 'mood-images', 'candidates'));
