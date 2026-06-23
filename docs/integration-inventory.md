# ShareSnap 외부 연동 인벤토리 (Integration Inventory)

> **작성 기준**: 6개 도메인 에이전트의 코드 전수 조사 결과 종합 + 핵심 사실 직접 재검증(읽기 전용).
> **범위**: `/Users/yohan/Developer/claude/Sharesnap` (정본, 2026-06-23 확정 · Next.js 16 App Router + Turbopack + proxy 컨벤션 / React 19 / Supabase / Storige 임베드 / 카카오 / PWA).
> **상태 표기**: ✅ 완료(코드+동작 검증) · ⚠️ 부분(코드 완료, 운영 설정/실 E2E 미검증 또는 dev 한정) · ❌ 미설정·계획.
> **원칙**: 모든 항목은 코드 근거(파일:라인) 기반. 시크릿 값은 본문에 절대 포함하지 않음.

---

## 1. 한눈 인벤토리 표 (외부 호스트별 그룹)

### 🟢 Supabase — `127.0.0.1:55321`(로컬 dev) / `*.supabase.co`(운영 예정)

| 서비스 | 용도 | 연동방식 | 핵심 환경변수 | 상태 |
|--------|------|----------|--------------|------|
| Postgres DB (PostgREST) | 10개 테이블 CRUD(rooms/members/messages/photos/comments/photobook_orders·pages/print_orders·items/editor_resources/user_storige_map) | `@supabase/ssr` + `@supabase/supabase-js`, 마이그레이션 001~009 | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ |
| Auth (카카오 OAuth + Magic Link) | 카카오 1탭 로그인 + 이메일 OTP, 세션 쿠키, 라우트 가드 | `signInWithOAuth({provider:'kakao'})` / `signInWithOtp` / `exchangeCodeForSession` / `verifyOtp` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ⚠️ |
| Storage (4버킷) | 사진 4종(원본/인쇄3600px/중간1280/썸네일400), PDF 회수, 편집 리소스 | `storage.from().upload/getPublicUrl/createSignedUrl/remove` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | ✅(코드)/⚠️(운영) |
| Realtime | 채팅·갤러리 실시간 동기화(postgres_changes INSERT/DELETE) | `client.channel().on('postgres_changes').subscribe()` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ⚠️ |
| RLS + 참여퍼널 RPC | 전 테이블 행단위 접근제어 + `get_room_preview`/`join_room_via_share_code` | 006 RLS, 008 security definer RPC | (env 불필요) | ✅ |
| service_role (webhook 전용) | Storige 합성 웹훅 처리(RLS 우회, pdfs 저장) | `createClient(url, SERVICE_ROLE_KEY)` 서버 전용 | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | ⚠️ |
| 로컬 스택 (config.toml) | supabase CLI 로컬 개발(커스텀 포트 55321~55324) | `supabase/config.toml` | (위와 동일) | ✅ |

### 🟠 Storige — `api.papascompany.co.kr/api`(REST) / `editor.papascompany.co.kr`(iframe)

| 서비스 | 용도 | 연동방식 | 핵심 환경변수 | 상태 |
|--------|------|----------|--------------|------|
| 편집기 임베드 (E2E 파이프라인) | 사진주입 편집세션 → 표지/내지 편집 → compose-mixed PDF → webhook → 회수 | 서버 어댑터(`/api/storige/*`) + 클라이언트 어댑터 분리 | `STORIGE_API_KEY`, `STORIGE_API_URL`, `NEXT_PUBLIC_STORIGE_EDITOR_URL` 외 | ⚠️ |
| shop-session JWT 발급 | 편집세션 호출용 Bearer accessToken (UUID↔정수 memberSeqno 매핑) | `POST /auth/shop-session`, `X-API-Key`(서버전용) | `STORIGE_API_KEY`, `STORIGE_API_URL` | ✅ |
| edit-sessions 생성 + externalPhotos | 사진주입 + 자동배치 canvasData 주입, sessionId 영속화 | `POST /edit-sessions`(신규) / `PATCH /edit-sessions/{id}`(재주입) | `STORIGE_API_KEY`, `STORIGE_API_URL`, `STORIGE_TEMPLATE_SET_ID` | ⚠️ |
| externalPhotos 빌더 (서버) | photos → externalPhotos 변환(만료없는 public URL) | `buildExternalPhotosForRoom` | (env 불필요) | ✅ |
| 자동배치 canvasData | 사진 배열 → 페이지별 Fabric JSON(150dpi, bleed 3mm, cover-fit) | `buildAutoLayoutCanvasData` | `STORIGE_PHOTOBOOK_PAGE_W_MM`, `STORIGE_PHOTOBOOK_PAGE_H_MM` | ✅ |
| compose-mixed PDF 합성 | editor.complete 후 합성 워커 잡 생성, synthesis_job_id 저장 | `POST /worker-jobs/compose-mixed`, `X-API-Key` | `STORIGE_API_KEY`, `STORIGE_API_URL` | ⚠️ |
| webhook 수신 + PDF 회수 | 합성 완료/실패 → 주문상태 갱신 + pdfs 버킷 저장 | `POST /api/storige/webhook` + `/files/{id}/download/external` | `SUPABASE_SERVICE_ROLE_KEY`, `STORIGE_API_KEY`, `STORIGE_API_URL` | ⚠️ |
| postMessage 임베드 호스트 | iframe `/embed` 양방향 메시지 + 호스트 UI | `useStorigeEmbed` + `StorigeEditorHost`(엔벨로프 v1, origin 검증) | `NEXT_PUBLIC_STORIGE_EDITOR_URL` | ⚠️ |
| sessionId 영속화 + 재편집 | editor.complete 결과 저장 + 동일 세션 재사용 | `photobookService`(클라이언트 Supabase) | (env 불필요) | ✅ |

### 🟡 카카오 — `t1.kakaocdn.net`(JS SDK CDN) / Supabase Auth 대행(OAuth)

