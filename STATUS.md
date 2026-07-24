# STATUS.md — ShareSnap 개발 진행 상황

> **Claude Code는 매 세션 시작 시 이 파일을 가장 먼저 읽어야 합니다.**
> 작업 완료 후 반드시 이 파일을 업데이트하세요.

## 현재 상태

```
CURRENT_PHASE    : 감사 후속 스프린트4 완료·배포(세션 #15) — profiles 작성자 표시·배송추적·인화 상세·공동주문·PWA 유도 라이브. **감사(docs/service-flow-audit.md) 지적 40건의 코드 항목 전부 소진**. 남은 것은 운영자 외부작업뿐(카카오·SMTP·마이그013~015·사업자실값·토스키).
PROGRESS         : Phase 1~4 + 상업화 스파인 + 주문 UX + 스프린트1~4(퍼널가드·법적게이트·성장/운영안전·정체성/공동주문) / 전체 ~92% (코드 기준). 잔여는 외부 설정·실 E2E
LAST_SESSION     : 2026-07-11 (세션 #15, 스프린트4 카카오 가동 후 항목 4종 구현·배포)
LAST_ACTION      : 스프린트4(코드) — ①profiles: 마이그015 테이블+auth 트리거+백필+RLS(같은 방 멤버만)+profileService/useProfiles → 채팅·뷰어·코멘트·방설정에 닉네임/아바타 ②배송추적: tracking 컬럼+admin 송장 입력+tracking.ts 택배사 5종 조회링크+주문 상세 '배송 조회' ③/print/[id] 인화 상세 신설(타임라인·항목·결제·배송) ④공동주문: RPC 2종(list_room_photobooks·clone_photobook_order)+/rooms/[id]/photobooks 허브 '나도 주문하기' ⑤InstallPrompt(외부=beforeinstallprompt, 인앱=openExternalBrowser+URL복사 폴백, 14일 dismiss). 4커밋(48bf1db·78bb65c·1223fbc·3756515). tsc0/lint0/build(32p). 라이브: /rooms/abc/photobooks·/print/abc next 307.
BUILD_STATUS     : ✅ 로컬 build(32p) + `vercel --prod` 배포 완료 (2026-07-11 #15, sharesnap-three.vercel.app READY, 최신 3756515). main 0/0.
BLOCKED_BY       : ⚠외부 작업만 남음(코드 완료) — ① **카카오 로그인 활성화**: 콘솔 8단계(audit §2.2) 후 Vercel env `NEXT_PUBLIC_KAKAO_LOGIN_ENABLED=true`+`NEXT_PUBLIC_KAKAO_JS_KEY`+재배포. ② **Supabase D0**: Magic Link 템플릿→`/auth/confirm` 교체 + 커스텀 SMTP. ③ **마이그013+014+015 운영 SQL 적용 완료(사용자 확인, 검증쿼리 12/12 ok)** — 단 ⚠**PostgREST 스키마 캐시 미갱신 상태**: 앱 REST가 profiles/reports/tracking/RPC를 404/400 응답(브라우저 실측). `NOTIFY pgrst, 'reload schema'`로 리로드 안 됨 → **SQL Editor에서 NOTIFY 재실행 또는 대시보드 Project Restart 필요**. 초록불(200) 전까지 프로필·신고·공동주문·배송추적 앱 미작동. 이후 고아 썸네일 정리(선택). ④ **결제 개시 3종 게이트**: (a)businessInfo.ts 사업자 실값+법무 검토 (b)env `PRICING_CONFIRMED=true` (c)토스 키+webhook. ⑤ 포토북 파이프라인 트랙A. ⑥ Realtime publication.
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
# 작업 디렉토리: /Users/yohan/Developer/claude/Sharesnap  ← 정본
#
# ★최우선 [결제 활성화 — 토스 키만 남음] 코드·DB·배포 완료(최신 40763a9, sharesnap-three 라이브).
#   ☐ (운영자) Vercel env(Production)에 토스 키 등록 후 재배포 → 결제 즉시 활성:
#        NEXT_PUBLIC_TOSS_CLIENT_KEY=<토스 클라이언트키>   (빌드 인라인 → 재배포 필수)
#        TOSS_SECRET_KEY=<토스 시크릿키>                   (서버 전용)
#        등록 후: vercel --prod (재배포)
#        토스 webhook URL도 개발자센터 등록: https://sharesnap-three.vercel.app/api/payments/webhook
#   → 검증: 포토북 confirmed/pdf_ready 주문 "주문하기" → 배송지 → 토스 테스트결제
#           → /api/payments/confirm → status=paid + payments.paid + /admin/orders 노출
#           → 신규 주문 상세(/photobooks/[id])에서 결제정보·배송 타임라인 표시 확인
#
# [Realtime publication — 운영 확인] Supabase 대시보드 → Database → Publications:
#   supabase_realtime에 messages·photos가 INSERT/UPDATE/DELETE 포함으로 등록돼 있는지 확인.
#   세션#10 채팅 실시간 삭제 반영은 messages UPDATE 이벤트 필요(타 참여자 화면).
#
# [정가 확정 — 운영자] PHOTOBOOK_PRICES(photobook/utils/pricing.ts) / PRINT_PRICES(print-order/utils/pricing.ts)
#   둘 다 placeholder. 실제 원가·마진 반영해 값만 교체(가격 구조는 확정).
#
# [트랙 A] 포토북 파이프라인 prod 마감 (여전히 잔여)
#   A1. (외부·운영자) Storige Admin → ShareSnap: uploadCallbackUrl=https://sharesnap-three.vercel.app/api/storige/webhook
#       + allowedOrigins/frameAncestors 에 sharesnap-three 추가
#   A2. prod 편집완료 → /api/storige/compose → webhook 수신 → pdf_ready + pdfs 버킷 PDF 확인
#   A3. ⭐[Storige 공지 2026-07-24] 편집기 조작 UX 업데이트 — 우리 연동 코드 변경 0(postMessage v1·canvasData 계약 불변).
#       C5 Alt+드래그 복제=PC 전용(모바일 무관, 이미 LIVE). C6 모바일 롱프레스 컨텍스트 메뉴=배포 예정.
#       ⚠ShareSnap 전용 요청(§3-2): C6 배포 통지 오면 **모바일 실기에서 핀치줌(D2)↔롱프레스 교차 확인** 1회
#       (사진 배치 중 롱프레스→메뉴, 핀치 전환 매끄러움/저사양 프레임드랍) + 골든 시나리오(세션→iframe→편집→저장→완료콜백) 1회.
#       이상 시 세션ID+기기/뷰포트 Storige 회신→플래그 off 롤백. 원문: ../Bookmoa Storige editor/storige/.cursor/plans/NOTICE_embed_partners_e2_c5c6_rollout_2026-07-24.md
#
# [상업화 후속 — 코드]
#   - 인화 주문 상세 페이지(/print/[id]) — 포토북 상세(/photobooks/[id]) 패턴 재사용
#   - 관리자 리소스 CRUD(editor_resources) — 현재 admin은 주문+랜딩만
#   - 배송비/무료배송 임계, 수량 할인 등 가격정책 고도화
#
# [외부 잔여] 카카오 앱키(NEXT_PUBLIC_KAKAO_JS_KEY + Supabase Auth Kakao Provider)
# [검증] npx tsc --noEmit && npm run lint && npm run build
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
| 2026-06-23 | #7 | 정본정리+전수감사 | 정본 경로를 /Users/yohan/Developer/claude/Sharesnap로 확정(중복 Documents 클론 삭제, 유실0). GitHub 연결·마지막 배포 Ready 실측. 코드베이스 전수 감사(Explore 3트랙): 편집후 파이프라인(compose→webhook→PDF)=코드완성·prod미검증, Phase5/6(주문·결제·인화·관리자)=~10%·대부분 stub/미구현. STATUS 헤더(502 시점에 정체)·NEXT_ACTION 정정 | ✅ | ~40m |
| 2026-06-23 | #7 | 트랙B-1 구현 | 편집기 이후 "주문 화면+가격" 슬라이스(외부의존0, ShareSnap 코드만): 가격정책(pricing.ts placeholder)+상태유틸, photobookService 조회/상태 확장, /photobooks·/orders stub→실장(PhotobookList+훅, 상태배지·예상가·편집이어서/PDF보기), PDF signed-URL 라우트. tsc0/lint0, Vercel 배포 Ready, 라이브 라우트 307/401 정상(commit a8c0019) | ✅ | ~50m |
| 2026-06-24 | #8 | 랜딩 다듬기 | 디자인 서브에이전트 워크플로우(씬타일·OG·신뢰밴드 3트랙 병렬) 산출물 통합: ①SceneTile(다층 그라데이션+SVG 6씬=노을바다/산/도시야경/불꽃/피크닉/노을도로)로 히어로·bento·포토북커버 "사진감" 대폭 강화 ②OG/트위터 이미지(next/og 1200×630, Pretendard OTF 런타임fetch로 한글 렌더, middleware 공개허용) ③정직한 신뢰밴드(가짜지표0, 실제보장4). 로그아웃 카카오CTA curl 검증. next build 성공, 배포 Ready, 라이브 씬타일+OG 캡처 검증(commit 68519fa) | ✅ | ~55m |
| 2026-06-24 | #8 | 랜딩 CMS+데스크톱+실사진 | ①데스크톱 개편: 히어로 lg 2열(카피 좌+큰 폴라로이드 우)·섹션 와이드(max-w-5xl/6xl)·4열 bento. ②랜딩 CMS: site_content(jsonb, 마이그011) + LandingContent 모델/기본값 + getLandingContent(기본값폴백) + LandingPage 콘텐츠 prop화. 어드민 /admin/landing(ADMIN_EMAILS 게이트)+편집폼(문구·이미지)+저장/업로드(service-role) 라우트. ③실사진: Unsplash 무료 라이선스(curl200 검증) per-photo URL 기본 적용, PhotoFrame(url 우선·SceneTile 폴백). 히어로 이미지 priority 로드. next build 성공, ADMIN_EMAILS env+배포, 라이브 데스크톱2열+실사진+어드민 편집폼 캡처 검증(commit 81b6061). ⚠ 마이그011은 운영 SQL Editor 적용 필요(어드민 저장 활성화용; 미적용 시 랜딩은 기본값으로 정상) | ✅ | ~75m |
| 2026-06-24 | #8 | 랜딩 CMS 마무리 | 어드민 게이트 UX 개선(로그인-비어드민은 404 대신 현재이메일+재로그인 안내+로그아웃, commit 355ade2). ADMIN_EMAILS=yohan73@gmail.com 확정. **운영자 마이그011 SQL 적용 완료 + yohan73 로그인 완료 → 랜딩 CMS 완전 활성화(/admin/landing 편집·저장 동작)**. 비어드민 안내 라이브 캡처 검증 | ✅ | ~25m |
| 2026-06-24 | #9 | 배포 + 피드백 수정 | 마이그012 운영적용(사용자) 후 `vercel --prod` 배포(sharesnap-three READY). 사용자 피드백 2건 처리: ①"채팅방 올린 사진 삭제 UI 없음" — 원인=채팅 사진 탭이 갤러리 이동만(삭제는 갤러리 뷰어에만 존재). PhotoMessage Link→onOpen + ChatRoom에 usePhotos+PhotoViewer 통합 → 채팅방에서 사진 탭 시 그 자리 뷰어(본인사진 우하단 휴지통 삭제)+삭제 성공 토스트(cac8de7 배포). ②"매직링크 부담"=카카오 1탭이 메인 설계, 카카오 앱키 미설정이 원인(운영 잔여)임을 안내. tsc0/lint0/build. | ✅ | ~30m |
| 2026-06-24 | #9 | 상업화(B)+랜딩본문(C) 병렬 | **트랙B(메인)**: 토스페이먼츠 결제 풀스택 — payments 테이블(마이그012)+포토북 배송컬럼 / paymentServer(금액 서버산출·confirm Basic인증)+tossWidget/daumPostcode 동적로드+CheckoutForm/ShippingAddressForm+/api/payments/{checkout,confirm,fail,webhook} / 포토북 체크아웃 /photobooks/[id]/checkout+PhotobookList 주문하기 / **인화주문 M7**(print-order 모듈 pricing/service/hooks+사진선택 Creator+/print/new·/print/[id]/checkout)+주문 탭(포토북/인화)+결제결과 토스트 / **관리자 M9** /admin·/admin/orders(service-role 통합조회·상태변경)+AdminDenied 게이트. **트랙C(백그라운드 서브에이전트)**: 랜딩 섹션 본문(불릿·카드·FAQ 9종) LandingContent 승격+어드민 편집 확장+OG 도메인(sharesnap-three) 갱신+사진1슬롯 교체. 금액은 전부 서버 권위 산출(클라 위변조 방지). tsc0/lint0/next build 성공(36 routes). commit f57cc06 push(main 0/0). ⚠운영 마이그012 SQL+토스키+vercel --prod 배포 잔여 | ✅ | ~90m |
| 2026-07-11 | #15 | 스프린트4 정체성+공동주문 | 감사 마지막 코드 항목 4종: ①profiles(마이그015 테이블+트리거+백필+RLS 같은방 멤버)+useProfiles → 채팅/뷰어/코멘트/방설정 닉네임·아바타 ②배송추적(tracking 컬럼+admin 송장입력+택배사 5종 조회링크) ③/print/[id] 인화 주문 상세 신설 ④공동주문(RPC list_room_photobooks·clone_photobook_order + /rooms/[id]/photobooks 허브 '나도 주문하기') ⑤InstallPrompt(PWA 설치·인앱 외부브라우저 유도+URL복사 폴백). tsc0/lint0/build(32p), 4커밋 push, vercel --prod READY, 라이브 검증. **감사 40건 코드 항목 전부 소진 — 잔여는 외부 설정만** | ✅ | ~100m |
| 2026-07-11 | #14 | 스프린트3 성장+운영안전 | 감사 후속 코드 6종: ①포토북 선택(is_selected_for_book) 편집기·자동배치 반영(거짓약속 수정)+토글 갱신행 검사 ②악용 방어 상한 3종(join RPC 인원100·방생성20·업로드2000)+share_code crypto ③방 설정 페이지(링크 재발급·강퇴·나가기·삭제, DELETE 라우트 storage 정리) ④콘텐츠 신고(reports 테이블+PhotoViewer 신고+/admin/reports 큐+방장 코멘트삭제) ⑤포토북 완성 카톡 자랑 배선 ⑥갤러리 사진 20장+ 넛지. 마이그014(reports·인원상한·방장삭제). tsc0/lint0/build(32p), 5커밋 push, vercel --prod READY, 라이브 검증(settings·reports next 307). 공동주문·profiles·PWA·배송추적은 스프린트4(카카오 가동 후) | ✅ | ~120m |
| 2026-07-11 | #13 | 스프린트2 법적게이트 | 상용화 결제 라이브 전 필수 코드 5종: ①이용약관(/terms 사진 라이선스·청약철회 제한)·개인정보처리방침(/privacy)+businessInfo(placeholder)+footer/로그인 링크 ②결제 게이트 PRICING_CONFIRMED 분리(토스 키≠판매개시, getTossClientKey ''폴백+서버 503 거부) ③CheckoutForm 청약철회 고지+필수 동의 체크박스 ④사진 라이선스 고지(업로드 시트+인화 멤버사진 N장) ⑤환불 cancelPayment(토스 취소 API)+admin 취소 버튼+refund-runbook.md. tsc0/lint0/build(30p), 4커밋 push, vercel --prod READY, 라이브 검증(/terms·/privacy 200+조항). 사업자 실값·법무검토·PRICING_CONFIRMED·토스키는 운영자 외부작업 | ✅ | ~110m |
| 2026-07-11 | #12 | 스프린트1 퍼널가드 | 감사 후속 코드 6종: ①로그인 수단 0개 방지(featureFlags 플래그+인앱 매직링크/RoomPreview 폴백) ②로그인 에러 배너+매직링크 60초 쿨다운 ③세션 next 보존(미들웨어+x-pathname 헤더+AuthGuard 마운트) ④카카오 공유 게이트+침묵실패 폴백+초대 카드 커버/통계 ⑤마이그013 삭제 파기 정책+deletePhoto Storage 실패 관측 ⑥@vercel/analytics 퍼널 5종. tsc0/lint0/build(28p), 4커밋 push, vercel --prod READY, 라이브 검증(next 307·매직링크 폴백). 마이그013·카카오 활성화·SMTP는 운영자 외부작업 | ✅ | ~90m |
| 2026-07-11 | #11 | 플로우 감사 | 비즈니스 로직·서비스 플로우 전면 검증(멀티에이전트: 사실 4트랙+5렌즈 비평+40건 전건 적대검증, API 오류/세션리밋 2회 재개로 완주) → docs/service-flow-audit.md. 결론: 설계방향 유효(스냅스 공동포토북 2026-02 런칭=시장 검증), 치명 결함=인앱 로그인 0개·매직링크 템플릿 미매핑·법적 페이지 부재·삭제 썸네일 잔존. 카카오 활성화 허들 소멸 확인(개인 개발자 당일 자가전환). 로드맵 D0/D1/스프린트1~3 확정. 코드 변경 0 | ✅ | ~80m |
| 2026-07-03 | #10 | 주문 UX 3종 | ①채팅 사진 실시간 삭제 반영 — messages UPDATE Realtime 구독(FK SET NULL)+markPhotoDeleted 낙관적 반영+PhotoMessage 리셋 패턴+remove 성공여부 반환 ②갤러리 헤더 인화 진입점(Printer→/print/new?room=, 사진 있을 때만) ③포토북 주문 상세 /photobooks/[id](요약·paid→delivered 타임라인·payments 결제정보·배송지·상태별 액션)+목록 카드 탭→상세. tsc0/lint0/build(37 routes), 3커밋(b32d298·63b56d9·40763a9) push, vercel --prod READY(빌드 로그 라우트 확인) | ✅ | ~25m |
| 2026-06-23 | #7 | 루트 랜딩페이지 | 디자인 워크플로우(3컨셉 병렬→심사·합성 블루프린트)로 인스타 타깃 CTA 최적화 랜딩 구축. 라우팅: (main)/page.tsx(→/rooms) 제거+app/page.tsx 공개 랜딩(서버 getUser CTA 분기). 섹션: 히어로(선셋+폴라로이드)·감정훅·3단계·가치벤토·소셜콜라주(bento)·포토북 3D목업·바이럴(카톡 초대 목업)·FAQ·파이널CTA·푸터+스크롤인지 스티키CTA. 디자인토큰만(bg-sunset·코랄칩·글래스·다크), 카카오옐로 격리, 사진은 chart 그라데이션(가짜지표 0). next build 성공, 배포 Ready, 라이브 라이트/다크 캡처 검증(commit 0008d57) | ✅ | ~70m |

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
TypeScript   : ✅ tsc --noEmit pass (세션 #15, database.ts profiles·tracking·RPC 타입 추가)
ESLint       : ✅ 0 에러 0 경고 (세션 #15)
Build        : ✅ 로컬 next build 성공 (2026-07-11 #15, 32 pages) + vercel --prod READY(3756515)
Unit Test    : N/A (Phase 7)
E2E Test     : ✅ 스프린트4 라이브 검증 — /rooms/[id]/photobooks·/print/[id] next 307, 랜딩·약관·로그인 회귀 없음. profiles·공동주문·배송추적 실동작은 마이그015 운영 적용 후. 결제 실 E2E는 PRICING_CONFIRMED+토스키 후
마지막 검증  : 2026-07-11 로컬 build 32p + prod 라이브 새 라우트·회귀 검증 (세션 #15)
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
