-- Zoom OAuth connections per project
CREATE TABLE zoom_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  user_id TEXT,
  user_email TEXT,
  user_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON zoom_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE zoom_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_all" ON zoom_connections FOR ALL USING (is_project_member(project_id));
