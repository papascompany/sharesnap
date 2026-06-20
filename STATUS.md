# STATUS.md — ShareSnap 개발 진행 상황

> **Claude Code는 매 세션 시작 시 이 파일을 가장 먼저 읽어야 합니다.**
> 작업 완료 후 반드시 이 파일을 업데이트하세요.

## 현재 상태

```
CURRENT_PHASE    : Phase 4 완료 (Storige 임베드 연동 — ADR-011/v2, 실키 E2E 검증)
CURRENT_TASK     : Phase 5(주문) 또는 운영 오픈 준비(§6 회신 4건 + 실제 포토북 templateSet)
PROGRESS         : Phase 1+2+3+4(Storige) 완료 / 전체 ~55%
LAST_SESSION     : 2026-06-13 (세션 #3, Storige v2 + 실키 스모크 E2E)
LAST_ACTION      : Storige v2(세션생성+externalPhotos 주입) 개편 후 실제 STORIGE_API_KEY로 §5 전구간 스모크 검증 — 세션생성→편집기 로드→"공유방 사진"탭 4장 주입→캔버스 배치→편집완료→compose→PDF 다운로드(cover 1.2MB/content)→webhook→pdfs버킷→pdf_ready. 미들웨어 /api redirect 버그(웹훅차단) 수정.
BUILD_STATUS     : ✅ 성공 (Next.js 16.2.6 Turbopack, 14 routes, lint 0)
BLOCKED_BY       : 운영 오픈 전 §6 회신 4건(도메인/하드커버 상품구성/웹훅URL/회원체계) + 실제 포토북 templateSet(현재 dev용 A4 책자). 프로덕션 webhook은 공개 도메인 필요(dev는 localhost라 모사 검증).
```

## 로컬 테스트 환경 (세션 #3 구축)

```
Supabase 로컬 스택  : supabase start (포트 55321~55324, analytics off) — 마이그레이션 001~009 전체 적용 완료
.env.local         : 로컬 Supabase 데모 키 (STORIGE_API_KEY는 의도적 미설정 → 503 분기 테스트)
dev 서버           : npm run dev → localhost:3000
E2E 검증 완료       : 로그인(매직링크/auth/confirm) → 방생성 → 실시간채팅 → 사진4장 업로드(4종 리사이즈+print_path) → 갤러리그리드 → 뷰어 → 포토북토글 → Storige /embed iframe 연결
재현 방법           : supabase start && npm run dev, 매직링크는 admin generate_link API 또는 Mailpit(55324)
```

## [NEXT_ACTION] — 다음 세션에서 즉시 실행할 작업

```bash
# 1) 작업 디렉토리: /Users/yohan/Documents/claude/Sharesnap/sharesnap
# 2) Phase 4 — Fabric.js 편집기 (M5). ORCHESTRATION.md Phase 4 + docs/dev-plan.md M5 참조
#    ⚠ 절대 규칙: Fabric.js는 dynamic import + ssr:false (직접 import 시 빌드 실패)
#    npm install fabric 후 T4.1(캔버스 기초)부터. dpiConverter.ts(이미 구현됨) 사용
# 3) Phase 3 잔여 후속(소규모, Phase 4 진입 전 처리 권장):
#    - /rooms/[id]에서 ?welcome=1 수신 시 환영 toast 1회 (자동 입장 후 안내)
#    - maskable 아이콘 2종(icon-192/512-maskable.png) 생성 + manifest purpose:maskable 분리 (Phase 7 TWA 전 필수)
# 4) 검증
npx tsc --noEmit && npm run lint && npm run build

# 5) 외부 작업(코드 아님 — 운영자 진행 필요):
#    - Supabase 프로젝트 생성, .env.local 작성 (.env.local.example 참조)
#    - SQL Editor에서 supabase/migrations/001~008.sql 순서대로 실행 (008 = 참여 퍼널 RPC, 미적용 시 /join이 폴백 표시)
#    - Supabase Auth → URL Configuration → Redirect URLs에 {도메인}/auth/callback?* 등록 (쿼리 글롭 필수 — next 보존)
#    - 카카오 Developers 앱 등록 → JS 키를 NEXT_PUBLIC_KAKAO_JS_KEY로, Supabase Kakao Provider 설정
#    - rooms.cover_url에는 public(thumbnails) 버킷 URL만 저장 (signed URL 금지 — OG 깨짐)
#    - 실기기 E2E: 카톡 인앱 → /join 미리보기 → 카카오 로그인 → next 복귀 → 자동 입장 확인
```

---

## Phase별 진행 현황

