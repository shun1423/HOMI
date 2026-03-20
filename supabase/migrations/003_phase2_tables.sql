-- ============================================
-- Phase 2: 장소 탐색 + 시공업자
-- ============================================

-- 1. places (장소 — 쇼룸, 매장)
CREATE TABLE places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  business_hours TEXT,
  website_url TEXT,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  distance_from_base DECIMAL(6,1),
  travel_time_minutes INT,
  place_type TEXT DEFAULT 'showroom'
    CHECK (place_type IN ('showroom', 'store', 'contractor', 'other')),
  category TEXT,
  visit_status TEXT DEFAULT 'not_visited'
    CHECK (visit_status IN ('not_visited', 'planned', 'visited')),
  visit_date TIMESTAMPTZ,
  visit_notes TEXT,
  visit_photos TEXT[],
  rating INT CHECK (rating >= 1 AND rating <= 5),
  is_bookmarked BOOLEAN DEFAULT false,
  -- 연결된 보드 항목들
  board_item_ids UUID[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. schedules (방문 스케줄)
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. schedule_stops (스케줄 정거장)
CREATE TABLE schedule_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE NOT NULL,
  place_id UUID REFERENCES places(id) ON DELETE SET NULL,
  stop_order INT NOT NULL,
  planned_arrival TIME,
  planned_departure TIME,
  notes TEXT,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. estimates (견적)
CREATE TABLE estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID REFERENCES contractors(id) ON DELETE CASCADE NOT NULL,
  board_item_id UUID REFERENCES board_items(id) ON DELETE SET NULL,
  amount DECIMAL(12,0),
  description TEXT,
  file_url TEXT,
  date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. contractor_history (연락/방문 이력)
CREATE TABLE contractor_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID REFERENCES contractors(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  notes TEXT,
  date DATE,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Triggers
CREATE TRIGGER set_updated_at BEFORE UPDATE ON places FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE places ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_all" ON places FOR ALL USING (is_project_member(project_id));
CREATE POLICY "members_all" ON schedules FOR ALL USING (is_project_member(project_id));

CREATE POLICY "members_all" ON schedule_stops FOR ALL USING (
  EXISTS (
    SELECT 1 FROM schedules s
    WHERE s.id = schedule_stops.schedule_id AND is_project_member(s.project_id)
  )
);

CREATE POLICY "members_all" ON estimates FOR ALL USING (
  EXISTS (
    SELECT 1 FROM contractors c
    WHERE c.id = estimates.contractor_id AND is_project_member(c.project_id)
  )
);

CREATE POLICY "members_all" ON contractor_history FOR ALL USING (
  EXISTS (
    SELECT 1 FROM contractors c
    WHERE c.id = contractor_history.contractor_id AND is_project_member(c.project_id)
  )
);
