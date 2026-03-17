# 기술 스택 상세

## Frontend

### Next.js 15 (App Router)
- App Router 사용 (Server Components + Client Components)
- TypeScript 필수
- 반응형 디자인 (모바일 우선 — 현장에서 폰으로 사용)

### UI/스타일링
- **Tailwind CSS** — 유틸리티 기반 스타일링
- **shadcn/ui** — 기본 컴포넌트 라이브러리 (Button, Dialog, Card, Table 등)
- **lucide-react** — 아이콘
- **recharts** 또는 **Chart.js** — 비용 대시보드 차트
- **dnd-kit** 또는 **@hello-pangea/dnd** — 드래그앤드롭 (칸반, 무드보드 정렬)
- **date-fns** — 날짜 처리

### 지도
- **Naver Maps API** 또는 **Kakao Maps API**
  - 장소 표시, 거리 계산, 동선 최적화
  - 한국 내 장소 검색에 최적화
- Naver Maps 우선 검토 (Papago 팀이니 네이버 API 접근 용이)

---

## Backend / Database

### Supabase
- **PostgreSQL**: 메인 데이터베이스
- **Auth**: 사용자 인증 (이메일 or 소셜)
- **Storage**: 사진, 문서, 영수증 파일 저장
- **Realtime**: 성훈/태수 실시간 동기화 (선택적)
- **Edge Functions**: 필요 시 서버사이드 로직

### Row Level Security (RLS)
- 프로젝트 기반 접근 제어
- 성훈/태수 둘 다 같은 프로젝트에 접근 가능하도록

---

## AI / LLM

### Claude API (Anthropic)
- **모델**: claude-sonnet-4-20250514 (비용 효율) 또는 claude-opus-4-20250514 (복잡한 분석)
- **용도**:
  1. **대화형 입력 Intent 분류**: 사용자 메시지 → UPDATE / QUESTION / NOTION_ANALYZE 분류
  2. **프로젝트 보드 업데이트 파싱**: 자연어 → 구조화된 데이터 (공간, 항목, 내용, 상태)
  3. **Q&A**: 시공 관련 질문 답변
  4. **영수증 OCR**: Claude Vision으로 영수증 이미지 → 금액/날짜/업체 추출
  5. **Notion 분석**: Notion 콘텐츠 요약/정리
  6. **장소 검색 키워드 생성**: 결정사항 기반 쇼룸 검색어 자동 생성

### Prompt 설계 원칙
- System prompt에 프로젝트 보드 현재 상태 포함 (컨텍스트)
- 공간/항목 목록을 시스템 프롬프트에 포함 → 정확한 매칭
- Tool use / Function calling 활용하여 구조화된 액션 실행
- 한국어 최적화

---

## 외부 API

### Notion API
- **인증**: OAuth 2.0
- **주요 엔드포인트**:
  - `POST /v1/pages` — 페이지 생성
  - `POST /v1/databases` — DB 생성
  - `POST /v1/databases/{id}/query` — DB 쿼리
  - `GET /v1/pages/{id}` — 페이지 읽기
  - `GET /v1/blocks/{id}/children` — 블록 내용 읽기
- **용도**: 양방향 싱크 + 콘텐츠 읽어오기

### 웹 검색
- Naver Search API 또는 Google Custom Search
- 쇼룸/매장 검색, Q&A 답변 보강

---

## 배포

### Vercel
- Next.js 최적화 배포
- Edge Functions 지원
- 환경 변수 관리 (API 키)
- 프리뷰 배포 (PR별)

---

## 프로젝트 구조 (예상)

```
house-agent/
├── app/
│   ├── layout.tsx              # 루트 레이아웃 (사이드바 포함)
│   ├── page.tsx                # 대시보드 (홈)
│   ├── board/
│   │   ├── page.tsx            # 프로젝트 보드 매트릭스 뷰
│   │   └── [spaceId]/page.tsx  # 공간별 상세 뷰
│   ├── chat/
│   │   └── page.tsx            # Q&A + 대화형 입력
│   ├── places/
│   │   ├── page.tsx            # 장소 탐색
│   │   └── schedule/page.tsx   # 스케줄 짜기
│   ├── contractors/
│   │   └── page.tsx            # 시공업자 관리
│   ├── compare/
│   │   └── page.tsx            # 자재/제품 비교
│   ├── moodboard/
│   │   └── page.tsx            # 영감 보드
│   ├── timeline/
│   │   └── page.tsx            # 프로젝트 관리 (타임라인/칸반)
│   ├── budget/
│   │   └── page.tsx            # 비용 관리
│   ├── photos/
│   │   └── page.tsx            # 시공 사진 기록
│   ├── documents/
│   │   └── page.tsx            # 계약/문서 보관
│   └── api/
│       ├── chat/route.ts       # AI 채팅 API
│       ├── notion/route.ts     # Notion 연동 API
│       └── ocr/route.ts        # 영수증 OCR API
├── components/
│   ├── ui/                     # shadcn/ui 컴포넌트
│   ├── board/                  # 프로젝트 보드 관련
│   ├── chat/                   # 채팅 관련
│   ├── map/                    # 지도 관련
│   └── shared/                 # 공통 컴포넌트
├── lib/
│   ├── supabase/               # Supabase 클라이언트 + 쿼리
│   ├── claude/                 # Claude API 유틸리티
│   ├── notion/                 # Notion API 유틸리티
│   └── utils.ts                # 공통 유틸리티
├── types/
│   └── index.ts                # TypeScript 타입 정의
└── supabase/
    └── migrations/             # DB 마이그레이션 파일
```