### Phase 1: Foundation (M0+M1) — ✅ 100% 완료
```
[x] T1.1 Next.js 16 프로젝트 초기화 (계획상 14였으나 latest=16 채택)
    [x] create-next-app 실행 (App Router + TypeScript + Tailwind v4)
    [x] shadcn/ui 설치 및 초기화 (sonner 기반 toast)
    [x] 핵심 패키지 설치 (zustand, @supabase/supabase-js, @supabase/ssr)
    [x] 모듈 디렉토리 구조 생성 (10개 모듈)
    [x] PWA manifest.json 설정
    [x] .env.local.example 생성

[x] T1.2 Supabase 클라이언트 설정
    [x] src/modules/shared/lib/supabase/client.ts
    [x] src/modules/shared/lib/supabase/server.ts
    [x] src/modules/shared/lib/supabase/middleware.ts
    [x] src/middleware.ts (Next 16에서 deprecated 경고 → 추후 proxy로 마이그레이션)

[x] T1.3 공용 모듈 (M0) 구현
    [x] src/modules/shared/types/global.ts
    [x] src/modules/shared/types/database.ts (수동 정의, 후속 단계서 `supabase gen types`)
    [x] src/modules/editor/utils/dpiConverter.ts
    [x] src/modules/editor/types.ts
    [x] src/modules/shared/lib/constants.ts
    [x] src/modules/shared/lib/utils.ts
    [x] src/modules/shared/components/Layout.tsx
    [x] src/modules/shared/components/MobileLayout.tsx
    [x] src/modules/shared/components/ErrorBoundary.tsx
    [x] src/modules/shared/components/LoadingSpinner.tsx
    [x] src/modules/shared/hooks/useToast.ts

[x] T1.4 DB 마이그레이션 (SQL 파일 작성 완료. Supabase 실행은 외부 작업)
    [x] supabase/migrations/001_create_rooms.sql
    [x] supabase/migrations/002_create_messages_photos.sql
    [x] supabase/migrations/003_create_photobook.sql
    [x] supabase/migrations/004_create_print_orders.sql
    [x] supabase/migrations/005_create_editor_resources.sql
    [x] supabase/migrations/006_create_rls_policies.sql (헬퍼 함수 + 전체 정책)
    [x] supabase/migrations/007_create_storage_buckets.sql

[x] T1.5 인증 모듈 (M1) 구현
    [x] src/modules/auth/types.ts
    [x] src/modules/auth/services/authService.ts (카카오 OAuth + Magic Link)
    [x] src/modules/auth/hooks/useAuth.ts
    [x] src/modules/auth/components/KakaoLoginButton.tsx
    [x] src/modules/auth/components/LoginPage.tsx
    [x] src/modules/auth/components/AuthGuard.tsx
    [x] src/app/(auth)/login/page.tsx + layout.tsx
    [x] src/app/auth/callback/route.ts
    [x] src/app/(main)/layout.tsx (서버 측 redirect 가드)
    [x] src/app/(main)/page.tsx (→ /rooms 리디렉트)
    [x] src/app/(main)/rooms/page.tsx (Phase 2 진입용 stub)

[x] T1.6 빌드 검증
    [x] tsc --noEmit 통과
    [x] npm run build 통과 (Turbopack, 7 정적 페이지 생성)
    [ ] 로그인 페이지 브라우저 렌더링 확인 (.env.local 미설정으로 런타임 미검증)

[Phase 1 완료 조건]
  ✅ npm run build 성공
  ⚠ Supabase 연결: 마이그레이션 SQL은 작성 완료 — 실제 적용은 운영자 작업
  ⚠ 카카오 로그인: 코드는 완료 — 실 키 등록 후 검증 필요
  ✅ Layout + ErrorBoundary + MobileLayout 구현 완료
  ✅ 모든 모듈 디렉토리 구조 생성 완료
```

### Phase 2: Room & Chat (M2+M3) — ✅ 100% 완료
```
[x] T2.1 공유방 모듈 — types, roomService(생성/조회/수정/삭제/조인/탈퇴/멤버), useMyRooms/useRoom/useRoomMembers, RoomList/RoomCreate/RoomHeader/InviteLink/JoinRoom
[x] T2.2 채팅 모듈 — chatService, useChat + useRealtimeMessages (Supabase Realtime postgres_changes 구독), MessageList/MessageInput/PhotoMessage/SystemMessage/ChatRoom
[x] T2.3 카카오톡 공유 — kakao.ts(SDK 동적 로드+init), KakaoShareButton(InviteLink에 통합)
[x] T2.4 UI 스타일링 — MobileLayout 헤더/하단 네비, 채팅방 sticky 입력바, shadcn Card/Button/Input/Badge
[완료 조건]
  ✅ 방 생성/참여 페이지 빌드 통과
  ✅ Supabase Realtime 구독 코드 (런타임 검증은 .env.local 후 가능)
  ✅ /join/[shareCode] 외부 진입점
  ✅ 카카오 SDK 동적 로드 (NEXT_PUBLIC_KAKAO_JS_KEY 필요)
```

