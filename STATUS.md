# STATUS.md — ShareSnap 개발 진행 상황

> **Claude Code는 매 세션 시작 시 이 파일을 가장 먼저 읽어야 합니다.**
> 작업 완료 후 반드시 이 파일을 업데이트하세요.

## 현재 상태

```
CURRENT_PHASE    : 프로덕션 배포 + 실프로덕션 E2E 검증 (Supabase rtnfltwmnizkjrrgjudk + Vercel sharesnap-three)
CURRENT_TASK     : 운영 오픈 잔여 외부작업(카카오 앱키, Storige webhook allowlist) + Phase 5(주문 결제) 진입
PROGRESS         : Phase 1+2+3+4(Storige)+프로덕션배포 완료 / 전체 ~60%
LAST_SESSION     : 2026-06-22 (세션 #6, 프로덕션 배포·502 근본수정·실키 E2E)
LAST_ACTION      : 프로덕션(sharesnap-three.vercel.app)에 실 Supabase/Storige 연결 후 E2E — 사진4장 업로드→포토북 세션생성 502 발견. 원인=Vercel STORIGE_API_URL 빈 문자열 env에서 `?? DEFAULT` 폴백 미작동. env 재설정+재배포로 200 복구 확인(sessionId 발급, canvasData=[null,4×내지] 전부 https 이미지 cover-fit, templateSetId=photobook-210-book-4p). 코드 근본수정: 동일 패턴 4곳 `?? → ||`(commit 47a7906).
BUILD_STATUS     : ✅ 로컬 빌드는 머신 과부하(load~100)로 미완 → Vercel 원격 빌드가 실 게이트. 변경은 타입동일(?? → ||)이라 빌드 무해.
BLOCKED_BY       : 운영 오픈 전 외부작업 — 카카오 앱키(NEXT_PUBLIC_KAKAO_JS_KEY·Provider) + Storige Admin에 sharesnap-three.vercel.app webhook(uploadCallbackUrl)·allowedOrigins 등록. 사용자 확인대기: Realtime publication(messages/photos).
```

## 로컬 테스트 환경 (세션 #3 구축)

```
Supabase 로컬 스택  : supabase start (포트 55321~55324, analytics off) — 마이그레이션 001~009 전체 적용 완료
.env.local         : 로컬 Supabase 데모 키 (STORIGE_API_KEY는 의도적 미설정 → 503 분기 테스트)
dev 서버           : npm run dev → localhost:3000
E2E 검증 완료       : 로그인(매직링크/auth/confirm) → 방생성 → 실시간채팅 → 사진4장 업로드(4종 리사이즈+print_path) → 갤러리그리드 → 뷰어 → 포토북토글 → Storige /embed iframe 연결
재현 방법           : supabase start && npm run dev, 매직링크는 admin generate_link API 또는 Mailpit(55324)
```

## 프로덕션 운영 환경 (세션 #6 구축 — 2026-06-22)

```
Supabase 운영      : https://rtnfltwmnizkjrrgjudk.supabase.co — 통합 마이그레이션(001~010+Realtime) 적용,
                     11테이블+RPC+009컬럼+4버킷(photos/thumbnails공개/resources/pdfs) 전부 검증 완료
Vercel 운영        : https://sharesnap-three.vercel.app (GitHub papascompany/sharesnap, PRIVATE 연결)
env(12+)          : SUPABASE URL/anon/service_role, APP_URL, STORIGE API_URL/KEY/EDITOR_URL,
                     PHOTOBOOK_PAGE_W/H_MM=210, TEMPLATE_SET_ID=**sharesnap-210sq-book**(완전한 book-mode 셋: 표지 spread 422×210 + 내지 page 210×210) — Vercel Production 설정됨
                     ⚠ 금지: 미적용 슬러그 photobook-210-book-4p(편집기 404), 표지만 있는 2f312032(내지 안 보임). 추가 판형은 표지+내지 page 템플릿 모두 갖춘 셋 UUID 사용
실키 E2E 검증       : 매직링크 로그인 → 방생성 → 사진4장 업로드(print_path) → 포토북 세션생성 200(sessionId 발급)
                     → canvasData=[null(표지),4×내지] 전부 https Supabase 이미지 cover-fit(scaleX 1.063) 주입 ✅
주의             : 키는 서버전용(service_role·STORIGE_API_KEY) — 절대 NEXT_PUBLIC/git 금지. 사용자가 채팅에 붙인 키는 회전 권장.
테스트 데이터       : room a8ed6e1d…, order 275945ec…, member_no=1, 사진 busan_1~4 (정리 시 삭제 가능)
```

