# Claude Code 작업 가이드

## 프로젝트 컨텍스트

이 프로젝트는 집 인테리어/시공 프로젝트를 관리하는 AI 기반 웹앱입니다.
사용자 2명 (성훈, 태수)이 포천 한옥 인테리어를 위해 사용합니다.

## 문서 참조 순서

1. `01_PROJECT_OVERVIEW.md` — 프로젝트 전체 개요
2. `02_FEATURES.md` — 기능 상세 명세 (F01~F11)
3. `03_PHASES.md` — 개발 순서 및 체크리스트
4. `04_TECH_STACK.md` — 기술 스택 + 프로젝트 구조
5. `05_DATA_MODEL.md` — 데이터베이스 스키마
6. `06_SCREEN_DESIGN.md` — 화면 설계 와이어프레임

## 개발 원칙

### 코드 스타일
- TypeScript strict mode
- 함수형 컴포넌트 + React hooks
- Server Components 우선, 필요 시 Client Components ("use client")
- 컴포넌트는 단일 책임 원칙
- 한국어 UI 텍스트, 영어 코드/변수명

### 상태 관리
- Server state: Supabase + React Query (TanStack Query)
- Client state: zustand 또는 React Context (가벼운 것들)
- Form state: react-hook-form + zod validation

### AI 관련
- Claude API 호출은 모두 서버 사이드 (API Routes)
- System prompt에 프로젝트 보드 현재 상태 포함
- Tool use / Function calling으로 구조화된 액션 실행
- Intent 분류: UPDATE | QUESTION | NOTION_ANALYZE

### 파일 업로드
- Supabase Storage 사용
- 이미지: 클라이언트에서 리사이즈 후 업로드
- 썸네일 자동 생성

### 반응형
- Mobile-first 접근
- Tailwind breakpoints: sm(640px), md(768px), lg(1024px)
- 모바일에서 현장 사용 고려 (카메라, 사진 업로드 등)

## Phase별 작업 시 주의사항

### Phase 1 작업 시
- Supabase 로컬 개발 환경 셋업 (supabase init, supabase start)
- DB 마이그레이션 파일로 스키마 관리
- RLS 정책 반드시 설정
- 프로젝트 보드 매트릭스 UI가 핵심 — 성능/UX에 집중
- 채팅 Intent 분류 정확도가 중요 — 테스트 케이스 충분히

### Phase 2 작업 시
- 지도 API 키 관리 (환경변수)
- 장소 검색은 웹 검색 + Places API 조합
- 동선 최적화: Directions API 활용
- 시공업자는 장소(places) 테이블과 별도 관리

### Phase 3 작업 시
- 비교 보드 → 프로젝트 보드 연결이 핵심
- 드래그앤드롭은 dnd-kit 사용
- URL 붙여넣기 → Open Graph 썸네일 추출

### Phase 4 작업 시
- 간트차트: 라이브러리 검토 (frappe-gantt, dhtmlxGantt 등)
- 영수증 OCR: Claude Vision API (이미지 → 구조화 데이터)
- 비용 차트: recharts 사용

### Phase 5 작업 시
- Notion OAuth 플로우 구현
- Notion API rate limit 주의
- 대량 데이터 싱크 시 batch 처리

## 환경 변수 목록

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Claude API
ANTHROPIC_API_KEY=

# 지도 API (택1)
NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID=
NEXT_PUBLIC_KAKAO_MAPS_APP_KEY=

# Notion
NOTION_CLIENT_ID=
NOTION_CLIENT_SECRET=
NOTION_REDIRECT_URI=

# 웹 검색 (택1)
NAVER_SEARCH_CLIENT_ID=
NAVER_SEARCH_CLIENT_SECRET=
# or
GOOGLE_SEARCH_API_KEY=
GOOGLE_SEARCH_CX=
```

## 커밋 컨벤션

```
feat: 새 기능
fix: 버그 수정
refactor: 리팩토링
style: UI/스타일 변경
docs: 문서
chore: 설정/빌드
```

## 테스트

- 핵심 로직 (Intent 분류, 데이터 매핑) → 유닛 테스트
- API Routes → Integration 테스트
- 전체 Flow → E2E 테스트 (나중에)