### Phase 3: Photo + Design + 참여 퍼널 (M4 확장판) — ✅ 100% 완료
```
[x] T3.0 디자인 파운데이션 — globals.css OKLCH 토큰(선셋 코랄/시네마 다크), Pretendard CDN, next-themes,
    lucide 글래스 네비, 로그인 히어로+바텀시트, 커버 카드 방목록, 새 채팅 버블, Skeleton, icon.svg, (main)/template.tsx 모션
[x] T3.1 참여 퍼널 P0 수정 — 008_join_funnel.sql(RPC 2종), next 보존+오픈리다이렉트 방어, /join SSR 미리보기 4분기+OG,
    RoomPreview(JoinRoom 대체), browserEnv(인앱 감지), buildFeedTemplate 3종, 인앱에서 Magic Link 숨김
[x] T3.2 사진 모듈 코어 — photoService(업로드 3종 경로/코멘트/토글/getPhotoById), imageProcessor(2560/1280/400px),
    photoPickerService(Capacitor 분기점), usePhotos(Realtime)/usePhotoUpload(큐·동시2)/usePhotoComments
[x] T3.3 갤러리 UI — PhotoUploader(FAB+진행 시트+카톡 알리기), PhotoGrid/Timeline(sticky 날짜), PhotoViewer(몰입 블랙
    +스와이프+포토북 토글), PhotoComments(바텀시트), photos 라우트, PhotoMessage 실썸네일, RoomHeader 갤러리 버튼
[x] T3.4 PWA 스캐폴딩 — sw.js(network-first+오프라인 폴백+Supabase 제외), ServiceWorkerRegister, /offline,
    manifest(id/start_url/display_override), 아이콘 PNG 3종(sharp-cli 파생 성공), apple-touch-icon
[x] T3.5 검증 — tsc 0 / lint 0 / build 통과 (11 routes)
[잔여 후속] /rooms/[id] welcome=1 toast, maskable 아이콘 2종(Phase 7 TWA 전)
[완료 조건] ✅ 빌드 통과 ✅ 코랄 토큰+다크모드 ✅ /join 미리보기(RPC 미적용 시 안전 폴백) ✅ 갤러리 플로우 ✅ SW (런타임은 외부 작업 후)
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
| 2026-05-16 | #1 | Phase 1 | T1.1~T1.6 전체 — 프로젝트 생성, Supabase 클라이언트, 공용 모듈, DB 마이그레이션, 인증 모듈, 빌드 검증 | ✅ | ~1h |
| 2026-05-16 | #1 | Phase 2 | T2.1~T2.4 — 공유방 CRUD, 채팅 Realtime, 카카오톡 공유, 모바일 UI, 빌드 통과(9 routes) | ✅ | ~40m |
| 2026-05-16 | #2 | 전략 | 멀티에이전트 워크플로우(4) — ux-flows/design-system/mobile-deployment 작성 + 교차 비평, P0 결함 2건 발견, 계획 문서(CLAUDE/MEMORY/ORCHESTRATION/dev-plan v2) 개정 | ✅ | ~16m |
| 2026-05-16 | #2 | Phase 3 | 멀티에이전트 워크플로우(6) — T3.0 디자인 개편 → T3.1 퍼널∥T3.2-3 사진∥T3.4 PWA 병렬 → 검증·수리. tsc/lint/build 클린(11 routes) | ✅ | ~37m |
| 2026-06-12 | #3 | Storige | editor.papascompany.co.kr 연동 가능성 심층평가(워크플로우 4) → docs/storige-integration-assessment.md, ADR-011 | ✅ | ~12m |
| 2026-06-13 | #3 | Storige | CTO 핸드오프(§3) 기반 연동 구현(워크플로우 4) — 009 마이그레이션, /api/storige/*, StorigeEditorHost, print_path. 14 routes 빌드 클린 | ✅ | ~13m |
| 2026-06-13 | #3 | E2E | 로컬 Supabase(55321) + 크롬 화면 테스트 — 로그인/방/채팅/업로드/갤러리/뷰어/포토북토글/Storige임베드 전구간. PhotoViewer StrictMode 버그 수정 | ✅ | ~30m |
| 2026-06-13 | #3 | Storige v2 | 세션 사전생성+externalPhotos(공유방 사진) 주입 개편(워크플로우 2트랙) — /session 개편+/reedit 신설+createEditSession, sessionId 임베드, complete→compose. 미들웨어 /api redirect 버그 수정(웹훅 차단 해소). build 클린 | ✅ | ~10m |
| 2026-06-13 | #3 | 실키 스모크 | 실제 STORIGE_API_KEY로 §5 전구간 — 세션생성(200)→편집기 로드→공유방사진 4장 주입→캔버스 배치→편집완료→compose(200)→PDF다운로드→webhook 모사→pdfs버킷+pdf_ready. 전부 통과 | ✅ | ~15m |

---

## 알려진 이슈 / 블로커

| ID | 심각도 | 설명 | 상태 | 해결방법 |
|----|--------|------|------|----------|
| (없음) | | | | |

---

## 빌드/테스트 상태

```
TypeScript   : ✅ tsc --noEmit pass (2026-05-16, 세션 #2)
ESLint       : ✅ 0 에러 0 경고
Build        : ✅ npm run build pass (Next.js 16.2.6 Turbopack, 11 routes)
Unit Test    : N/A (Phase 7)
E2E Test     : N/A (Phase 7) — 실기기 카톡 인앱 퍼널 E2E는 외부 작업 완료 후 필수
마지막 검증  : 2026-05-16 Phase 3 완료
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