## [NEXT_ACTION] — 다음 세션에서 즉시 실행할 작업

```bash
# 1) 작업 디렉토리: /Users/yohan/Documents/claude/Sharesnap  ← 단일 루트
# 2) 프로덕션 배포·E2E 완료. 운영 오픈 잔여는 코드 아님(외부작업):
#    - 카카오: Developers 앱키 → Vercel NEXT_PUBLIC_KAKAO_JS_KEY, Supabase Auth Kakao Provider 활성화
#    - Storige Admin → Sites → ShareSnap: uploadCallbackUrl=https://sharesnap-three.vercel.app/api/storige/webhook,
#      allowedOrigins/frameAncestors에 sharesnap-three.vercel.app 추가 (webhook 수신 + iframe CSP)
#    - 사용자 확인: Supabase Database>Publications에 supabase_realtime이 messages/photos 포함하는지
# 3) 그다음 Phase 5(주문/결제) 진입 — photobook_orders 결제연동 + 인화주문
# 4) 검증(머신 한가할 때): npx tsc --noEmit && npm run lint && npm run build  (또는 Vercel 원격 빌드로 갈음)
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
| 2026-06-15 | #4 | 템플릿+자동배치 | 210×210 4P 시드 SQL 작성 + 사진 자동배치(canvasData 주입) 구현. 실측 좌표계 기반 autoLayout.ts. 실키 검증: canvas_data 덤프 정확 + https 이미지 편집기 cover-fit 렌더 증명(dev http는 Mixed Content). build 클린 | ✅ | ~35m |
| 2026-06-20 | #5 | 감사+정리 | 외부연동 전수 감사(integration-inventory) → 폴더 중첩 제거(단일 루트) → GitHub papascompany/sharesnap 연결(PRIVATE) → 운영품질 정리(로그아웃·/me·/photobooks·/orders·welcome토스트·보안헤더4종·photos RLS강화010·maskable아이콘·.well-known·문서정합). build 클린(20 routes), push 완료 | ✅ | ~50m |
| 2026-06-22 | #6 | 프로덕션 배포 | 실 Supabase(rtnfltwmnizkjrrgjudk)+Vercel(sharesnap-three) 운영 셋업 마무리 — 스키마/버킷/env 전수 검증, 매직링크 E2E. 포토북 502 발견→원인 STORIGE_API_URL 빈문자열 env에서 `??` 폴백 미작동→env 재설정+재배포로 200 복구(sessionId+canvasData 4×내지 https 검증). 근본수정 `?? → ||` 4곳 커밋(47a7906)+재배포. 로컬빌드는 머신 load~100로 미완, Vercel 원격빌드로 갈음 | ✅ | ~60m |
| 2026-06-22 | #6 | 편집기 404 수정 | 사용자 실테스트로 편집기 "템플릿셋 조회 404(photobook-210-book-4p)" 발견 — env가 미적용 시드 슬러그를 가리킴(Storige에 미존재). 실재 셋 목록 조회→"sharesnap basic 210 H/C"(2f312032, 오늘 등록) 발견. autoLayout canvasData가 실재 셋과 호환됨을 실측(201, 표지 null 보존+내지 https 이미지). env를 UUID로 교체+재배포, 깨진 세션 2건 무효화. 편집기 editor.ready 로드(404 없음) E2E 확인. 문서 슬러그 정정 | ✅ | ~40m |
| 2026-06-22 | #6 | 편집기 내지 표시 수정 | "표지만 있고 내지 안 보임" 진단 — Storige 편집기 코드(useEditorContents/embed) 정밀 분석(Explore+직접read): 페이지는 셋의 templates로만 생성, 내지 복제는 기존 page 템플릿 필수(:1029). 셋 2f312032는 cover만+single@458×238 오설정이 원인(ShareSnap은 이미 정상, pageCount=canvasData길이-1 정확 도출). known-good 8×8 정사각책 구조를 210×210으로 복제한 **완전한 새 셋 sharesnap-210sq-book(표지 spread+내지 page)** DB INSERT(SSH+docker mariadb, 추가전용). env 전환+재배포+세션무효화. 편집기 표지+내지4+사진 cover-fit E2E 캡처 검증 | ✅ | ~90m |

---

## 알려진 이슈 / 블로커

| ID | 심각도 | 설명 | 상태 | 해결방법 |
|----|--------|------|------|----------|
| I-502 | 높음 | 프로덕션 /api/storige/session 502 — Vercel STORIGE_API_URL 빈 문자열 env에서 `?? DEFAULT` 폴백 미작동(빈문자열≠nullish) → apiUrl='' fetch 실패 | ✅ 해결(2026-06-22) | env 재설정+재배포로 즉시 복구. 근본수정: 동일 패턴 4곳 `?? → ||`(commit 47a7906) — 빈문자열도 폴백 |
| I-404 | 높음 | 편집기 "편집기를 열지 못했어요 / 템플릿셋을 불러올 수 없습니다(photobook-210-book-4p) 404" — env STORIGE_TEMPLATE_SET_ID가 **미적용 시드 슬러그**를 가리킴(Storige DB에 없음). createEditSession은 templateSetId를 검증 없이 저장만 해 세션생성 201이라 앞선 "검증"이 이를 못 잡음(편집기 화면 미확인) | ✅ 해결(2026-06-22) | env를 실재 셋으로 교체+재배포. 깨진 세션 무효화. 편집기 로드(editor.ready, 404 없음) E2E 확인 |
| I-NOINNER | 높음 | 편집기는 열리는데 **표지만 있고 내지가 안 보임**. 원인: 가리킨 셋 `2f312032`(sharesnap basic 210 H/C)가 **표지(cover) 템플릿만 있고 내지(page) 템플릿이 없음** + editor_mode=single·셋크기 458×238(펼침면)로 오설정. 편집기는 페이지를 templateSet의 templates로만 생성하고(useEditorContents:1073/1250), 내지 복제는 기존 page 템플릿이 있어야만 동작(:1029) → 주입한 내지 canvasData 무시 | ✅ 해결(2026-06-22) | Storige DB에 **완전한 새 셋 `sharesnap-210sq-book`**(8×8 known-good 복제: editor_mode=book, 셋 210×210, 표지 spread 422×210 + 내지 page 210×210) INSERT(추가전용·운영자 셋 무손상). ShareSnap env 전환+재배포+세션 무효화. **편집기에 표지+내지4 + 자동배치 사진 cover-fit 배치 E2E 캡처 확인**. ShareSnap 코드 변경 0 |

---

## 빌드/테스트 상태

```
TypeScript   : ✅ tsc --noEmit pass (세션 #5 시점). 세션 #6 변경은 `?? → ||`(타입 동일)이라 무해
ESLint       : ✅ 0 에러 0 경고
Build        : ✅ Vercel 원격 빌드 pass (2026-06-22, Build Completed 24s) — 로컬은 머신 load~100로 미완, 원격으로 갈음
Unit Test    : N/A (Phase 7)
E2E Test     : ✅ 프로덕션 실키 E2E (세션생성 200 + canvasData 4×내지 https 검증). 실기기 카톡 인앱 퍼널은 카카오 앱키 후
마지막 검증  : 2026-06-22 프로덕션 배포 + 502 수정 재검증 (세션 #6)
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
