# MEMORY.md — ShareSnap 프로젝트 누적 기억

> **세션 간 유지되어야 하는 의사결정, 발견된 패턴, 해결된 이슈를 기록합니다.**
> Claude Code는 매 세션 시작 시 이 파일을 읽어 맥락을 복원합니다.

---

## 아키텍처 결정 기록 (ADR)

### ADR-001: 카카오톡 연동 전략
- **결정일**: 2026-04-13
- **결정**: 카카오톡 오픈채팅 API는 미제공이므로, 카카오 로그인 + 카카오톡 공유 API를 조합한 PWA 하이브리드 방식 채택
- **근거**: 오픈채팅 관련 API가 카카오에서 미제공 (데브톡에서 수년간 요청 중이나 미반영), 비공식 방법은 약관 위반 영구정지 위험
- **영향**: 채팅은 자체 Supabase Realtime으로 구현, 카카오톡은 초대/알림 채널로만 활용

### ADR-002: PWA 방식 채택
- **결정일**: 2026-04-13
- **결정**: 네이티브 앱 대신 PWA(Progressive Web App)로 서비스 제공
- **근거**: 앱스토어 심사 없이 즉시 배포, 카카오톡 공유 링크에서 바로 접근, 홈 화면 설치로 네이티브에 가까운 UX
- **영향**: manifest.json, Service Worker, Web Push API 구현 필요

### ADR-003: Fabric.js 6.x 사용
- **결정일**: 2026-04-13
- **결정**: 포토북 편집기에 Fabric.js 6.x 사용
- **근거**: HTML Canvas 기반, JSON 직렬화 지원 (서버 렌더링 가능), 모바일 터치 지원
- **필수 조건**: 반드시 dynamic import + ssr: false 적용 (SSR 환경에서 Canvas API 미지원)

### ADR-004: Supabase 올인원 백엔드
- **결정일**: 2026-04-13
- **결정**: DB, Auth, Storage, Realtime 모두 Supabase로 통합
- **근거**: PostgreSQL + Auth + S3 Storage + Realtime을 단일 서비스로, RLS로 보안 처리
- **영향**: Supabase 타입 자동 생성(`supabase gen types typescript`) 활용

### ADR-005: 책 사이즈 스펙
- **결정일**: 2026-04-13
- **결정**: A4(210×297mm), A5(148×210mm), 210×210mm 3종, 모두 300dpi
- **300dpi 픽셀**: A4=2480×3508, A5=1748×2480, 210×210=2480×2480
- **블리드**: 3mm, 안전영역: 5mm
- **PDF**: PDF/X-4 호환, 폰트 임베드, JPEG Q95

### ADR-006: Next.js 16 / React 19 / Tailwind v4 채택 (계획 수정)
- **결정일**: 2026-05-16
- **결정**: 계획서의 Next 14 대신 `create-next-app@latest`로 설치된 Next 16.2.6, React 19.2, Tailwind v4 사용
- **근거**: `npx create-next-app@latest`가 16을 설치 — 굳이 14로 다운그레이드할 이유 없음. App Router + Server Actions 패턴은 동일
- **영향**:
  - `src/middleware.ts`가 Next 16에서 deprecated 경고 발생 → 향후 `src/proxy.ts`로 마이그레이션 필요 (현재 정상 동작, 빌드 통과)
  - Tailwind v4 — `tailwind.config.ts` 대신 CSS 기반 설정 (`@theme` in globals.css). shadcn이 자동 처리
  - `cookies()` 등 Next 15+ 비동기 API 사용 (`await cookies()`)

### ADR-007: shadcn toast → sonner 채택
- **결정일**: 2026-05-16
- **결정**: 계획서의 `toast` 컴포넌트는 deprecated, sonner 기반으로 변경
- **근거**: shadcn 최신 버전이 sonner 권장
- **영향**: `useToast` 훅은 sonner의 `toast()`를 래핑한 얇은 어댑터, RootLayout에 `<Toaster />` 마운트

### ADR-008: 카카오 참여 퍼널 — 비로그인 미리보기 + RPC 기반 참여
- **결정일**: 2026-05-16 (상세: docs/ux-flows.md)
- **결정**: /join/[shareCode]는 로그인 강제 대신 SSR 미리보기(방 이름/커버/멤버·사진 수) → 카카오 CTA → 자동 입장(next=/join/{code}?auto=1). 조회·참여는 security definer RPC 2종(get_room_preview, join_room_via_share_code)으로 처리
- **근거**: 기존 RLS rooms_select가 멤버만 허용 → 비멤버는 share_code 조회 자체가 불가 (P0 결함). 미리보기 없는 즉시 로그인 redirect는 퍼널 이탈 주범
- **영향**: 008_join_funnel.sql 마이그레이션, roomService의 getRoomByShareCode/joinRoomByShareCode를 RPC 래퍼로 교체, authService에 next 파라미터 보존(+콜백 오픈 리다이렉트 검증), 카카오 인앱 브라우저에서는 Magic Link 숨김(PKCE 컨텍스트 분리 이슈)

### ADR-009: 모바일 배포 — PWA 우선, Android TWA 즉시, iOS Capacitor 후행
- **결정일**: 2026-05-16 (상세: docs/mobile-deployment.md)
- **결정**: ① 웹=PWA 품질 완성(Phase 3~6) ② Play Store=Bubblewrap TWA(네이티브 코드 0줄, 웹 배포=앱 업데이트) ③ App Store=서비스 검증 후 Capacitor remote URL 하이브리드
- **근거**: 핵심 유입(카톡 링크)이 앱 없이 동작. Next.js SSR이라 Capacitor 정적 export 불가 → remote URL 방식. Apple 4.2 방어는 Share Extension 등 네이티브 기능으로
- **영향**: Service Worker는 수동 public/sw.js + 등록 컴포넌트(next-pwa/Serwist 배제 — Next 16/Turbopack 호환 리스크), iOS 트랙 착수 시 Sign in with Apple 의무(4.8), Supabase 도메인은 SW 캐시 제외

