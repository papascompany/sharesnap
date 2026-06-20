# STATUS.md — ShareSnap 개발 진행 상황

> **Claude Code는 매 세션 시작 시 이 파일을 가장 먼저 읽어야 합니다.**
> 작업 완료 후 반드시 이 파일을 업데이트하세요.

## 현재 상태

```
CURRENT_PHASE    : Phase 1 — Foundation
CURRENT_TASK     : T1.1 — Next.js 14 프로젝트 초기화
PROGRESS         : 0%
LAST_SESSION     : 2026-04-13
LAST_ACTION      : 프로젝트 계획 수립 완료, 개발 미시작
BUILD_STATUS     : N/A (프로젝트 미생성)
BLOCKED_BY       : 없음
```

## [NEXT_ACTION] — 다음 세션에서 즉시 실행할 작업

```bash
# Step 1: 프로젝트 생성
npx create-next-app@latest sharesnap --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# Step 2: 프로젝트 디렉토리 이동
cd sharesnap

# Step 3: 핵심 패키지 설치
npm install @supabase/supabase-js @supabase/ssr zustand
npm install -D @types/node

# Step 4: shadcn/ui 초기화
npx shadcn@latest init

# Step 5: shadcn/ui 필수 컴포넌트 설치
npx shadcn@latest add button input card dialog toast avatar dropdown-menu sheet tabs

# Step 6: 모듈 디렉토리 구조 생성
mkdir -p src/modules/{shared/{components,hooks,lib,types},auth/{components,hooks,services},room/{components,hooks,services},chat/{components,hooks,services},photo/{components,hooks,services},editor/{components/{toolbar,panels,mobile},hooks,services,utils},photobook/{components,hooks,services},print-order/{components,hooks,services},pdf/{generators,utils},admin/{components,services}}

# Step 7: 환경변수 파일 생성
cat > .env.local.example << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_KAKAO_JS_KEY=your_kakao_javascript_key
KAKAO_REST_API_KEY=your_kakao_rest_api_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF

# Step 8: CLAUDE.md, STATUS.md, MEMORY.md를 프로젝트 루트로 복사
# Step 9: 빌드 확인
npm run build
```

---

## Phase별 진행 현황

### Phase 1: Foundation (M0+M1) — 🔴 0% 진행 중
```
[ ] T1.1 Next.js 14 프로젝트 초기화
    [ ] create-next-app 실행 (App Router + TypeScript + Tailwind)
    [ ] shadcn/ui 설치 및 초기화
    [ ] 핵심 패키지 설치 (zustand, supabase, etc.)
    [ ] 모듈 디렉토리 구조 생성
    [ ] PWA manifest.json 설정
    [ ] .env.local.example 생성

[ ] T1.2 Supabase 클라이언트 설정
    [ ] src/modules/shared/lib/supabase/client.ts (브라우저용)
    [ ] src/modules/shared/lib/supabase/server.ts (서버용)
    [ ] src/modules/shared/lib/supabase/middleware.ts (미들웨어용)
    [ ] src/middleware.ts (인증 미들웨어)

[ ] T1.3 공용 모듈 (M0) 구현
    [ ] src/modules/shared/types/global.ts (전체 타입 정의)
    [ ] src/modules/shared/types/database.ts (Supabase DB 타입)
    [ ] src/modules/editor/utils/dpiConverter.ts (DPI 변환 유틸)
    [ ] src/modules/shared/lib/constants.ts (상수 정의)
    [ ] src/modules/shared/lib/utils.ts (공용 유틸리티)
    [ ] src/modules/shared/components/Layout.tsx (레이아웃)
    [ ] src/modules/shared/components/MobileLayout.tsx (모바일 레이아웃)
    [ ] src/modules/shared/components/ErrorBoundary.tsx
    [ ] src/modules/shared/components/LoadingSpinner.tsx
    [ ] src/modules/shared/hooks/useToast.ts

[ ] T1.4 DB 마이그레이션
    [ ] supabase/migrations/001_create_rooms.sql
    [ ] supabase/migrations/002_create_messages_photos.sql
    [ ] supabase/migrations/003_create_photobook_orders.sql
    [ ] supabase/migrations/004_create_print_orders.sql
    [ ] supabase/migrations/005_create_editor_resources.sql
    [ ] supabase/migrations/006_create_rls_policies.sql
    [ ] Storage 버킷 생성 스크립트

[ ] T1.5 인증 모듈 (M1) 구현
    [ ] src/modules/auth/types.ts
    [ ] src/modules/auth/services/authService.ts
    [ ] src/modules/auth/hooks/useAuth.ts
    [ ] src/modules/auth/components/LoginPage.tsx
    [ ] src/modules/auth/components/KakaoLoginButton.tsx
    [ ] src/modules/auth/components/AuthGuard.tsx
    [ ] src/app/(auth)/login/page.tsx
    [ ] src/app/auth/callback/route.ts (OAuth 콜백)

[ ] T1.6 빌드 검증
    [ ] tsc --noEmit 통과
    [ ] npm run build 통과
    [ ] 로그인 페이지 렌더링 확인

[Phase 1 완료 조건]
  □ npm run build 성공
  □ Supabase 연결 + DB 스키마 완료
  □ 카카오 로그인/로그아웃 동작
  □ Layout + ErrorBoundary 동작
  □ 모든 모듈 디렉토리 구조 생성 완료
```

