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

---

> **[MEMORY.md 업데이트 규칙]**
> - 새로운 아키텍처 결정 시: ADR 섹션에 추가
> - 새로운 기술 패턴 발견 시: 기술 패턴 섹션에 추가
> - 이슈 해결 시: 해결된 이슈 아카이브에 추가
> - 환경 설정 변경 시: 환경 설정 메모 업데이트
> - 절대 삭제하지 말 것 — 이 파일은 프로젝트의 영구 기억입니다
