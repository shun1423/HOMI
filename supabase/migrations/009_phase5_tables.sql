-- ============================================
-- Phase 5: Notion 연동 + 문서 보관
-- ============================================

-- 1. documents (계약/문서 보관)
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  contractor_id UUID REFERENCES contractors(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  doc_type TEXT NOT NULL DEFAULT 'other'
    CHECK (doc_type IN ('contract', 'estimate', 'warranty', 'other')),
  file_url TEXT,
  file_size TEXT,
  vendor TEXT,
  date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. notion_connections (Notion 연결 설정)
CREATE TABLE notion_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  access_token TEXT,
  workspace_id TEXT,
  workspace_name TEXT,
  synced_pages JSONB,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Triggers
CREATE TRIGGER set_updated_at BEFORE UPDATE ON notion_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notion_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_all" ON documents FOR ALL USING (is_project_member(project_id));
CREATE POLICY "members_all" ON notion_connections FOR ALL USING (is_project_member(project_id));