| 서비스 | 용도 | 연동방식 | 핵심 환경변수 | 상태 |
|--------|------|----------|--------------|------|
| 카카오 로그인 (OAuth) | 카카오계정 1탭 소셜 로그인 (참여 퍼널 진입) | Supabase Auth provider `'kakao'` 대행 (앱 코드는 카카오 키 직접 미사용) | (Supabase Provider 설정 의존; 앱 코드 키 없음) | ⚠️ |
| 카카오톡 공유 (JS SDK Feed) | 초대/새사진/포토북 3종 Feed 공유 | CDN 동적 `<script>`(SRI) → `Kakao.Share.sendDefault` | `NEXT_PUBLIC_KAKAO_JS_KEY` | ⚠️ |
| 인앱 브라우저 감지 + 외부 오픈 | 카톡 WebView에서 Magic Link 숨김, 외부 브라우저 강제 | UA `/KAKAOTALK/i` 감지 + `kakaotalk://web/openExternal` | (env 불필요) | ✅ |
| 오픈채팅/채널/REST 메시지 API | (배제) 오픈채팅 자동개설·사진추출 미제공 → 자체 Realtime 채택 | ADR-001로 배제. `KAKAO_REST_API_KEY`는 선언만, 코드 미참조 | `KAKAO_REST_API_KEY`(데드) | ❌(계획) |

### 🔵 jsdelivr CDN — `cdn.jsdelivr.net`

| 서비스 | 용도 | 연동방식 | 핵심 환경변수 | 상태 |
|--------|------|----------|--------------|------|
| Pretendard 폰트 | 본문 타이포그래피(dynamic-subset) | `layout.tsx <head>` 정적 `<link>` (버전 핀 `@v1.3.9`, SRI 없음) | (env 불필요) | ✅ |

### ⚫ Vercel — (미연결)

| 서비스 | 용도 | 연동방식 | 핵심 환경변수 | 상태 |
|--------|------|----------|--------------|------|
| 배포 호스팅 | Next.js 16 SSR 프로덕션 배포 = TWA 앱 업데이트 | Git 연동 자동 배포(계획) | (프로덕션 env 전량 미주입) | ❌(계획) |

### 🟣 PWA 자산 (same-origin self-host)

| 서비스 | 용도 | 연동방식 | 핵심 환경변수 | 상태 |
|--------|------|----------|--------------|------|
| Web App Manifest | 홈화면 설치 메타데이터 | `public/manifest.json` + layout 링크 | (env 불필요) | ⚠️(maskable 누락) |
| Service Worker | 오프라인 폴백 + 정적 캐시 | 수동 `public/sw.js`(network-first/cache-first) | (env 불필요) | ⚠️(Web Push 미구현) |
| 앱 아이콘 | manifest/iOS 홈화면/OG 폴백 | `public/icons/`(svg/192/512/apple-touch) | (env 불필요) | ⚠️(maskable 2종 미생성) |
| Android TWA / iOS Capacitor | Play/App Store 패키징 | Bubblewrap / Capacitor(계획) | (env 불필요) | ❌(계획) |

---

## 2. 도메인별 상세

### 2.1 Supabase (DB / Auth / Storage / Realtime)

**클라이언트 3계층**: 브라우저(`client.ts:5-9`), 서버(`server.ts:6-27`, Server Component setAll try-catch), proxy/미들웨어(`middleware.ts:6-58`). service_role은 별도 4번째 경로(서버 전용 모듈).

**DB (PostgREST)** — ✅
- 10개 테이블, 마이그레이션 001~009 idempotent SQL(`create if not exists`).
  - 001 `rooms`+`room_members`+`set_updated_at` 트리거 / 002 `photos`+`messages`+`photo_comments` / 003 `photobook_orders`+`photobook_pages` / 004 `print_orders`+`print_order_items` / 005 `editor_resources` / 006 RLS 전체 / 007 Storage 버킷+정책 / 008 참여퍼널 RPC 2종 / 009 Storige 연동 컬럼+`user_storige_map`+`photos.print_path`.
- `database.ts`는 **수동 작성**(주석상 운영서 `gen types` 권장). 임베디드 select 미지원(Relationships 빈 배열) → 2단계 쿼리 패턴.
- `order_no`/`member_no`는 `generated always as identity`라 Insert/Update 타입에서 `never`로 차단.
- 근거: `database.ts:12-469`, `migrations/001~009`, `roomService.ts:21`, `chatService.ts:27`, `photobookService.ts:51`.

**Auth** — ⚠️
- 클라이언트: `signInWithOAuth({provider:'kakao'})`, `signInWithOtp(email)`, `signOut`, `getUser/getSession`.
- 서버 콜백: `/auth/callback`이 `exchangeCodeForSession`(PKCE code), `/auth/confirm`이 `verifyOtp`(token_hash).
- proxy→middleware `updateSession`이 매 요청 `getUser()`로 refresh + 쿠키 재기록.
- **운영 미설정 사유**: 카카오 OAuth Provider는 Supabase 대시보드 설정 의존. `config.toml`에 `[auth.external.kakao]` 블록 **부재**(grep 0건), 모든 `[auth.external.*]=false`. `enable_confirmations=false`(이메일 확인 비활성). 로컬은 카카오 키 미사용.
- 근거: `authService.ts:17-67`, `callback/route.ts:22-31`, `confirm/route.ts:24-36`, `middleware.ts:6-58`, `proxy.ts:5-14`.

**Storage (4버킷)** — ✅(코드) / ⚠️(운영 호스트 dev)
- 버킷: `photos`(비공개)/`thumbnails`(공개)/`resources`(공개)/`pdfs`(비공개). 정의는 007 마이그레이션.
- 경로 규칙: 사진=`{userId}/{roomId}/{uuid}`(`.jpg`|`_thumb`|`_medium`), 인쇄용=`{userId}/{roomId}/print/{uuid}.jpg`(공개 `thumbnails` 버킷).
- 공개=`getPublicUrl`, 비공개=`createSignedUrl`(3600초). webhook은 service role로 `pdfs` upsert.
- RLS가 `storage.foldername(name)[1]=auth.uid()` 검사 → userId가 반드시 첫 세그먼트.
- **인쇄용을 공개버킷+`getPublicUrl`(만료없음)로 두는 이유**: Storige externalPhotos가 만료없는 URL 요구(signed 금지).
- `pdfs` 버킷은 webhook이 **쓰기만** 하고 앱 내 읽기(download/signed) 코드는 아직 없음.
- 근거: `migrations/007:5-58`, `constants.ts:24-30`, `photoService.ts:32-54,104-154,246-248`, `webhook/route.ts:160-166`, `photobookServer.ts:42`.

