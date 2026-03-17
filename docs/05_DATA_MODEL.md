# 데이터 모델 (Supabase PostgreSQL)

## 핵심 원칙

- 모든 테이블에 `project_id` FK → 멀티 프로젝트 확장 가능 (현재는 1개 프로젝트)
- RLS로 프로젝트 멤버만 접근 가능
- soft delete (`deleted_at` timestamp) 사용
- `created_at`, `updated_at` 자동 관리

---

## 테이블 설계

### 1. projects (프로젝트)
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                    -- "포천 한옥"
  description TEXT,
  address TEXT,                          -- 시공 주소
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 2. project_members (프로젝트 멤버)
```sql
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner',    -- 'owner' | 'member'
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_id)
);
```

### 3. spaces (공간)
```sql
CREATE TABLE spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                    -- "화장실", "거실", "안방"
  description TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
```

### 4. item_categories (항목 카테고리)
```sql
-- 공통 항목 카테고리 (바닥, 벽, 천장, 조명, 설비 등)
-- 공간마다 다른 항목을 가질 수 있음
CREATE TABLE item_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                    -- "바닥", "벽", "세면대", "수전"
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 5. board_items (프로젝트 보드 항목 — 매트릭스의 각 셀)
```sql
CREATE TABLE board_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  category_id UUID REFERENCES item_categories(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'undecided',
    -- 'undecided' | 'has_candidates' | 'decided' | 'purchased' | 'installed'
  decision_content TEXT,                 -- 결정된 내용 ("마이크로 시멘트")
  notes TEXT,                            -- 메모
  estimated_budget DECIMAL(12,0),        -- 예산 (원)
  actual_cost DECIMAL(12,0),             -- 실제 비용 (원)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(space_id, category_id)          -- 한 공간에 같은 카테고리 항목은 하나
);
```

### 6. candidates (후보 제품 — 비교 보드)
```sql
CREATE TABLE candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_item_id UUID REFERENCES board_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                    -- 제품명
  brand TEXT,                            -- 브랜드
  price DECIMAL(12,0),                   -- 가격 (원)
  pros TEXT,                             -- 장점
  cons TEXT,                             -- 단점
  rating INT CHECK (rating >= 1 AND rating <= 5),  -- 별점
  purchase_url TEXT,                     -- 구매/쇼룸 링크
  notes TEXT,
  is_selected BOOLEAN DEFAULT false,     -- 최종 선택 여부
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 7. places (장소 — 쇼룸, 매장)
```sql
CREATE TABLE places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  business_hours TEXT,                   -- 영업시간
  website_url TEXT,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  distance_from_base DECIMAL(6,1),       -- 기준점(포천)에서 거리 (km)
  travel_time_minutes INT,               -- 이동 시간 (분)
  place_type TEXT,                       -- 'showroom' | 'store' | 'contractor' | 'other'
  category TEXT,                         -- "타일", "세면대", "조명" 등
  visit_status TEXT DEFAULT 'not_visited', -- 'not_visited' | 'planned' | 'visited'
  visit_date TIMESTAMPTZ,
  visit_notes TEXT,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  is_bookmarked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 8. schedules (방문 스케줄)
```sql
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,                   -- "쇼룸 투어 Day 1"
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 9. schedule_stops (스케줄 정거장)
```sql
CREATE TABLE schedule_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE,
  place_id UUID REFERENCES places(id) ON DELETE SET NULL,
  stop_order INT NOT NULL,
  planned_arrival TIME,
  planned_departure TIME,
  notes TEXT,                            -- "전화 예약 필요", "주차 가능"
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 10. contractors (시공업자)
```sql
CREATE TABLE contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                    -- 업체명/이름
  contact_name TEXT,                     -- 담당자명
  phone TEXT,
  email TEXT,
  specialty TEXT[],                      -- ['배관', '전기', '타일']
  rating INT CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 11. estimates (견적)
```sql
CREATE TABLE estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID REFERENCES contractors(id) ON DELETE CASCADE,
  board_item_id UUID REFERENCES board_items(id) ON DELETE SET NULL,
  amount DECIMAL(12,0),                  -- 견적 금액
  description TEXT,
  file_url TEXT,                         -- 견적서 파일 (Supabase Storage)
  date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 12. tasks (프로젝트 관리 태스크)
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,  -- 하위 태스크
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo',   -- 'todo' | 'in_progress' | 'done'
  assignee_id UUID REFERENCES auth.users(id),
  contractor_id UUID REFERENCES contractors(id) ON DELETE SET NULL,
  start_date DATE,
  end_date DATE,
  depends_on UUID REFERENCES tasks(id) ON DELETE SET NULL,  -- 선행 태스크
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 13. expenses (지출 기록)
```sql
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  board_item_id UUID REFERENCES board_items(id) ON DELETE SET NULL,
  contractor_id UUID REFERENCES contractors(id) ON DELETE SET NULL,
  amount DECIMAL(12,0) NOT NULL,
  description TEXT,
  vendor TEXT,                           -- 업체/매장명
  date DATE NOT NULL,
  category TEXT,                         -- "자재", "인건비", "배송비" 등
  receipt_url TEXT,                      -- 영수증 사진 (Supabase Storage)
  receipt_ocr_data JSONB,               -- OCR 추출 데이터 원본
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 14. photos (시공 사진)
```sql
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  space_id UUID REFERENCES spaces(id) ON DELETE SET NULL,
  board_item_id UUID REFERENCES board_items(id) ON DELETE SET NULL,
  file_url TEXT NOT NULL,                -- Supabase Storage URL
  thumbnail_url TEXT,
  stage TEXT,                            -- 'before' | 'during' | 'after'
  description TEXT,
  taken_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 15. mood_images (영감 보드)
```sql
CREATE TABLE mood_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  space_id UUID REFERENCES spaces(id) ON DELETE SET NULL,
  image_url TEXT NOT NULL,               -- 업로드 또는 외부 URL
  thumbnail_url TEXT,
  source_url TEXT,                       -- 원본 출처 (인스타, 핀터레스트 등)
  tags TEXT[],
  notes TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 16. documents (계약/문서)
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  contractor_id UUID REFERENCES contractors(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  doc_type TEXT NOT NULL,                -- 'contract' | 'estimate' | 'warranty' | 'other'
  file_url TEXT NOT NULL,                -- Supabase Storage URL
  vendor TEXT,
  date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 17. chat_messages (채팅 이력)
```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  role TEXT NOT NULL,                    -- 'user' | 'assistant'
  content TEXT NOT NULL,
  intent TEXT,                           -- 'update' | 'question' | 'notion_analyze' | null
  action_taken JSONB,                    -- 실행된 액션 기록 (어떤 보드 항목을 업데이트했는지 등)
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 18. notion_connections (Notion 연결 설정)
```sql
CREATE TABLE notion_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  access_token TEXT NOT NULL,            -- 암호화 저장
  workspace_id TEXT,
  workspace_name TEXT,
  synced_pages JSONB,                    -- 연동된 페이지 목록
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Supabase Storage 버킷

```
- receipts/      — 영수증 사진
- photos/        — 시공 사진
- documents/     — 계약서/견적서/보증서 PDF
- mood-images/   — 무드보드 이미지
- candidates/    — 후보 제품 사진
```

---

## RLS 정책 (예시)

```sql
-- 프로젝트 멤버만 접근 가능
CREATE POLICY "Members can access project data"
ON spaces FOR ALL
USING (
  project_id IN (
    SELECT project_id FROM project_members
    WHERE user_id = auth.uid()
  )
);
```

모든 프로젝트 관련 테이블에 동일 패턴 적용.