### ADR-011 (채택·ShareSnap측 구현완료 2026-06-13): Phase 4 편집기를 Storige 연동으로 대체
- **검토일**: 2026-06-12 (상세: docs/storige-integration-assessment.md) / **구현일**: 2026-06-13 (CTO 핸드오프 §3 기반)
- **결정**: 자사 Storige(editor.papascompany.co.kr)를 iframe `/embed` + postMessage v1로 임베드. CTO가 핸드오프 문서로 "Storige 코드 변경 0, 사이트 등록만으로 가동" 확인. 자체 Fabric 편집기 폐기(fabric 미설치).
- **ShareSnap측 구현(완료)**: 마이그레이션 009(photobook_orders에 order_no/storige_session_id/cover·content_file_id/synthesis_job_id, user_storige_map, photos.print_path) / 서버 어댑터 `/api/storige/{session,compose,webhook}` (API Key 서버 전용, 503 STORIGE_NOT_CONFIGURED 분기) / StorigeEditorHost+useStorigeEmbed(origin 검증, 닫기/로딩/에러 UI) / 인쇄 리사이즈본 print_path(thumbnails 공개버킷, 3600px) + externalPhotos 어댑터 / `/auth/confirm` token_hash 경로
- **검증(로컬 E2E)**: /embed iframe이 `?orderSeqno&title&parentOrigin`로 실제 editor.papascompany.co.kr에 정상 연결(CSP 통과), draft 주문 자동생성, 키 미설정 시 "편집기 연동 준비 중" 분기 정상
- **대기**: Storige 운영 S1~S5(사이트 등록→editorAuthCode 발급). 키 받으면 실제 편집기 콘텐츠 로드 + compose/webhook E2E
- **Storige 측 신규개발(D1 사진주입·D2 핀치줌·D3 자동배치)**: 별도 결정/진행 — 핸드오프 §6.1
- **주의**: Storige는 Fabric 5.5.2 + 커스텀속성 — fabric_data 직저장 금지, storige_session_id 참조 모델. dpiConverter 300dpi 좌표계와 혼용 금지

### ADR-011-v2 (2026-06-13): Storige 연동 — 세션 사전생성 + externalPhotos 주입으로 개편
- **계기**: 새 핸드오프 — Storige측 사이트등록·키발급·편집기 신규기능(공유방 사진 탭·핀치줌) 완료. 사진 주입이 연동의 핵심이 됨
- **변경**: 이전(토큰만 발급→/embed?orderSeqno) → **백엔드가 편집세션을 미리 생성하면서 metadata.externalPhotos로 공유방 사진 주입 → /embed?sessionId**
  - `POST /api/storige/session {orderId}` → shop-session 발급 → order→room 사진을 **public URL(print_path 3600px, thumbnails 공개버킷)** externalPhotos로 변환 → `/edit-sessions` 생성(주입) 또는 기존 PATCH 재주입 → storige_session_id 저장 → `{sessionId,accessToken,refreshToken,expiresIn}` 반환
  - `POST /api/storige/session/reedit {orderId}` 신설 — 기존 세션에 사진 재주입(idempotent)
  - editor.complete → saveEditorResult + `/api/storige/compose` 트리거
  - storigeServer.ts: createEditSession/patchEditSessionPhotos/getTemplateSetId/getWebhookUrl 추가
  - 서버 전용 빌더 photobookServer.ts(buildExternalPhotosForRoom) — 'use client' 없음
- **상수**: STORIGE_DEV_TEMPLATE_SET_ID=a2cc2939-b76d-41a2-bd41-2d9fba091a24 (dev), 운영은 env STORIGE_TEMPLATE_SET_ID
- **보안**: STORIGE_API_KEY는 storigeServer.ts(서버)만 참조 — 클라이언트 유출 0 확인. externalPhotos는 만료없는 public URL(signed 금지). memberSeqno는 user_storige_map 정수 시퀀스(해시 금지)
- **§5 실키 스모크 검증 완료 (2026-06-13)**: 실제 STORIGE_API_KEY로 전구간 통과 —
  ① POST /api/storige/session 200 → sessionId(3af3ef26..) + member_no=1 발급
  ② /embed?sessionId 로드 → 실제 Storige 편집기(스프레드 표지) + 이미지패널 "공유방 사진" 탭에 주입 4장 + "안 쓴 사진" 필터
  ③ 사진 탭 → 캔버스 객체 배치
  ④ 편집완료 → editor.complete → cover_file_id/content_file_id 저장(분리 2파일)
  ⑤ POST /api/storige/compose 200 → synthesis_job_id 저장, status generating_pdf
  ⑥ GET /files/{id}/download/external + X-API-Key → cover.pdf(1.2MB/300dpi)·content.pdf 다운로드 성공
  ⑦ webhook synthesis.completed(서명 Base64 모사) → 서명검증 → downloadStorigeFileByUrl 회수 → pdfs 버킷 cover/content.pdf 저장 → pdf_ready + pdf_path
- **dev 한계**: 실제 Storige webhook은 callbackUrl=localhost라 못 받음(SSRF) → 수신 로직은 페이로드 모사로 검증. 프로덕션은 공개 도메인 webhook URL 필요(§6 회신 3)
- **대기**: 운영 §6 회신 4건(도메인/하드커버 상품구성/웹훅URL/회원체계) + 실제 포토북 templateSet(현재 DEV=A4 기본 책자)