**Realtime** — ⚠️
- `client.channel(name).on('postgres_changes', {event, schema:'public', table, filter:room_id=eq.X}).subscribe()`, 언마운트 시 `removeChannel`.
- **부분 사유 2가지**:
  1. 채널 네이밍 불일치 — 표준은 `realtimeChannel(roomId)=room:{roomId}`(`useRealtime.ts`), 그러나 `usePhotos.ts:61`은 하드코딩 `room:${roomId}:photos`로 상수 헬퍼 미경유.
  2. `postgres_changes` 동작에 필요한 `ALTER PUBLICATION supabase_realtime ADD TABLE`이 마이그레이션에 **없음** → 대시보드/CLI 수동 활성화 의존(버전관리 안 됨).
- 근거: `useRealtime.ts:24-56`, `usePhotos.ts:60-89`, `constants.ts:33`.

**RLS + 참여퍼널 RPC** — ✅
- 006: 전 테이블 `enable row level security` + 정책. 헬퍼 `is_room_member`/`is_room_owner`(security definer, `search_path=public`).
- 008: `get_room_preview`(anon+authenticated, room id 비노출), `join_room_via_share_code`(authenticated, `auth.uid()` null이면 `AUTH_REQUIRED`, 멱등 `on conflict do nothing`).
- 009: `user_storige_map` select/insert 본인 행만.
- **설계 의도**: RLS `rooms_select`가 멤버만 허용하는 P0 결함(비로그인 share_code 조회 불가)을 008 RPC로 우회.
- **알려진 갭**: `editor_resources`에 관리자 쓰기(insert/update) RLS 정책 부재(006 주석 'admin role 정의 후 추가' TODO) → service_role/대시보드로만 리소스 주입 가능.
- 근거: `migrations/006:5-235`, `migrations/008:7-69`, `join/[shareCode]/page.tsx:29-140`.

**service_role (webhook 전용)** — ⚠️
- `createServiceRoleClient()`: `createClient(url, SERVICE_ROLE_KEY, {auth:{persistSession:false}})`. 키 미설정 시 **null 반환** → DB 갱신 스킵 + 200 로그만(graceful degradation).
- service role 클라이언트는 `storigeServer.ts`(서버 전용, `'use client'` 없음)에서만 생성 — 클라이언트 유출 0.
- **부분 사유**: 실 운영은 `SUPABASE_SERVICE_ROLE_KEY`가 프로덕션에 주입돼야 가능(로컬은 데모 키).
- 근거: `storigeServer.ts:409-417`, `webhook/route.ts:50-118,128-178`.

**로컬 스택 (config.toml)** — ✅
- `project_id=sharesnap`. 포트 표준 54321~54327 대신 **55321~55324**(타 로컬 프로젝트 충돌 회피, MEMORY ADR). DB major_version=17, analytics disabled.
- `file_size_limit=50MiB`, `s3_protocol enabled`, refresh token rotation 활성(reuse_interval=10s, jwt_expiry=3600s).
- 근거: `config.toml:5-13,27-36,81-110,150-156,378-382`.

---

### 2.2 Storige (편집기 임베드 + 서버 어댑터 + 자동배치)

**아키텍처**: 서버 어댑터(`/api/storige/*` Route Handler + `storigeServer.ts`, `X-API-Key` 서버 전용) ↔ 클라이언트 어댑터(`storigeClient.ts`, iframe/postMessage, 키 미참조). 브라우저는 절대 Storige를 직접 호출하지 않고 `/api/storige/*` 프록시만 사용.

**E2E 파이프라인 7단계**:
1. **shop-session JWT 발급**(✅) — `POST /auth/shop-session`, body `memberSeqno`(정수, `user_storige_map.member_no`), `memberId`(이메일), `memberName`(누락 시 memberId 폴백), `orderSeqno`. UUID↔정수 매핑은 `user_storige_map`(bigint identity, 해시 미사용 → 충돌 회피). 근거: `storigeServer.ts:86`, `session/route.ts:143`.
2. **edit-sessions 생성 + externalPhotos**(⚠️) — `POST /edit-sessions`, `mode='both'`, `templateSetId`, `orderSeqno`, `callbackUrl`(웹훅), `canvasData`(있을 때만), `metadata.externalPhotos`. 기존 세션 있으면 `PATCH`로 사진만 재주입(idempotent). 세션생성·사진주입(4장)·'공유방 사진' 탭 노출은 **실 Storige API로 검증**(ADR-011-v2). 근거: `storigeServer.ts:157,199`, `session/route.ts:171,156`.
3. **externalPhotos 빌더**(✅) — 서버 Supabase(쿠키세션, RLS 통과)로 photos 조회. `url=print_path(3600px)→medium_path 폴백`의 thumbnails 공개버킷 public URL, `name=original_filename`, `width/height`(cover-fit용). **signed URL 절대 금지**(편집기 로드 시점 fetch → 만료 회피). public URL 못 만드는 사진은 제외. 근거: `photobookServer.ts:26`, `photo/types.ts:36`.
4. **자동배치 canvasData**(✅) — `[null(표지=템플릿 유지), 내지1..N]`. 좌표계 ground truth: `DISPLAY_DPI=150`, `BLEED_MM=3`, 워크스페이스px=`(판형mm+6)*150/25.4`, 원점=중심(0,0). cover-fit `scale=max(Wpx/iw,Hpx/ih)`, 사진 1장=1페이지 풀블리드, id 결정적(`'auto-'+idx`). 내지 수=사진수 `pageStep(4)` 배수 올림. **Fabric 5.5.2 좌표계(Storige)** — `dpiConverter` 300dpi 좌표계와 혼용 금지. 근거: `autoLayout.ts:178,109`, `session/route.ts:166`.
5. **compose-mixed 합성**(⚠️) — `POST /worker-jobs/compose-mixed`, body `editSessionId`, `orderId=String(orderSeqno)`. 응답 `{id}`를 `synthesis_job_id`로 저장(웹훅 매칭 키). 클라이언트는 fire-and-forget. DTO 계약 실 Storige 소스 일치 확인(CTO §2). 근거: `compose/route.ts:13`, `storigeServer.ts:264`, `storigeClient.ts:133`.
6. **webhook 수신**(⚠️) — `POST /api/storige/webhook`. 서명검증 `Base64(${jobId??sessionId}:${event}:${timestamp})`, `X-Storige-Retry:1`은 서명누락 허용. `synthesis.completed/failed`만 처리. service role로 `synthesis_job_id` 매칭 → completed=`pdf_ready`+PDF 회수, failed=`confirmed` 되돌림. **2xx 빠른 응답 원칙**(DB 오류여도 200, 재시도 폭주 방지). 근거: `webhook/route.ts:17,128`, `storigeServer.ts:380,302,325`.
7. **결과 PDF 회수**(⚠️) — `/files/{id}/download/external`(`X-API-Key`) → `pdfs` 버킷 upsert → `pdf_path` 저장. 구 `/files/:id/download` 경로는 2026-05-03 폐기, `/external`만 사용.

