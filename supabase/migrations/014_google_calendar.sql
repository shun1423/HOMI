-- Google Calendar connection per project
CREATE TABLE google_calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  calendar_id TEXT NOT NULL DEFAULT 'primary',
  sync_meetings BOOLEAN DEFAULT true,
  sync_tasks BOOLEAN DEFAULT false,
  sync_schedules BOOLEAN DEFAULT false,
  sync_construction BOOLEAN DEFAULT false,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON google_calendar_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE google_calendar_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_all" ON google_calendar_connections FOR ALL USING (is_project_member(project_id));