### ADR-011-v3 (2026-06-15): 하드커버 포토북 템플릿셋 등록 — Storige Admin 작업 (조사 완료, 가이드 작성)
- **결론**: 실제 포토북 templateSet 등록은 **Storige Admin 작업**(ShareSnap 코드 아님). 같은 회사라 오너 직접 등록. ShareSnap은 `STORIGE_TEMPLATE_SET_ID` env만 설정(getTemplateSetId storigeServer.ts:222) — 코드 무변경. 상세: docs/storige-templateset-registration.md
- **모델**: 하드커버 포토북 전용 상품 없음 → 기존 '책(book/spread) 템플릿셋' 재사용. 등록 2단계: ① 개별 템플릿(표지 type=spread 1개 + 내지 type=page N개) 제작 → ② 템플릿셋(type=book, editorMode=book)에 templates 순서배열로 묶기. 책모드 검증: spread 정확히 1개 + wing/cover/spine 불허 + page 최소 1개
- **책등**: 등록값 아님 — 주문 시 (페이지/2)×용지두께 + 제본여유분 동적계산. hardcover margin=2.0mm
- **⚠ 핵심 제약 (오너 결정 필요)**:
  1. **사진 자동배치/이미지 프레임 없음** — Storige엔 placeholder/autoFill 미구현. externalPhotos는 사용자가 편집기에서 수동 1탭/드래그 배치만. 포토북 "자동편집"을 원하면 별도 구현(D3, Storige 신규 or ShareSnap canvasData 생성)
  2. **CMYK 미연결** — colorMode=cmyk는 의도 저장만, 워커 실변환은 스테이징. 인쇄 정합은 인쇄소 RIP 변환 or 워커 파이프라인 발주
- **오너 결정**: 판형(정사각 210/A4) · 페이지 범위(pageCountRange) · 책등/날개 · 면지/표지편집 · 자동배치 방식
- **미해결**: ShareSnap 상수 a2cc2939…(운영 API에 실재 확인됨, 세션생성 성공)와 Storige 시드 ID sample-8x8-book-24p 불일치 — dev 샘플 환경별 차이로 추정

### ADR-011-v4 (2026-06-15): 210×210 4P 템플릿 시드 + 사진 자동배치 구현·검증 완료
- **결정 반영**: 판형 210×210 기본(추가는 Admin) · 페이지 4P 단위 · 자동배치 후 수동편집
- **템플릿 등록**: 등록 API는 X-API-Key 401(Admin JWT 전용) → SQL 시드만 가능. `docs/storige-seed-210x210-photobook.sql`(표지 spread 'photobook-spread-cover-210' + 내지 page 'photobook-page-210' + 셋 'photobook-210-book-4p', idempotent ON DUPLICATE KEY). 적용은 Storige 운영자 — 적용 후 ShareSnap `STORIGE_TEMPLATE_SET_ID=photobook-210-book-4p` 설정. 가이드 부록 B 참조
- **자동배치 = ShareSnap canvasData 주입** (Storige 편집기 수정 0): create-edit-session.dto의 canvasData?:any에 페이지 배열 주입. `src/modules/photobook/services/autoLayout.ts` — buildAutoLayoutCanvasData(photos, {pageWidthMm,pageHeightMm,pageStep=4}) → [null(표지 템플릿유지), 내지별 [workspace rect, image]...]. 내지 수=사진수 4배수 올림
- **좌표계 ground truth (실측 세션 덤프)**: 단위 px, 워크스페이스 중심원점, originX/Y=center, Fabric 5.5.2. 워크스페이스 px=(판형mm+블리드3×2)×150/25.4. 이미지 원본px+cover-fit scale=max(Wpx/iw,Hpx/ih), left=0/top=0, crossOrigin:'anonymous', externalPhotoUrl, selectable:true(수동편집 가능)
- **실키 검증**: order_no=2 세션(40a15335) canvas_data 덤프 = [null,4×[workspace,image]] 좌표/스케일(1.491) 정확. https 공개이미지 테스트 세션은 편집기에 cover-fit 정상 렌더 ✅ → 자동배치 로직 100% 정확 증명
- **⚠ dev 한계 = Mixed Content**: 자동배치 이미지 src가 http://127.0.0.1(로컬 Supabase) → HTTPS 편집기(editor.papascompany.co.kr) iframe이 차단해 dev 앱에선 사진 미렌더. **프로덕션 https Supabase URL에선 자동 해결**(§7 Supabase Storage CORS는 ACAO * 확인됨). 로컬 풀검증하려면 Supabase를 https 터널로 노출 필요
- **확인**: Storige Admin에 'ShareSnap' 사이트 이미 등록됨(JWT siteName=ShareSnap, siteId 9a5d4e0c…). 키도 ShareSnap 전용