**postMessage 임베드 호스트**(⚠️):
- `useStorigeEmbed`: `e.origin===편집기 origin` + `msg.source==='storige-editor'` **이중 검증**. `editor.ready/save/complete/cancel/needAuth/error` 분기. complete는 `parseEditorResult` 안전파싱(sessionId 필수).
- 호스트→편집기: `source:'storige-host'` 엔벨로프 + targetOrigin 고정(`'*'` 금지). `buildEmbedUrl`은 `parentOrigin` 필수 부착(미전달 시 편집기가 `'*'` 발신 — 보안 금지).
- `StorigeEditorHost`: iframe `allow='clipboard-write'`(sandbox 속성 없음), ready까지 스켈레톤, error 재시도(리마운트), 편집중 닫기 확인 다이얼로그.
- 근거: `useStorigeEmbed.ts:36`, `StorigeEditorHost.tsx:44`, `storigeClient.ts:164,11-21`, `editor/types.ts:62`.

**전체 연동상태가 ⚠️ 부분인 핵심 사유**:
- 코드 레벨은 **완성·검증**(tsc clean, 키 active 검증, compose/webhook DTO 실 Storige 소스 대조 일치).
- 그러나 **실 webhook E2E 미검증**: dev `callbackUrl=localhost`라 Storige SSRF allowlist 때문에 실제 웹훅 도달 불가 → 페이로드 모사(mock)로만 검증(MEMORY ADR-011-v2, CTO §3 B1).
- 남은 블로커(전부 인프라/결정, 코드 아님): 운영 배포·도메인 확정·Storige 사이트 origin/callback 등록·실 templateSet 발급. 실 templateSet은 `docs/storige-seed-210x210-photobook.sql` 시드로만 가능(등록 API는 X-API-Key 401, Admin JWT 전용) → Storige 운영자 적용 필요.

**데드코드 주의**: `src/modules/photo/services/externalPhotos.ts:24` `buildExternalPhotos`(클라이언트 사본)는 src 전체에서 import 0건. 실제 사진주입은 서버판 `buildExternalPhotosForRoom`이 수행. 연동 동작 무영향.

---

### 2.3 카카오 (로그인 / 공유)

**카카오 로그인 (OAuth)** — ⚠️
- 별도 카카오 SDK/REST 호출 **없이** 전적으로 Supabase Auth가 토큰 교환 대행. `signInWithOAuth({provider:'kakao', redirectTo:buildCallbackUrl})` → 카카오 인증 → `/auth/callback?code=&next=` → `exchangeCodeForSession`(PKCE).
- `buildCallbackUrl`은 오픈 리다이렉트 방지: `next`가 `'/'`시작 && `'//'`아님일 때만 채택.
- **부분 사유**: ① 카카오 Developers 앱 등록 후 Supabase 대시보드 Auth>Providers>Kakao 키 등록 ② Supabase Auth URL Configuration Redirect URLs에 `{도메인}/auth/callback?*` 글롭 등록.
- ⚠️ **설정 정합성 주의**: `MEMORY.md:233`은 운영 Redirect URI를 `https://sharesnap.app/auth/callback/kakao`로 기록하나, 실제 코드 콜백은 `/auth/callback`(authService.ts:10, **kakao 세그먼트 없음**). 운영 등록 시 코드 경로와 일치시켜야 로그인 성공.
- 근거: `authService.ts:9-27`, `KakaoLoginButton.tsx:13-52`, `callback/route.ts:22-31`, `RoomPreview.tsx:124`.

**카카오톡 공유 (JS SDK Feed)** — ⚠️
- CDN 동적 `<script>` 주입(SRI `sha384` + `crossorigin=anonymous`) 1회 로드 → `Kakao.init(NEXT_PUBLIC_KAKAO_JS_KEY)` → `Kakao.Share.sendDefault({objectType:'feed', content, buttons})`.
- `buildFeedTemplate(variant)`: invite/newPhotos/photobook 3종, 이미지 없으면 `/icons/icon-512.png` 폴백(카카오 200×200 최소요건). 버튼 링크는 모두 `/join/{shareCode}`.
- **부분 사유**: `.env.local`에서 `NEXT_PUBLIC_KAKAO_JS_KEY`가 **빈 문자열** → 버튼 클릭 시 의도적 에러 toast(주석: '로컬 테스트 미사용, 정상'). 프로덕션 키 미설정.
- 카카오 디자인 토큰 격리: `--kakao #FEE500`/`--kakao-foreground #191919`(globals.css), `bg-kakao` 클래스로만 사용.
- 근거: `kakao.ts:41-43,47-101,122-176`, `KakaoShareButton.tsx:40-58`, `InviteLink.tsx:73-77`, `PhotoUploader.tsx:119-135`.

**인앱 브라우저 감지** — ✅
- `navigator.userAgent /KAKAOTALK/i`(`isKakaoInApp`). `LoginPage`가 `useSyncExternalStore`(서버 스냅숏 false)로 하이드레이션 불일치 없이 분기 → 인앱이면 Magic Link 폼 숨김.
- `openExternalBrowser`는 `kakaotalk://web/openExternal?url=`로 정의돼 있으나 현재 직접 호출처 없음(향후 강제 전환용 헬퍼).
- 근거: `browserEnv.ts:7-25`, `LoginPage.tsx:27-31,90`.

**오픈채팅/채널/REST 메시지 API** — ❌ 계획(배제)
- ADR-001: 오픈채팅 API/채널 그룹채팅/채팅 사진 Webhook은 전부 카카오 미제공 → 채택 안 함. 채팅은 자체 Supabase Realtime.
- `KAKAO_REST_API_KEY`는 `.env.local.example`/`.env.local`에 선언만, src 전체 grep 결과 `kapi.kakao.com`/`kauth.kakao.com`/`talk-memo`/`scrap` 호출 0건 → **순수 데드 환경변수**.
- 근거: `docs/kakao-api-report.md:25-39`, `MEMORY.md:10-14,211-216`.

---

### 2.4 인증 (OAuth + Magic Link)

> 카카오 OAuth·Magic Link의 Supabase 측면. 코드 경로는 완비, 운영 인프라(Provider/SMTP)는 미설정.

