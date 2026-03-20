-- ============================================
-- Phase 4: 공정 관리 + 비용 관리 + 시공 사진
-- ============================================

-- 1. tasks (공정 관리 태스크)
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo'
    CHECK (status IN ('todo', 'in_progress', 'done')),
  assignee_id UUID REFERENCES auth.users(id),
  contractor_id UUID REFERENCES contractors(id) ON DELETE SET NULL,
  start_date DATE,
  end_date DATE,
  depends_on UUID REFERENCES tasks(id) ON DELETE SET NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. expenses (지출 기록)
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  board_item_id UUID REFERENCES board_items(id) ON DELETE SET NULL,
  contractor_id UUID REFERENCES contractors(id) ON DELETE SET NULL,
  amount DECIMAL(12,0) NOT NULL,
  description TEXT,
  vendor TEXT,
  date DATE NOT NULL,
  category TEXT DEFAULT '자재'
    CHECK (category IN ('자재', '인건비', '배송비', '기타')),
  receipt_url TEXT,
  receipt_ocr_data JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. photos (시공 사진 — 프로젝트 전체 단위)
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  space_id UUID REFERENCES spaces(id) ON DELETE SET NULL,
  board_item_id UUID REFERENCES board_items(id) ON DELETE SET NULL,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  stage TEXT DEFAULT 'before'
    CHECK (stage IN ('before', 'during', 'after')),
  description TEXT,
  taken_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Triggers
CREATE TRIGGER set_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_all" ON tasks FOR ALL USING (is_project_member(project_id));
CREATE POLICY "members_all" ON expenses FOR ALL USING (is_project_member(project_id));
CREATE POLICY "members_all" ON photos FOR ALL USING (is_project_member(project_id));