| [버그] 미들웨어가 /api/* 비로그인 요청을 /login(307)으로 redirect → 웹훅 차단 + fetch가 HTML 받음 | updateSession isPublicRoute에 `pathname.startsWith("/api")` 추가 — API는 자체 401 JSON/서명검증. session→503, webhook→401(서명) 정상 확인 | 2026-06-13 |

### ADR-012 (2026-06-22): 프로덕션 배포 + 실키 E2E 검증 완료
- **운영 인프라**: Supabase `rtnfltwmnizkjrrgjudk`(통합 마이그레이션 001~010+Realtime 적용, 11테이블+RPC+4버킷 검증) + Vercel `sharesnap-three.vercel.app`(GitHub papascompany/sharesnap PRIVATE 연결, env 12+ Production 설정). 이 두 프로젝트는 MCP 토큰 계정과 달라 대시보드/REST/CLI로 작업(`docs/production-setup.md`)
- **실키 E2E**: 매직링크 로그인 → 방생성 → 사진4장 업로드(print_path) → 포토북 세션생성 **200**(sessionId) → DB canvasData=[null(표지),4×내지] 전부 **https Supabase 이미지 cover-fit**(scaleX 1.063). 프로덕션 https라 dev의 Mixed Content(ADR-011-v4) 없음.
  - ⚠ **정정**: 이 시점 검증은 세션생성+canvasData까지만 봤고 편집기 화면을 못 봤다(스크린샷 CDP 프리즈). templateSetId가 미존재 슬러그(photobook-210-book-4p)라 실제 편집기는 404였음 → I-404 참조. **올바른 운영 셋 = `2f312032…`(sharesnap basic 210 H/C)**. 교체+재배포 후 편집기 editor.ready 로드(404 없음) 확인 완료
- **배포 게이트**: GitHub auto-deploy 대신 `vercel --prod` CLI 사용. 로컬 머신 과부하(load~100, 타 세션 빌드 경합) 시 로컬 `npm run build`가 굶주려 미완 → **Vercel 원격 빌드가 실 빌드 게이트**(Build Completed 24s ✅). env 변경 후 반드시 재배포해야 반영(NEXT_PUBLIC은 빌드 인라인)
- **잔여(외부작업)**: 카카오 앱키(JS키+Provider), Storige Admin webhook(uploadCallbackUrl)·allowedOrigins에 sharesnap-three 등록

### ADR-013 (2026-06-24): 상업화 레이어 — 토스페이먼츠 결제 + 체크아웃 + 인화주문(M7) + 관리자(M9)
- **결정**: 결제 PG = 토스페이먼츠 v2 표준 결제위젯(사용자 선택). 포토북·인화 주문 공용 결제 파이프라인.
- **결제 아키텍처(보안 핵심)**: 청구 금액은 **항상 서버가 pricing으로 재산출**(클라 위변조 방지). 흐름:
  ① 클라 체크아웃 → `POST /api/payments/checkout`(배송지) → 서버 `prepareCheckout`: 본인주문 검증 → 금액 산출 → 배송지/상태 저장 + ready payment(service_role) 발급 → CheckoutSession 반환
  ② 토스 위젯 `requestPayment`(redirect) → successUrl=`/api/payments/confirm`
  ③ confirm: ready payment 금액 일치 검증 → 토스 `POST /v1/payments/confirm`(시크릿키+콜론 base64 Basic) → payments=paid + 주문=paid(service_role) → `/orders?paid` 리다이렉트
  ④ webhook(`/api/payments/webhook`): 사후 동기화(취소/실패) best-effort(토스 v2는 본문 서명 없음 — IP allowlist 권장)
- **payments 테이블(마이그012)**: order_kind(photobook|print)+order_id, merchant_order_id(토스 orderId, unique), amount, status(ready|paid|canceled|failed), payment_key/method/receipt_url/approved_at/raw. RLS=본인 select만(쓰기는 service_role 전용). photobook_orders에 배송컬럼(recipient_name/phone/shipping_address/memo/paid_at) 추가(print_orders는 004부터 보유).
- **SDK 로드**: 토스 v2 = CDN 동적 로드(`js.tosspayments.com/v2/standard` → window.TossPayments), Daum 우편번호 = `t1.daumcdn.net/.../postcode.v2.js`. 둘 다 npm 미설치(번들 영향0·카카오 SDK 동일 동적로드 패턴). 키 미설정 시 결제 graceful 비활성(배송폼은 입력 가능).
- **인화주문 M7**: print-order 모듈(PRINT_SIZES/PRINT_PAPERS placeholder + printOrderService + usePrintOrders + PrintOrderCreator). draft는 배송지 빈값으로 생성(print_orders NOT NULL 회피), 체크아웃서 채움. 사진 소스=공유방 listPhotos.
- **관리자 M9**: getAdmin()(ADMIN_EMAILS) 게이트 + service_role 통합조회(adminOrders.listAllOrders) → /admin·/admin/orders(상태변경 /api/admin/orders PATCH). RLS 우회라 모든 주문 노출. AdminDenied 공통 컴포넌트로 게이트 UX 통일.
- **적용 잔여(운영자)**: ① 마이그012 SQL(운영 프로젝트 rtnfltwmnizkjrrgjudk는 MCP 토큰 계정 밖 → Supabase SQL Editor 수동) ② 토스 키 env(NEXT_PUBLIC_TOSS_CLIENT_KEY·TOSS_SECRET_KEY) ③ vercel --prod 배포 ④ 정가표(PHOTOBOOK_PRICES/PRINT_PRICES placeholder) 확정.
- **교훈**: photoService/photobookService가 'use client'라 서버 컴포넌트(체크아웃 페이지)에서 toPhoto 사용 불가 → 서버/클라 공용 `thumbnailPublicUrl`(결정적 public URL 조립) 헬퍼 분리. next/image 원격패턴 미설정 컨벤션이라 썸네일은 `<img>`(no-img-element disable 주석).

### ADR-014 (2026-07-11): 감사 후속 스프린트1 — 퍼널 가드 + 카카오 활성화 플래그
- **배경**: 서비스 플로우 전면 감사(docs/service-flow-audit.md, 세션#11)의 P0 4계열·스프린트1 항목을 코드로 구현(세션#12).
- **핵심 결정 — 기능 플래그 2종(src/modules/shared/lib/featureFlags.ts, 빌드 인라인 NEXT_PUBLIC)**:
  - `KAKAO_LOGIN_ENABLED` = `NEXT_PUBLIC_KAKAO_LOGIN_ENABLED === "true"`. **로그인은 Supabase OAuth라 공유용 JS키와 독립** — 클라가 Provider 설정을 런타임에 알 수 없어 명시적 플래그로 관리. 카카오 콘솔+Supabase Provider 설정 후 이 env를 true로 켜야 카카오 로그인 버튼 노출. 미설정(false)이면 LoginPage가 인앱에서도 매직링크 폼 노출 + RoomPreview 비로그인 CTA가 `/login?next=` 링크로 폴백 → **"어떤 (인앱×Provider) 조합에서도 실동작 로그인 수단 ≥1개" 불변식**(감사 P0-A: 인앱+Provider미설정=수단 0개 해소).
  - `KAKAO_SHARE_ENABLED` = `Boolean(NEXT_PUBLIC_KAKAO_JS_KEY)`. 미설정 시 InviteLink에서 카카오 공유 버튼 숨김+링크복사 primary 승격(개발자용 env 에러 원문 토스트 방지).
- **세션 next 보존**: 미들웨어(middleware.ts)가 로그인 리다이렉트에 `next=pathname+search` 부착 + `x-pathname` 요청헤더 주입 → (main)레이아웃 이중가드도 headers()로 next 복귀. AuthGuard는 usePathname 기반으로 재작성 후 (main) 셸에 마운트(SPA 체류 중 만료 감지, 초기엔 낙관적 children). 수신측(/auth/callback·confirm)의 '/' 시작·'//' 거부 검증 재사용.
- **삭제 파기(마이그013)**: thumbnails 버킷 DELETE RLS(본인폴더 foldername[1]=uid) + print_orders draft delete 정책. **교훈: Supabase Storage `.remove()`는 RLS 위반에도 reject 않고 `{error}`로 resolve** → allSettled rejected만 보면 침묵. removeFromBucket 헬퍼가 error를 throw해 관측(warn→error 승격). ⚠운영 SQL Editor 수동 적용 필요 + 고아 썸네일 1회 정리(013 주석의 SELECT 확인 후 DELETE).
- **퍼널 계측**: @vercel/analytics + analytics.ts 래퍼(FunnelEvent 유니온 5종). track 지점 — join_viewed(RoomPreview mount), login_started(KakaoLoginButton/매직링크/RoomPreview redirect), join_completed(WelcomeToast auto + RoomPreview button), invite_shared(InviteLink copy/native + KakaoShareButton invite), first_photo_uploaded(PhotoUploader onAllDone). 카카오 활성화 전 기준선 확보 목적.
- **미완(운영자 외부작업, BLOCKED_BY)**: 카카오 콘솔 활성화+env, Magic Link 이메일 템플릿→/auth/confirm 교체, 커스텀 SMTP, 마이그013 적용. 스프린트2(법적 게이트)·3(성장 레버)은 코드 대기.

### ADR-015 (2026-07-11): 감사 후속 스프린트2 — 상용화 법적 게이트
- **배경**: 감사(docs/service-flow-audit.md) P0-C·P1의 "결제 라이브 전 필수" 항목을 코드로 구현(세션#13).
- **법적 페이지**: businessInfo.ts(사업자 정보 단일 소스, **placeholder — 운영자 실값 입력 필수, 미기재 시 화면 미표시로 허위기재 방지**) + /terms(이용약관, **제6조 사진 라이선스=방 멤버 제작 이용 허락**·제9조 주문제작 청약철회 제한) + /privacy(개인정보처리방침, 실 수집항목·위탁 Supabase/Vercel/토스/Storige·보유기간). LegalShell 공통 셸. 미들웨어 public route에 /terms·/privacy 추가. ⚠**법무 검토·사업자 실값은 운영자 오픈 전 작업**(코드는 표준 초안).
- **결제 게이트(핵심)**: `isPricingConfirmed()` = `process.env.PRICING_CONFIRMED === "true"`(서버 env). **토스 키와 가격 확정을 별개 스위치로 분리** — getTossClientKey()가 미확정 시 ''반환→CheckoutForm "결제 준비 중" graceful + prepareCheckout이 서버에서 503 거부(클라 우회 방지). **결제 개시 = 사업자 실값+법무검토 AND PRICING_CONFIRMED=true AND 토스 키, 셋 다 충족 필요**.
- **청약철회 고지**: CheckoutForm에 주문제작 청약철회 제한(전자상거래법 §17②) 사전 고지 + 필수 동의 체크박스(agreedWithdrawal, 미동의 시 canPay=false). 토스 위젯 renderAgreement(전자금융 동의)와 별개.
- **사진 라이선스 고지**: 업로드 시트 1줄('멤버가 제작에 사용 가능') + 인화 주문(PrintOrderCreator)에서 선택분 중 `p.user_id !== user.id` 개수를 세어 "다른 멤버 사진 N장 포함" 표시(초상권/저작권 인지). 건별 동의 대신 업로드 시점 사전 라이선스(약관 §6) 방식.
- **환불 경로**: `cancelPayment`(paymentServer, 토스 `/v1/payments/{key}/cancel` API) — **제작 착수 전 주문 status='paid'만 허용**, 성공 시 payments=canceled+주문 confirmed 롤백(웹훅 취소 동기화와 동일 최종상태). /api/admin/orders PATCH에 `action:"cancel"` 분기 + AdminOrdersClient 취소 버튼(paid만 노출, router.refresh). docs/refund-runbook.md(앱내 취소·토스 대시보드 웹훅 자동동기화·청약철회 제한 절차).
- **교훈**: 웹훅(api/payments/webhook)이 이미 CANCELED→payments=canceled+주문 confirmed 롤백을 처리하므로, 토스 대시보드 수동 취소만으로도 DB 정합성 유지(감사 권고 "0줄 대책=runbook"). admin 취소 버튼은 즉시 반영 편의 기능. 주문 status에 명시적 'canceled' 값은 미추가(confirmed 롤백+payments.status로 판별) — 후속 과제.
- **미완(운영자 외부작업)**: [[sharesnap-autopilot-style]] 참조. 사업자 실값·법무검토, PRICING_CONFIRMED, 토스 키+webhook, 카카오 활성화(ADR-014), 마이그013 적용.

### ADR-016 (2026-07-11): 감사 후속 스프린트3 — 성장 레버 + 운영 안전
- **배경**: 감사(docs/service-flow-audit.md) 성장 레버(§6 스프린트3) + 이월 운영 안전 P1(방설정·상한·신고)을 코드로 구현(세션#14). 공동주문·profiles+작성자·PWA유도·배송추적은 "카카오 가동 후"가 적기라 스프린트4로 유예.
- **포토북 선택 반영(거짓 약속 수정)**: `buildExternalPhotosForRoom`(photobookServer.ts)에 `is_selected_for_book` 필터(0장이면 전체 폴백). **핵심: canvasData가 buildAutoLayoutCanvasData(externalPhotos)로 파생**되므로 이 한 곳만 필터하면 편집기 이미지 패널·자동배치 모두 선택분만 반영. `toggleBookSelection`(photoService)에 `.select("id")` 갱신 행 수 검사 → RLS 0행(타인 사진을 일반 멤버가 선택)이면 `SELECT_NOT_ALLOWED` throw → usePhotos에서 롤백+"올린 사람/방장만" 토스트.
- **악용 방어 상한 3종**: ①방 인원 100 = **join RPC 내부(마이그014 재정의, security definer라 클라 우회 불가)**, ROOM_FULL 에러 매핑 ②방 생성 20 = createRoom count 검사 ③업로드 총량 2000 = PhotoUploader.openPicker에서 getRoomPhotoCount 검사(가용성 우선 — 실패 시 업로드 진행). 상수 constants.ts(ROOM_MAX_MEMBERS/PHOTOS, MAX_ROOMS_PER_USER). `generateShareCode`(utils) Math.random→crypto.getRandomValues(chars 32=2^32 약수라 modulo bias 없음).
- **방 설정 페이지**: `/rooms/[id]/settings`(RoomSettings 클라) — 초대 링크 재발급(reissueShareCode, 기존 무효화)·멤버 강퇴(kickMember, RLS 006 방장 delete 기존)·나가기(leaveRoom)·삭제. **방 삭제는 service_role 라우트(`DELETE /api/rooms/[id]`)로 교체** — 클라 직접 삭제는 타인 사진 storage 폴더 접근 불가로 고아 발생 → 방장 검증 후 admin이 원본+썸네일 정리 + DB cascade. RoomHeader에 Settings 진입점. ⚠멤버 표시는 profiles 부재라 user_id 앞 6자+역할+가입일만(카카오 가동+profiles 후 개선).
- **콘텐츠 신고 최소 이행선**: reports 테이블(마이그014, RLS 본인 insert/select, 관리자 service_role) + PhotoViewer 신고 버튼(타인 사진, 사유 4종 시트, reportService.submitReport) + `/admin/reports` 큐(adminReports service_role: listReports/deleteReportedPhoto=storage+DB 삭제/dismissReport) + photo_comments 방장 삭제 정책. **database.ts 수동 타입에 reports Row/Insert/Update 추가 필수**(안 하면 tsc 실패 — 신규 테이블 공통 함정).
- **성장 레버**: 포토북 상세(/photobooks/[id]) pdf_ready 시 buildFeedTemplate('photobook') 공유 버튼 배선(KAKAO_SHARE_ENABLED 게이트, room.share_code 조회 추가) / 갤러리 사진 PHOTOBOOK_NUDGE_THRESHOLD(20)장+ 넛지 배너.
- **마이그014(운영 SQL 수동 적용 필요)**: join RPC 인원상한 재정의 + reports 테이블+RLS + photo_comments 방장 삭제. 마이그013과 함께 미적용 상태 → 적용 전까지 신고 insert/방 인원 상한/방장 코멘트 삭제는 미작동(코드는 graceful).
- **미완(스프린트4, 카카오 가동 후)**: 공동주문("이 방의 포토북" — 스냅스 대응), profiles+작성자 표시, welcome 직후 PWA/외부 브라우저 유도, 배송 추적(tracking 컬럼)+/print/[id] 상세.

### ADR-010: 디자인 시스템 — "추억을 모아 빛나게"
- **결정일**: 2026-05-16 (상세: docs/design-system.md — 시각 결정의 단일 소스)
- **결정**: Primary 선셋 코랄 oklch(0.655 0.19 32) + 앰버 그라데이션, 웜 뉴트럴, 다크모드=시네마 모드(웜 니어블랙, 사진 뷰어는 순수 블랙), Pretendard Variable(dynamic-subset CDN), radius 0.75rem, 모바일 CTA h-12
- **근거**: 사진이 주인공인 서비스 — UI는 차분한 웜 톤 배경, 카카오 옐로는 카카오 버튼 전용 토큰(--kakao)으로 격리
- **영향**: globals.css 전체 교체(@theme + OKLCH 토큰 + 모션 keyframes + safe-area 유틸), themeColor/manifest theme_color를 #FEE500→코랄/웜화이트로 교정, userScalable:false 제거(WCAG 1.4.4), 이모지 아이콘→lucide-react, LoadingSpinner→스켈레톤 shimmer 전환

---

## 기술 패턴 (검증됨)

### 패턴 1: Supabase Auth + 카카오 로그인
```typescript
// Supabase가 카카오 OAuth Provider를 공식 지원
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'kakao',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`,
  }
});
```

### 패턴 2: Next.js 14 + Supabase SSR 클라이언트
```typescript
// 서버 컴포넌트용 (src/modules/shared/lib/supabase/server.ts)
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// 클라이언트 컴포넌트용 (src/modules/shared/lib/supabase/client.ts)
import { createBrowserClient } from '@supabase/ssr';
```

### 패턴 3: Fabric.js Dynamic Import
```typescript
// 반드시 이 패턴을 사용 — SSR 환경에서 Canvas API 미지원
import dynamic from 'next/dynamic';
const Editor = dynamic(() => import('./Editor'), { ssr: false });
```

### 패턴 4: 카카오톡 공유 초대
```javascript
Kakao.Share.sendDefault({
  objectType: 'feed',
  content: {
    title: '공유방 이름',
    imageUrl: 'og-image-url',
    link: { mobileWebUrl: `https://sharesnap.app/join/${shareCode}` },
  },
  buttons: [{ title: '사진 올리기', link: { mobileWebUrl: joinUrl } }],
});
```

---

## 해결된 이슈 아카이브

| 이슈 | 해결 | 날짜 |
|------|------|------|
| `src/app/page.tsx`(create-next-app 기본)와 `src/app/(main)/page.tsx`가 모두 "/" 경로로 충돌 | 기본 page.tsx 삭제, (main) 그룹이 "/" 소유. 미들웨어가 "/"를 public으로 통과시키고 (main) layout이 서버측 redirect | 2026-05-16 |
| `.next/types/validator.ts`에 stale 페이지 참조로 tsc 실패 | `.next` 폴더 삭제 후 tsc 재실행 | 2026-05-16 |
| `room_members → rooms(*)` embedded select가 Relationship 미정의 타입 에러 발생 | 수동 작성 Database 타입에는 Relationships가 빈 배열로 정의돼 있어 PostgREST 임베디드 select 불가 → 두 단계 쿼리(`room_id` 목록 → `rooms.in()`)로 분리. Phase 7에서 `supabase gen types typescript`로 자동 생성 시 한꺼번에 해결 가능 | 2026-05-16 |
| Supabase 클라이언트 `.update(payload)`에 `Partial<Row>` 전달 시 RejectExcessProperties 타입 오류 | Row가 아닌 명시적 `Update` 타입(예: `RoomUpdate`)을 사용 — Insert/Update/Row를 도메인 타입 옆에 항상 함께 재수출 | 2026-05-16 |
| [P0] RLS rooms_select가 멤버만 허용 → 초대 링크가 신규 사용자에게 "잘못된 초대 링크" 표시 (퍼널 단절) | 008_join_funnel.sql — security definer RPC 2종(get_room_preview/join_room_via_share_code)으로 우회, roomService RPC 래퍼 교체 | 2026-05-16 |
| [P0] 카카오 로그인 후 초대 맥락(next) 유실 | redirectTo에 ?next= 부착 + 콜백에서 `startsWith("/") && !startsWith("//")` 오픈 리다이렉트 검증 | 2026-05-16 |
| Next 16 middleware deprecation 경고 | src/middleware.ts → src/proxy.ts (default export proxy)로 마이그레이션 | 2026-05-16 |
| 상위 디렉토리 lockfile로 워크스페이스 루트 오인 경고 | next.config.ts에 `turbopack.root: __dirname` 고정 | 2026-05-16 |
| eslint react-hooks/set-state-in-effect — effect 내 동기 setState 금지 | setState는 promise 콜백에서만 호출 + props 변경 시 리셋은 "렌더 중 prev 비교 패턴"(useState로 prevId 추적) 사용 | 2026-05-16 |
| `.next/types/`에 `* 2.ts` 복제 아티팩트(iCloud/Finder 중복 추정)로 tsc 실패 | `rm -rf .next` 후 재빌드. 재발 시 동일 처치 | 2026-05-16 |
| 브라우저 환경 감지(isKakaoInApp)를 useEffect+setState로 하면 린트 위반 | `useSyncExternalStore`(서버 스냅숏 false) 패턴 사용 — LoginPage 참조 | 2026-05-16 |
| [버그] PhotoViewer가 dev에서 안 열림 — 썸네일 클릭해도 즉시 닫힘 | popstate 더미히스토리 effect의 cleanup이 `history.back()` 호출 → React StrictMode 이중 마운트 시 그 back()의 비동기 popstate가 2번째 마운트 리스너를 때려 즉시 onClose. 해결: cleanup에서 back() 제거, 모든 닫기(X/ESC/뒤로가기)를 `history.back()` 경유로 일원화(requestClose). PhotoViewer.tsx | 2026-06-13 |
| [경합] 포토북 토글 직후 즉시 뷰어 닫으면 선택이 서버에 미반영 | 낙관적 setPhotos는 되나 await toggleBookSelection의 fetch가 언마운트로 경합. 실사용엔 무영향(닫기 전 토글 완료). 필요 시 토글을 fire-and-forget 큐로 분리 가능 | 2026-06-13 |
| 로컬 Supabase 스택이 다른 프로젝트(MD2Books, 54321~54327)와 포트 충돌 | config.toml 포트를 55321~55324로 변경 + `[analytics] enabled=false`(54327 충돌 회피) | 2026-06-13 |
| 카카오 키 없이 로그인 테스트 필요 | Supabase admin API `POST /auth/v1/admin/generate_link {type:magiclink}` → hashed_token을 `/auth/confirm?token_hash=...&type=signup&next=/rooms`로 브라우저 이동(신규 유저 첫 토큰 타입은 signup) | 2026-06-13 |
| 자동화로 동적 생성 file input에 업로드 불가(pickPhotos가 input.click()로 native dialog) | `HTMLInputElement.prototype.click` 후킹으로 native dialog 차단 → input 잔류 → canvas로 File 생성 후 DataTransfer로 input.files 주입 + change dispatch (실제 업로드 파이프라인 그대로 탐) | 2026-06-13 |
| [운영 502] 프로덕션 /api/storige/session 502 STORIGE_UPSTREAM_FAILED — Vercel `STORIGE_API_URL`이 빈 문자열("")로 들어가 `?? DEFAULT` 폴백 미작동(빈문자열은 nullish 아님)→apiUrl='' fetch 실패 | env 재설정+재배포로 즉시 복구. 근본수정: `getStorigeConfig`(API_URL/EDITOR_URL)·`getTemplateSetId`·constants `APP_URL` 4곳 `?? → ||`(빈문자열도 폴백). commit 47a7906 | 2026-06-22 |
| [운영 내지없음] 편집기는 열리는데 **표지만 보이고 내지 안 보임**(주입한 내지 canvasData 무시). 원인: 가리킨 셋 `2f312032`가 **cover 템플릿만 있고 page(내지) 템플릿 없음** + editor_mode=single·셋크기 458×238 오설정. Storige 편집기는 페이지를 **셋의 templates 배열로만 생성**하고(`apps/editor/src/hooks/useEditorContents.ts:1073/1250`), 내지를 pageCount만큼 늘리는 복제는 **기존 page 템플릿이 있어야만** 동작(:1029 `pageTemplates.length>0`). single 모드 내지는 셋크기를 써서 210×210도 안 됨(:1257). ShareSnap측은 정상(pageCount=canvasData.length-1 도출 `apps/editor/src/embed.tsx:780`) | known-good 정사각책 `sample-8x8-book-24p`(editor_mode=book, 셋=완성1면, 표지 spread + page 내지) 구조를 **210×210으로 복제한 완전한 새 셋 `sharesnap-210sq-book`**(표지 spread 422×210 + 내지 page 210×210, page_count_range[4,100]) Storige DB INSERT(SSH `deploy@158.247.235.202`+`docker exec storige-mariadb`, 추가전용·운영자 셋 무손상). ShareSnap env STORIGE_TEMPLATE_SET_ID 전환+재배포+세션무효화. 편집기 표지+내지4+자동배치 사진 cover-fit 배치 E2E 캡처 검증. **교훈: 편집기 페이지수=셋의 templates(특히 page 타입≥1) 결정. 표지만 있는 셋은 내지 0. ShareSnap 코드 변경 0** | 2026-06-22 |
| [UX] 사진 삭제가 채팅 말풍선에 실시간 미반영 — messages.photo_id는 FK ON DELETE SET NULL로 비워지지만 ①클라이언트가 messages UPDATE 이벤트를 구독 안 했고 ②PhotoMessage가 photoId prop 변경 시 이미 로드한 썸네일을 유지했음 | ①useRealtimeMessages에 UPDATE 구독 추가(useChat handleUpdate로 row 교체) ②PhotoMessage에 렌더 중 prev 비교 리셋 패턴 ③삭제 실행자 본인 화면은 useChat.markPhotoDeleted 낙관적 반영(usePhotos.remove가 성공 boolean 반환, 실패 시 오갱신 방지). ⚠타 참여자 반영은 운영 Supabase publication에 messages UPDATE 포함 필요 | 2026-07-03 |
| [운영 404] 편집기 "편집기를 열지 못했어요 — 템플릿셋을 불러올 수 없습니다(photobook-210-book-4p) 404". env `STORIGE_TEMPLATE_SET_ID`가 **Storige DB에 미존재하는 시드 슬러그**를 가리킴(시드 SQL은 적용된 적 없음). **createEditSession은 templateSetId 존재를 검증하지 않고 문자열만 저장** → 세션생성 201이 나도 편집기가 `/template-sets/{id}/with-templates` 호출 시 404 | 실재 셋 목록(`GET /template-sets`)에서 "sharesnap basic 210 H/C"(`2f312032-e3d2-4623-8013-231ce1984400`, type=book, 표지 spread 458×238, canAddPage, pageCountRange[10,100]) 발견. Vercel env를 이 UUID로 교체+재배포. 깨진 ID 저장된 기존 세션 `storige_session_id=NULL`로 무효화(재사용 분기 회피). **교훈: 세션생성 201 ≠ 편집기 로드 가능. 반드시 `/template-sets/{id}/with-templates`=200 확인.** autoLayout canvasData는 실재 셋과 그대로 호환(표지 null 보존+내지 https 이미지 cover-fit 201 실측) | 2026-06-22 |

---

## 프로젝트 컨텍스트

### 핵심 사용자 시나리오
1. 모임장이 공유방 개설 → 카카오톡으로 초대 링크 공유
2. 참여자가 링크 클릭 → 카카오 로그인 → 공유방 입장
3. 여행 중 사진 촬영 → PWA에서 사진 업로드 + 코멘트
4. 여행 후 갤러리에서 사진 모아보기
5. 포토북 만들기 → 사진 선택 → 자동 편집 → 표지/내지 커스텀
6. PDF 생성 → 미리보기 → 포토북 주문
7. 또는 개별 사진 인화 주문

### 모듈 의존성 (순서대로 개발)
```
M0(공용) → M1(인증) → M2(공유방) → M3(채팅) → M4(사진) → M5(편집기) → M6(포토북) + M8(PDF) → M7(인화주문) + M9(관리자)
```

### 카카오 API 사용 범위
- ✅ 카카오 로그인 (Supabase Auth)
- ✅ 카카오톡 공유 (JS SDK, Feed 메시지)
- ✅ 카카오톡 메시지 (나에게 보내기, 알림용)
- ❌ 오픈채팅 API (미제공)
- ❌ 채널 자동 개설 API (미제공)

---

## 환경 설정 메모

### Supabase 프로젝트 정보
```
Project URL  : (프로젝트 생성 후 기록)
Anon Key     : (프로젝트 생성 후 기록)
Service Key  : (프로젝트 생성 후 기록)
```

### 카카오 Developers 정보
```
App Key (JS) : (앱 등록 후 기록)
REST API Key : (앱 등록 후 기록)
Redirect URI : https://sharesnap.app/auth/callback
```
> [정정 2026-06-20] Redirect URI를 `/auth/callback/kakao` → `/auth/callback`으로 수정.
> 근거: 실제 콜백 라우트 핸들러가 `src/app/auth/callback/route.ts`(=`/auth/callback`)이고,
> OAuth `redirectTo`도 `${window.location.origin}/auth/callback`(패턴1, 본 파일 L135)이라 코드와 일치시킴.
> (참고: Supabase Auth가 카카오 토큰 교환을 대행하므로 provider별 `/kakao` 하위 경로는 불필요)

### 토스페이먼츠 정보 (ADR-013, 2026-06-24)
```
Client Key (NEXT_PUBLIC_TOSS_CLIENT_KEY) : (등록 후 기록 — 빌드 인라인이라 변경 시 재배포 필수)
Secret Key (TOSS_SECRET_KEY)             : (서버 전용 — 절대 NEXT_PUBLIC/git 금지, 채팅 노출 시 회전)
Webhook URL : https://sharesnap-three.vercel.app/api/payments/webhook (토스 개발자센터 등록 — 결제 사후 동기화)
successUrl / failUrl : /api/payments/confirm · /api/payments/fail (코드 자동 — APP_URL 기준)
승인 API   : POST https://api.tosspayments.com/v1/payments/confirm  (Authorization: Basic base64(secretKey + ":"))
SDK 로드   : CDN https://js.tosspayments.com/v2/standard (window.TossPayments) — npm 미설치
미설정 시  : 결제 graceful 비활성("결제 준비 중" 안내), 배송폼은 입력 가능
```

---

> **[MEMORY.md 업데이트 규칙]**
> - 새로운 아키텍처 결정 시: ADR 섹션에 추가
> - 새로운 기술 패턴 발견 시: 기술 패턴 섹션에 추가
> - 이슈 해결 시: 해결된 이슈 아카이브에 추가
> - 환경 설정 변경 시: 환경 설정 메모 업데이트
> - 절대 삭제하지 말 것 — 이 파일은 프로젝트의 영구 기억입니다