**Magic Link / 이메일 OTP** — ⚠️
- `signInWithOtp({email, options:{emailRedirectTo:/auth/callback?next=}})`. 복귀 2경로: ① `/auth/callback?code=`→`exchangeCodeForSession`, ② `/auth/confirm?token_hash=&type=`→`verifyOtp`(SSR 공식 이메일 링크 패턴).
- **이메일 실발송 미구성**: `config.toml [auth.email.smtp]` 전체 주석 처리 → 운영 SMTP 없음. 로컬은 `[inbucket] enabled`(포트 55324)로 캡처만(발송 안 됨). `enable_confirmations=false`, rate_limit `email_sent=2/hour`. 이메일 템플릿 `ConfirmationURL→/auth/confirm` 매핑도 config 미반영.
- 근거: `authService.ts:29-45`, `confirm/route.ts:10-39`, `callback/route.ts:22-31`, `LoginPage.tsx:34-51,90-124`.

**세션 갱신 & 라우트 가드 (proxy/middleware)** — ✅
- Next.js 16 proxy 컨벤션(`src/proxy.ts` default export) → `updateSession`이 `createServerClient` 쿠키 getAll/setAll + `auth.getUser()` 갱신.
- `isAuthRoute=/login·/auth·/join`, `isPublicRoute='/'·/_next·/api·/icons·/offline·/.well-known·/manifest.json·/favicon.ico`(middleware.ts:34-49).
- **`/api`를 public 처리하는 이유**: 미들웨어가 `/api/*`를 `/login`(307) redirect하면 웹훅 차단·fetch가 HTML 수신 → 라우트가 자체 401 JSON/서명검증 담당(MEMORY 2026-06-13).
- ⚠️ **proxy matcher 갭(검증됨)**: `proxy.ts:12` matcher가 `.well-known`을 **제외하지 않음**. `_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|이미지확장자`만 제외 → 향후 `public/.well-known/assetlinks.json`을 두면 proxy 인증 가드에 걸려 TWA Digital Asset Links 검증 실패 위험. (`public/.well-known` 디렉토리 자체도 현재 부재 — 확인됨.)
- 근거: `proxy.ts:5-14`, `middleware.ts:6-58`, `server.ts:6-27`.

**인증 상태 구독 (useAuth / AuthGuard)** — ✅
- `useAuth`: `getSession()` + `onAuthStateChange` 구독. `(main)/layout.tsx`가 서버 컴포넌트에서 `auth.getUser()` 후 미로그인 시 `redirect('/login')`(실질 1차선). `AuthGuard`는 클라이언트 2차 가드.
- ⚠️ **로그아웃 미배선**: `signOut()`이 `authService.ts:47`에 구현됐으나 UI 호출처 **0건** → 세션 종료 경로가 사용자에게 미노출(기능 갭, 세션 강제만료 불가).
- 근거: `useAuth.ts:7-44`, `AuthGuard.tsx:14-40`, `(main)/layout.tsx:6-17`.

**오픈 리다이렉트 방어** — ✅
- 3개 진입점(callback/confirm/authService) 동일 검증: `startsWith('/') && !startsWith('//')`, 아니면 기본 `/rooms`. MEMORY [P0] '카카오 로그인 후 next 유실' 해결책. (백슬래시·인코딩 우회는 명시 차단 안 함, Next/브라우저 정규화 의존.)
- 근거: `callback/route.ts:9-13`, `confirm/route.ts:18-22`, `authService.ts:9-15`.

**참여 퍼널 RPC** — ✅ (§2.1 RLS와 동일, 인증 경계 RPC 처리)
- `/join/[shareCode]` 서버 컴포넌트가 `auth.getUser()`로 4분기(비로그인/auto=1 자동입장/기존멤버/비멤버). 미들웨어가 `/join`을 `isAuthRoute`로 통과시켜야 SSR `getUser` 동작.
- 근거: `migrations/008:8-69`, `join/[shareCode]/page.tsx:74-171`, `RoomPreview.tsx:33-47`.

---

### 2.5 배포 / PWA

**Vercel** — ❌ 계획 (직접 재검증 완료)
- `git remote -v` **빈 출력**(remote 미설정), 커밋 2개(Initial + storige). `vercel.json` **없음**, `.vercel` 디렉토리 **없음**. `next.config.ts`에 Vercel 특화 설정 없음(turbopack root 고정만).
- 문서상 타깃일 뿐 실제 프로젝트 링크/배포 산출물 부재. STATUS Phase 7(배포) ⬜대기.
- 근거: `CLAUDE.md`, `docs/mobile-deployment.md:385`, `STATUS.md:174`, 직접 확인(git/fs).

**Web App Manifest** — ⚠️
- `id='/'`, `name=ShareSnap`, `start_url='/rooms'`, `display=standalone`, `theme_color=#F2654C`(브랜드 코랄, 카카오 옐로 금지 준수), `background=#FBF8F3`, `lang=ko`, `scope='/'`.
- **갭**: `purpose:maskable` 192/512 분리 아이콘 미등록(any 3종만). screenshots/shortcuts 미적용.
- 근거: `manifest.json:1-34`, `layout.tsx:10`.

**Service Worker** — ⚠️
- 빌드도구 비의존 수동 `sw.js`. 내비게이션 network-first→`/offline` 폴백, `/_next/static`·`/icons` cache-first, 비-GET·`*.supabase.co` 캐시 제외. `CACHE_VERSION='v1'`(배포 시 수동 증가). `ServiceWorkerRegister`는 `NODE_ENV==='production'`에서만 등록.
- **Web Push 미구현**: `sw.js:91-107` push/notificationclick 주석 골격만. VAPID 발급·구독 저장 미구현(Phase 5~6). next-pwa/Serwist 미사용(Next16/Turbopack 호환 리스크로 의도적 배제 — ADR-009).
- 근거: `sw.js:1-108`, `ServiceWorkerRegister.tsx:10-24`, `offline/page.tsx:1-29`.

