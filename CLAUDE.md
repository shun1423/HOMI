# CLAUDE.md — 집짓기 에이전트 프로젝트

## 프로젝트 요약

집 인테리어/시공 프로젝트를 관리하는 AI 기반 웹앱.
사용자 2명 (성훈, 태수)이 포천 한옥 인테리어를 위해 사용.

## 기술 스택

- Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- Supabase (PostgreSQL + Auth + Storage + Realtime)
- Claude API (대화형 입력, Q&A, OCR, Notion 분석)
- Naver Maps API 또는 Kakao Maps API
- Notion API
- 배포: Vercel

## 문서 위치

모든 기획/설계 문서는 `docs/` 디렉토리에 있음:

- `docs/01_PROJECT_OVERVIEW.md` — 프로젝트 개요, 배경, 핵심 가치
- `docs/02_FEATURES.md` — 11개 기능 상세 명세 (F01~F11)
- `docs/03_PHASES.md` — 5개 Phase 개발 순서 및 체크리스트
- `docs/04_TECH_STACK.md` — 기술 스택 상세 + 프로젝트 디렉토리 구조
- `docs/05_DATA_MODEL.md` — Supabase 18개 테이블 스키마 + Storage 버킷 + RLS
- `docs/06_SCREEN_DESIGN.md` — ASCII 와이어프레임 (전체 레이아웃, 각 화면)
- `docs/07_CLAUDE_CODE_GUIDE.md` — 개발 원칙, Phase별 주의사항, 환경변수

## 현재 Phase

Phase 1 — 프로젝트 셋업 + 프로젝트 보드 (F01) + Q&A/대화형 입력 (F04)

## 핵심 규칙

1. 한국어 UI, 영어 코드
2. Mobile-first 반응형
3. TypeScript strict mode
4. Server Components 우선
5. Supabase RLS 필수
6. AI 호출은 서버 사이드만
7. 새 기능 작업 전 반드시 `docs/02_FEATURES.md`와 `docs/03_PHASES.md` 참조
