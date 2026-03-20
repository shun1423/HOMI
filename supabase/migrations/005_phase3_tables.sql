-- ============================================
-- Phase 3: 영감 보드 (무드보드)
-- F08 비교 보드는 candidates 테이블 이미 있음
-- ============================================

-- mood_images (영감 보드)
CREATE TABLE mood_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  space_id UUID REFERENCES spaces(id) ON DELETE SET NULL,
  image_url TEXT,
  thumbnail_url TEXT,
  source_url TEXT,
  source_type TEXT DEFAULT 'upload'
    CHECK (source_type IN ('upload', 'instagram', 'pinterest', 'blog', 'other')),
  tags TEXT[],
  notes TEXT,
  is_liked BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER set_updated_at_mood BEFORE UPDATE ON mood_images FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE mood_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_all" ON mood_images FOR ALL USING (is_project_member(project_id));