**앱 아이콘** — ⚠️ (직접 재검증: 실파일 4개 존재)
- 존재: `icon.svg`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` — manifest/layout 참조 4개 모두 실존(깨진 참조 없음).
- **미생성**: `icon-192-maskable.png`/`icon-512-maskable.png`(TWA maskable 요건).
- 근거: `public/icons/`(직접 ls), `layout.tsx:10-19`, `manifest.json:14-32`.

**Android TWA / iOS Capacitor** — ❌ 계획
- TWA: Bubblewrap CLI(미착수). 2개 코드 갭: ① `public/.well-known/` 디렉토리 **부재**(직접 확인) → `assetlinks.json` 미생성 ② `proxy.ts:12` matcher가 `.well-known` 미제외. packageId 계획값=`app.sharesnap.twa`. 카카오는 순수 웹 OAuth라 Android 플랫폼 등록 불필요.
- iOS: Capacitor 의존성 미설치(`@capacitor/*` 없음). 전제: Sign in with Apple 추가, `apple-app-site-association` 배포, `/auth/native-callback` 추가. Next SSR이라 remote URL 방식 강제.
- 근거: `docs/mobile-deployment.md:353-397`, `MEMORY.md:62-66`, `proxy.ts:10-13`.

---

### 2.6 CDN / 리소스

**Pretendard 폰트 (jsdelivr)** — ✅
- `https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css`. `crossOrigin=anonymous`만, **SRI integrity 없음**(카카오 SDK와 대비 — 공급망 변조 무방비). next/font 미사용. 근거: `layout.tsx:44-48`.

**Kakao JS SDK (t1.kakaocdn.net)** — ⚠️
- `https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js`, `integrity sha384`(SRI 적용 — 변조 방지) + `crossOrigin=anonymous` + `async`. 버전 2.7.4 핀. `NEXT_PUBLIC_KAKAO_JS_KEY` 빈값이면 init reject. 근거: `kakao.ts:41-43,83-92`.

**Supabase Storage 이미지** — ⚠️
- 표시 6곳 전부 raw `<img>`(next/image 미사용, `@next/next/no-img-element` eslint-disable 동반). `getPublicUrl`로 public URL. 현재 호스트 `127.0.0.1:55321`(dev) → 운영 `*.supabase.co` 예상. 근거: `photoService.ts:38,53`, `RoomList.tsx:76`, `PhotoMessage.tsx:66`, `PhotoGrid.tsx:29`, `PhotoViewer.tsx:171`.

**next/image 원격 최적화** — ❌ 미설정
- `next.config.ts`에 `images/remotePatterns/loader` 전혀 없음(직접 확인 — turbopack root만). 의도적 raw `<img>` 우회. 향후 활성화 시 supabase.co + editor/api.papascompany.co.kr 등록 필요. 근거: `next.config.ts:1-10`.

**OG/소셜 메타 이미지** — ⚠️
- `/join` `generateMetadata openGraph.images = cover_url ?? APP_URL/icons/icon-512.png`. **현재 `NEXT_PUBLIC_APP_URL=http://localhost:3000`** → 운영 미설정 시 OG가 localhost를 가리켜 카카오 스크래퍼 못 읽음. signed URL 금지·public URL만 저장 규칙 준수. 근거: `join/[shareCode]/page.tsx:38-44`, `kakao.ts:129`, `constants.ts:6-7`.

**Storige externalPhotos crossOrigin** — ✅
- `makePhotoImage`가 Fabric image에 `src=photo.url` + `crossOrigin:"anonymous"` + `externalPhotoUrl` 명시(canvas taint 방지). 실 cross-origin 로드 성공은 Supabase Storage CORS 헤더 의존(코드 외부 인프라). 근거: `autoLayout.ts:107,136-139`.

---

## 3. 데이터 흐름 (외부 서비스 간 데이터 이동)

```
[흐름 A] 공유방 사진 — 업로드 → 편집기 주입
  사용자 카메라/갤러리
    └─ PhotoUploader → Supabase Storage(photos 버킷, 4종 리사이즈)
         └─ photos 테이블(print_path/medium_path/thumbnail_path)
              └─ buildExternalPhotosForRoom (서버, RLS 멤버 통과)
                   └─ getPublicUrl (thumbnails 공개버킷, 만료없는 URL)
                        └─ Storige POST /edit-sessions metadata.externalPhotos
                             └─ 편집기 '공유방 사진' 탭 + 자동배치 canvasData

[흐름 B] 편집 결과 PDF — Storige → Supabase
  편집기 editor.complete (postMessage)
    └─ saveEditorResult → photobook_orders(storige_session_id, file_id)
         └─ triggerComposePhotobook → Storige POST /worker-jobs/compose-mixed
              └─ synthesis_job_id 저장
                   └─ (합성 완료) Storige → POST /api/storige/webhook (서명검증)
                        └─ service role: synthesis_job_id 매칭 → status pdf_ready
                             └─ GET /files/{id}/download/external (X-API-Key)
                                  └─ Supabase Storage pdfs 버킷 upsert → pdf_path

[흐름 C] 카카오 로그인 → Supabase Auth
  KakaoLoginButton → supabase.auth.signInWithOAuth({provider:'kakao'})
    └─ 카카오 인증 페이지 (Supabase가 토큰 교환 대행)
         └─ /auth/callback?code=&next= → exchangeCodeForSession (PKCE)
              └─ 세션 쿠키(@supabase/ssr) → next 경로 redirect (/join/{code}?auto=1 등)
                   └─ join_room_via_share_code RPC (멱등 참여)

[흐름 D] 카카오톡 공유 (아웃바운드)
  KakaoShareButton → loadKakaoSdk (t1.kakaocdn.net, SRI)
    └─ Kakao.Share.sendDefault(Feed, link=APP_URL/join/{shareCode})
         └─ (수신자) 카톡 링크 클릭 → /join/{shareCode} → 흐름 C

[흐름 E] 폰트/SDK 런타임 로드 (CDN)
  RootLayout → jsdelivr Pretendard CSS (SRI 없음)
  KakaoShareButton 트리거 시 → t1.kakaocdn Kakao SDK (SRI sha384)
```

**핵심 제약**:
- 흐름 A의 externalPhotos는 **signed URL 절대 금지**(편집기 로드 시점 fetch → 만료 회피). 공개 `thumbnails` 버킷 public URL만.
- 흐름 B의 webhook은 dev `callbackUrl=localhost`라 Storige SSRF allowlist로 차단 → **실 E2E는 운영 공개 도메인 필요**(현재 mock 검증).
- 흐름 C/D 모두 `NEXT_PUBLIC_APP_URL`에 종속 — 현재 localhost라 운영 미설정 시 OG·초대링크·OAuth 리디렉트 전부 깨짐.

---

## 4. 환경변수 마스터 목록 (총 12개)

| 변수명 | 노출 | 용도 | `.env.local` 현재 상태 |
|--------|------|------|----------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | 클라(NEXT_PUBLIC) | Supabase DB/Auth/Storage/Realtime 엔드포인트 | ✅ 설정(`http://127.0.0.1:55321` 로컬 스택) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 클라(NEXT_PUBLIC) | Supabase 익명 클라이언트 키 | ✅ 설정(공개 데모 JWT — 프로덕션 금지) |
| `SUPABASE_SERVICE_ROLE_KEY` | **서버 전용** | webhook RLS 우회(주문 갱신/pdfs 저장) | ✅ 설정(로컬 데모 키) |
| `NEXT_PUBLIC_KAKAO_JS_KEY` | 클라(NEXT_PUBLIC) | 카카오 JS SDK init(공유) | ❌ **빈 문자열**(로컬 미사용 의도) |
| `KAKAO_REST_API_KEY` | 서버 전용 | (계획) 서버측 카카오 REST — 현재 코드 미참조(데드) | ❌ **빈 문자열** |
| `NEXT_PUBLIC_APP_URL` | 클라(NEXT_PUBLIC) | 초대링크/OG 절대URL/카카오 Feed link 기준 | ⚠️ 설정되었으나 `http://localhost:3000`(운영 도메인 미반영) |
| `STORIGE_API_URL` | 서버 전용 | Storige REST 베이스(기본 `api.papascompany.co.kr/api`) | ✅ 설정 |
| `STORIGE_API_KEY` | **서버 전용** | Storige `X-API-Key`(NEXT_PUBLIC 절대 금지) | ✅ 설정(실값 — 평문 로컬 존재) |
| `NEXT_PUBLIC_STORIGE_EDITOR_URL` | 클라(NEXT_PUBLIC) | iframe 임베드 origin(기본 `editor.papascompany.co.kr`) | ✅ 설정 |
| `STORIGE_TEMPLATE_SET_ID` | 서버 전용 | 편집세션 templateSet(미설정 시 dev 폴백 `a2cc2939`) | ❌ 미설정(.env.local에 없음, 코드 폴백 사용) |
| `STORIGE_PHOTOBOOK_PAGE_W_MM` | 서버 전용 | 자동배치 가로 판형(mm) | ✅ 설정 `210` |
| `STORIGE_PHOTOBOOK_PAGE_H_MM` | 서버 전용 | 자동배치 세로 판형(mm) | ⚠️ 설정 `297`(A4 검증값) — **코드 기본 210(정사각)과 불일치, env 우선 적용** |

**상태 요약**:
- ✅ 설정(로컬): Supabase 3종(데모 키), Storige `API_URL`/`API_KEY`/`EDITOR_URL`, `PAGE_W_MM`/`PAGE_H_MM`.
- ❌ 빈값: `NEXT_PUBLIC_KAKAO_JS_KEY`, `KAKAO_REST_API_KEY`(둘 다 카카오 로그인/공유 실동작 불가).
- ⚠️ 운영 미반영: `NEXT_PUBLIC_APP_URL`(localhost), `STORIGE_PHOTOBOOK_PAGE_H_MM`(297 vs 코드 210).
- ❌ 미설정(선택): `STORIGE_TEMPLATE_SET_ID`(코드 폴백 동작).
- **프로덕션 환경변수는 어디에도 설정 안 됨**(Vercel 미연결). `.gitignore:34`가 `.env*` 전체 제외 → git 추적 안 됨.

---

## 5. 보안

**키 격리 (서버 전용)** — 양호
- `SUPABASE_SERVICE_ROLE_KEY`/`STORIGE_API_KEY`는 `storigeServer.ts`(서버 전용 모듈, `'use client'` 없음, 상단 'NEXT_PUBLIC 금지' 경고) + webhook route에서만 참조 → **클라이언트 번들 노출 0**. 브라우저는 `/api/storige/*` 프록시만 호출(`storigeClient.ts`는 키 미참조).
- `STORIGE_API_KEY` 미설정 시 `getStorigeConfig()→null→503 STORIGE_NOT_CONFIGURED`. service role 미설정 시 null 반환 후 graceful degradation.

**노출 위험 / 정합성**
- ⚠️ `.env.local`에 실 형태 `STORIGE_API_KEY`(서버 전용)가 평문 로컬 존재. `.gitignore`로 git 추적 안 되나 유출 시 회전 필요. 로컬 dev가 **프로덕션 Storige 백엔드를 직접 호출**(CTO §3 부가 인지).
- ⚠️ Supabase ANON/SERVICE_ROLE은 로컬 공개 데모 JWT('프로덕션 사용 금지' 명시) → 배포 시 프로덕션 키로 전량 교체 필수.
- ⚠️ `NEXT_PUBLIC_KAKAO_JS_KEY`는 설계상 클라이언트 공개 키 → 브라우저 노출 정상, 카카오 플랫폼 도메인 화이트리스트로 도용 방어 필요(현재 빈값).
- ⚠️ Redirect URI 정합성: MEMORY 기록(`/auth/callback/kakao`) ≠ 코드(`/auth/callback`) — 운영 등록 시 코드 기준 일치 필요(보안 결함 아님, 설정 주의).

**CORS / Mixed Content**
- ⚠️ **CSP 미설정**: `next.config.ts`·src 전체에 `headers()`/CSP/`frame-ancestors`/`X-Frame-Options` 없음(직접 확인). 외부 CDN(jsdelivr/kakaocdn)·Storige iframe이 차단 없이 로드되나 운영 강화 시 화이트리스트 필요. Storige iframe도 sandbox 없이 `allow=clipboard-write`만.
- ⚠️ **SRI 비대칭**: 카카오 SDK는 `sha384` 적용, Pretendard CDN `<link>`는 SRI 없음 — 폰트 공급망 변조 무방비.
- ⚠️ **Mixed Content(로컬 한정)**: `.env.local`의 Supabase URL이 `http://127.0.0.1`이라 Storige HTTPS 편집기 iframe에서 사진 미렌더(MEMORY 명시) → 프로덕션 https Supabase URL에서 해결 예정.
- ✅ Cross-origin canvas: `autoLayout.makePhotoImage`가 `crossOrigin:anonymous` 올바르게 선언(toDataURL taint 방지). 실 성공은 Supabase Storage CORS 헤더 의존.

**RLS (Row Level Security)**
- ✅ 006 마이그레이션으로 전 테이블 RLS 활성 + 정책. 모든 Storige 라우트가 주문 조회 시 `.eq('user_id', user.id)` 이중 검증.
- ⚠️ **Storage RLS 비대칭**: `storage.objects` `photos_user_select`(007)가 `bucket_id='photos'`이면 authenticated 전체 select 허용(객체 단위 소유자 검증 없음) → 실제 접근제어는 `createSignedUrl`에 의존. 객체 경로를 알면 authenticated 사용자가 타인 photos 원본 직접 접근 가능 구조(서명 발급은 anon 차단).
- ⚠️ **인쇄용(print_path) 공개 노출**: 공개 `thumbnails` 버킷 + `getPublicUrl`(만료없음)로 3600px 원본 노출 — Storige externalPhotos 요건상 불가피한 의도된 트레이드오프(주석 명시).
- ⚠️ **Realtime publication 미버전관리**: `ALTER PUBLICATION supabase_realtime ADD TABLE`이 마이그레이션에 없음 → 대시보드 수동 설정 의존(재현성 리스크).
- ⚠️ **editor_resources 쓰기 정책 부재**(006 TODO) → service_role/대시보드로만 주입.
- ✅ **webhook 서명검증 약함을 인지**: `Base64(identifier:event:timestamp)`로 위조 가능(코드 주석 명시). HTTPS + Storige SSRF allowlist로 보완. `X-Storige-Retry:1`은 서명 누락 허용 → **운영 시 Storige callback allowlist 등록이 사실상 1차 방어선**.
- ✅ **postMessage 이중 방어**: 수신 `e.origin===편집기 origin` + `msg.source==='storige-editor'`, 발신 targetOrigin 고정(`'*'` 금지), `buildEmbedUrl` parentOrigin 필수.
- ✅ **오픈 리다이렉트 방어**: 3개 진입점 일관 검증(좋은 패턴).

---

## 6. 운영 오픈 전 미결 (외부 의존 블로커)

> 모두 코드가 아닌 **인프라/결정/외부 등록** 사항. 코드 레벨은 대부분 완료.

### 6.1 도메인 확정 (최상위 종속 — 다수 연동 차단)
- `NEXT_PUBLIC_APP_URL`이 현재 `localhost:3000`. 운영 도메인(`sharesnap.app`은 docs에만 존재, 코드/env 미반영) 확정·주입 전까지:
  - 카카오 공유 링크 / OAuth 리디렉트(constants.ts→kakao.ts)가 localhost를 가리킴.
  - Storige webhook `callbackUrl`이 localhost면 SSRF로 수신 불가.
  - `/join` OG 이미지 폴백이 localhost → 카카오 스크래퍼 못 읽음.
  - TWA `assetlinks` 도메인 바인딩 불가.

### 6.2 Storige (papascompany)
- **실 templateSet 발급/시드**: `docs/storige-seed-210x210-photobook.sql` 시드 적용(등록 API는 X-API-Key 401, Admin JWT 전용) → **Storige 운영자 작업**. 미설정 시 `STORIGE_TEMPLATE_SET_ID` 코드 폴백(dev `a2cc2939`).
- **webhook 공개 URL**: 운영 공개 도메인 확정 후 Storige `uploadCallbackUrl` SSRF allowlist 등록 → 실 webhook E2E 검증(현재 mock).
- **iframe frame-ancestors / CORS**: 운영 측 `frame-ancestors`에 ShareSnap 도메인 등록(localhost:3000/`*.vercel.app`은 이미 허용). Supabase Storage CORS 헤더(cross-origin canvas).
- **판형 정합성**: `STORIGE_PHOTOBOOK_PAGE_H_MM=297`(현재 A4) vs 코드 기본 210(정사각) — 운영 판형 확정 후 env 정렬.

### 6.3 카카오 (Developers + Supabase Provider)
- 카카오 Developers 앱 등록 → `NEXT_PUBLIC_KAKAO_JS_KEY`(JS키)·REST 키 발급.
- Supabase 대시보드 Auth>Providers>Kakao 키 등록(`config.toml`엔 `[auth.external.kakao]` 부재 → 대시보드 전적 의존).
- Supabase Auth URL Configuration Redirect URLs에 `{도메인}/auth/callback?*` 글롭 등록.
- 카카오 플랫폼 도메인 화이트리스트(JS 키 도용 방어), 카카오 비즈 채널(공유 이미지 200×200 요건).
- **Redirect URI 경로 일치**: 운영 등록은 코드 경로 `/auth/callback`(MEMORY의 `/auth/callback/kakao` 아님).

### 6.4 Supabase 프로젝트
- 프로덕션 Supabase 프로젝트 생성 → `NEXT_PUBLIC_SUPABASE_URL`(`*.supabase.co`) + ANON/SERVICE_ROLE 프로덕션 키 주입(로컬 데모 키 교체).
- 마이그레이션 001~009 운영 적용 + `database.ts` `gen types` 재생성 권장.
- **Realtime publication 수동 활성화**(`supabase_realtime`에 messages/photos 등록 — 마이그레이션에 없음).
- 운영 SMTP 설정(`[auth.email.smtp]` 주석 해제) + 이메일 템플릿 `ConfirmationURL→/auth/confirm` 매핑(Magic Link 실발송).

### 6.5 Vercel 배포
- Git remote 연결 + Vercel 프로젝트 링크(현재 둘 다 부재). 프로덕션 환경변수 12개 주입.

### 6.6 모바일(후행 트랙)
- **TWA**: `public/.well-known/assetlinks.json` 생성(SHA-256 지문, Play App Signing 후) + **`proxy.ts` matcher에 `.well-known` 제외 추가**(현재 미반영 — 검증 차단요인). maskable 아이콘 2종 생성.
- **iOS**: `@capacitor/*` 설치, Sign in with Apple, `apple-app-site-association`, `/auth/native-callback`.
- **Web Push**: VAPID 발급 + `push_subscriptions` 테이블 + `sw.js` push 핸들러 구현(현재 주석 골격).

---

> **인벤토리 요약**: 외부 호스트 5개(Supabase / Storige `api`·`editor.papascompany.co.kr` / kakaocdn / jsdelivr / Vercel). 코드 레벨 연동은 대부분 ✅/⚠️(완료·검증)이며, 운영 오픈 차단요인은 전부 **인프라·외부 등록·도메인 확정**으로 코드 외부에 있음. 최상위 블로커는 **운영 도메인 확정**(카카오·Storige webhook·OG·TWA 다수 종속).