### Phase 2: Room & Chat (M2+M3) — ⬜ 대기
```
[ ] T2.1 공유방 모듈 — 방 생성/수정/삭제, 초대 링크, 멤버 관리
[ ] T2.2 채팅 모듈 — Supabase Realtime, 메시지 송수신, Presence
[ ] T2.3 카카오톡 공유 — Kakao JS SDK, Feed 메시지 초대
[ ] T2.4 UI 스타일링 — 채팅방 UI, 모바일 반응형
[완료 조건] 방 생성/참여 + 실시간 채팅 + 카카오톡 초대 + 모바일 UI
```

### Phase 3: Photo (M4) — ⬜ 대기
```
[ ] T3.1 사진 업로드 — 다중 업로드, 이미지 처리 파이프라인
[ ] T3.2 갤러리 — 그리드/타임라인 뷰, 전체화면 뷰어
[ ] T3.3 코멘트 — 사진별 코멘트, 포토북 선택 토글
[ ] T3.4 Storage — 버킷 정책, 썸네일 자동 생성
[완료 조건] 다중 업로드 + 썸네일 + 갤러리(그리드/타임라인) + 코멘트
```

### Phase 4: Editor ⭐ (M5) — ⬜ 대기
```
[ ] T4.1 Fabric.js 기본 — dynamic import, 캔버스 초기화
[ ] T4.2 편집 도구 — 텍스트/이미지/도형/클립아트/배경
[ ] T4.3 모바일 최적화 — 핀치줌, 터치, 하단 툴바
[ ] T4.4 히스토리 — Undo/Redo
[ ] T4.5 저장/불러오기 — JSON 직렬화
[ ] T4.6 리소스 로드 — 서버 폰트/클립아트/배경
[완료 조건] SSR 없이 로드 + 편집 도구 + 모바일 터치 + Undo/Redo
```

### Phase 5: Photobook + PDF (M6+M8) — ⬜ 대기
```
[ ] T5.1-T5.7 위저드 + 자동편집 + 표지/내지 커스텀 + PDF 생성
[완료 조건] 자동 레이아웃 + 편집기 연동 + 300dpi PDF 생성
```

### Phase 6: Orders & Admin (M7+M9) — ⬜ 대기
```
[ ] T6.1-T6.4 인화주문 + 포토북주문 + 관리자 + 역할 인증
[완료 조건] 전체 주문 플로우 + 리소스 관리
```

### Phase 7: Integration & Deploy — ⬜ 대기
```
[ ] T7.1-T7.5 E2E 테스트 + 성능 + 배포 + 모니터링
[완료 조건] Vercel 프로덕션 배포 완료
```

---

## 세션 로그

| 날짜 | 세션# | Phase | 수행 작업 | 결과 | 소요 |
|------|-------|-------|----------|------|------|
| 2026-04-13 | #0 | 계획 | 개발계획서, 카카오API 분석, 오케스트레이션 문서 작성 | ✅ | - |

---

## 알려진 이슈 / 블로커

| ID | 심각도 | 설명 | 상태 | 해결방법 |
|----|--------|------|------|----------|
| (없음) | | | | |

---

## 빌드/테스트 상태

```
TypeScript   : N/A
ESLint       : N/A
Build        : N/A
Unit Test    : N/A
E2E Test     : N/A
마지막 검증  : N/A
```

---

## 파일 시스템 스냅샷 (Phase 1 완료 시점 예상)

```
sharesnap/
├── CLAUDE.md
├── STATUS.md
├── MEMORY.md
├── ORCHESTRATION.md
├── docs/
│   ├── dev-plan.md
│   └── kakao-api-report.md
├── supabase/
│   └── migrations/
│       ├── 001_create_rooms.sql
│       └── ...
├── src/
│   ├── app/
│   │   ├── (auth)/login/page.tsx
│   │   ├── (main)/layout.tsx
│   │   ├── auth/callback/route.ts
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── middleware.ts
│   └── modules/
│       ├── shared/
│       │   ├── components/
│       │   ├── hooks/
│       │   ├── lib/
│       │   └── types/
│       ├── auth/
│       ├── room/
│       ├── chat/
│       ├── photo/
│       ├── editor/
│       ├── photobook/
│       ├── print-order/
│       ├── pdf/
│       └── admin/
├── public/
│   ├── manifest.json
│   └── icons/
├── .env.local.example
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

> **[STATUS.md 업데이트 규칙]**
> - 태스크 완료: `[ ]` → `[x]`
> - Phase 진행률: PROGRESS 갱신
> - 세션 종료 시: NEXT_ACTION에 **다음에 바로 실행할 구체적 명령어** 기록
> - 세션 로그: 매 세션 한 줄 추가
> - 이슈 발견: 알려진 이슈 테이블에 추가
> - 빌드 실패: 빌드/테스트 상태 즉시 업데이트
