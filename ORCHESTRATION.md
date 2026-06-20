# ORCHESTRATION.md — ShareSnap 오케스트레이션 파이프라인

> **Phase별 상세 태스크, 파일 목록, 완료 조건, 자동 검증 명령어를 정의합니다.**
> Claude Code가 각 Phase를 자동으로 순차 실행할 수 있도록 설계되었습니다.

---

## 파이프라인 실행 규칙

### 1. Phase 진행 규칙
```
1. Phase 시작 전: STATUS.md에서 현재 Phase 확인
2. Phase 내 태스크를 T{N}.1부터 순서대로 실행
3. 각 태스크 완료 후: STATUS.md 체크박스 업데이트
4. Phase 전체 완료 후: 검증 명령어 실행
5. 검증 통과 시: STATUS.md의 CURRENT_PHASE를 다음으로 변경
6. 검증 실패 시: 에러 수정 후 재검증
```

### 2. 태스크 실행 규칙
```
1. 태스크 시작 시 관련 파일 목록 확인
2. 파일을 하나씩 생성/수정
3. 파일 생성 후 즉시 tsc --noEmit으로 타입 검사
4. 모든 파일 완료 후 npm run build로 빌드 검사
5. 검사 통과 시 STATUS.md 업데이트 + git commit
```

### 3. 에러 처리 규칙
```
1. 타입 에러: 해당 파일의 타입 수정 → 재검사
2. 빌드 에러: 에러 메시지 분석 → 수정 → 재빌드
3. SSR 에러: Fabric.js dynamic import 확인
4. 3회 이상 실패: MEMORY.md에 이슈 기록 + STATUS.md에 블로커 등록
```

---

## Phase 1: Foundation (M0 + M1)

### T1.1 — 프로젝트 초기화

**실행 명령어:**
```bash
npx create-next-app@latest sharesnap --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd sharesnap
npm install @supabase/supabase-js @supabase/ssr zustand
npm install -D @types/node
npx shadcn@latest init -d
npx shadcn@latest add button input card dialog toast avatar dropdown-menu sheet tabs scroll-area separator badge
```

**디렉토리 생성:**
```bash
mkdir -p src/modules/{shared/{components,hooks,lib/supabase,types},auth/{components,hooks,services},room/{components,hooks,services},chat/{components,hooks,services},photo/{components,hooks,services},editor/{components/{toolbar,panels,mobile},hooks,services,utils},photobook/{components,hooks,services},print-order/{components,hooks,services},pdf/{generators,utils},admin/{components,services}}
mkdir -p supabase/migrations
mkdir -p docs
mkdir -p public/icons
```

**PWA 설정 파일:**
```
생성: public/manifest.json
내용: name, short_name, icons, start_url, display: standalone, theme_color
```

**검증:**
```bash
npm run build  # 빌드 성공 확인
```

---

### T1.2 — Supabase 클라이언트 설정

**생성할 파일:**
```
src/modules/shared/lib/supabase/client.ts     ← createBrowserClient
src/modules/shared/lib/supabase/server.ts      ← createServerClient (cookies)
src/modules/shared/lib/supabase/middleware.ts   ← createServerClient (request/response)
src/middleware.ts                               ← Auth 미들웨어 (세션 갱신)
.env.local.example                              ← 환경변수 템플릿
```

**핵심 코드 패턴:**
```typescript
// client.ts
import { createBrowserClient } from '@supabase/ssr';
export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

// server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
export const createClient = async () => {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: (cookiesToSet) => { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } } }
  );
};
```

**검증:**
```bash
npx tsc --noEmit
```

---

### T1.3 — 공용 모듈 (M0)

**생성할 파일 (순서대로):**
```
1. src/modules/shared/types/global.ts          ← 전체 타입 정의
2. src/modules/shared/types/database.ts        ← DB 테이블 타입 (Supabase)
3. src/modules/shared/lib/constants.ts         ← 상수 (BOOK_SIZES, ROLES 등)
4. src/modules/shared/lib/utils.ts             ← cn(), formatDate() 등
5. src/modules/editor/utils/dpiConverter.ts    ← mmToPixels, getPixelSize
6. src/modules/editor/types.ts                 ← 편집기 타입 (BookSize, FabricJSON 등)
7. src/modules/shared/components/Layout.tsx     ← 기본 레이아웃
8. src/modules/shared/components/MobileLayout.tsx ← 모바일 하단 네비게이션
9. src/modules/shared/components/ErrorBoundary.tsx
10. src/modules/shared/components/LoadingSpinner.tsx
11. src/modules/shared/hooks/useToast.ts        ← shadcn toast 래퍼
12. src/app/layout.tsx                          ← RootLayout 업데이트
13. src/app/page.tsx                            ← 홈페이지 (임시)
```

**타입 정의 핵심:**
```typescript
// global.ts에 포함할 타입들
export type BookSize = 'A4' | 'A5' | '210x210';
export type RoomRole = 'owner' | 'admin' | 'member';
export type OrderStatus = 'draft' | 'editing' | 'confirmed' | 'generating_pdf' | 'pdf_ready' | 'ordered' | 'paid' | 'printing' | 'shipped' | 'delivered';
export type MessageType = 'text' | 'photo' | 'system';
export type ResourceCategory = 'font' | 'clipart' | 'background' | 'template';
```

**검증:**
```bash
npx tsc --noEmit
npm run build
```

---

### T1.4 — DB 마이그레이션

**생성할 파일 (순서대로):**
```
supabase/migrations/001_create_rooms.sql
  → rooms, room_members 테이블 + share_code UNIQUE + GIN 인덱스

supabase/migrations/002_create_messages_photos.sql
  → messages, photos, photo_comments 테이블 + created_at 인덱스

supabase/migrations/003_create_photobook.sql
  → photobook_orders, photobook_pages 테이블

supabase/migrations/004_create_print_orders.sql
  → print_orders, print_order_items 테이블

supabase/migrations/005_create_editor_resources.sql
  → editor_resources 테이블 + category/is_active 인덱스

supabase/migrations/006_create_rls_policies.sql
  → 전체 RLS 정책 (멤버만 읽기/쓰기, 소유자만 삭제)

supabase/migrations/007_create_storage_buckets.sql
  → Storage 버킷 생성 + 정책 스크립트
```

**RLS 핵심 정책:**
```sql
-- rooms: 멤버만 조회 가능
CREATE POLICY "room_members_select" ON rooms FOR SELECT
  USING (id IN (SELECT room_id FROM room_members WHERE user_id = auth.uid()));

-- photos: 방 멤버만 업로드/조회
CREATE POLICY "photos_insert" ON photos FOR INSERT
  WITH CHECK (room_id IN (SELECT room_id FROM room_members WHERE user_id = auth.uid()));
```

**검증:**
```bash
# Supabase CLI가 있는 경우
supabase db push
# 또는 Supabase Dashboard에서 SQL 실행
```

---

### T1.5 — 인증 모듈 (M1)

**생성할 파일 (순서대로):**
```
1. src/modules/auth/types.ts                    ← AuthUser, AuthState 타입
2. src/modules/auth/services/authService.ts     ← 로그인/로그아웃/세션 관리
3. src/modules/auth/hooks/useAuth.ts            ← 인증 상태 훅
4. src/modules/auth/components/KakaoLoginButton.tsx ← 카카오 로그인 버튼
5. src/modules/auth/components/LoginPage.tsx     ← 로그인 페이지 전체
6. src/modules/auth/components/AuthGuard.tsx     ← 인증 필요 페이지 래퍼
7. src/app/(auth)/login/page.tsx                ← 로그인 라우트
8. src/app/(auth)/layout.tsx                    ← 인증 레이아웃 (심플)
9. src/app/auth/callback/route.ts               ← OAuth 콜백 핸들러
10. src/app/(main)/layout.tsx                   ← 메인 레이아웃 (AuthGuard 적용)
11. src/app/(main)/page.tsx                     ← 메인 홈 (방 목록 placeholder)
```

**카카오 로그인 핵심:**
```typescript
// authService.ts
export const signInWithKakao = async () => {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  return { data, error };
};
```

**검증:**
```bash
npx tsc --noEmit
npm run build
# 브라우저에서 /login 페이지 접근 → 로그인 버튼 렌더링 확인
```

---

### T1.6 — Phase 1 최종 검증

```bash
# 1. 타입 검사
npx tsc --noEmit

# 2. 린트 검사
npm run lint

# 3. 빌드 검사
npm run build

# 4. 개발 서버 실행 및 수동 확인
npm run dev
# → http://localhost:3000 접속
# → /login 페이지 렌더링 확인
# → Layout, ErrorBoundary 동작 확인

# 5. 커밋
git add .
git commit -m "feat: Phase 1 완료 — 프로젝트 셋업, 인증, DB 스키마"
```

**Phase 1 → Phase 2 전환 조건 (모두 충족해야 함):**
```
✅ npm run build 성공
✅ Supabase 연결 확인 (클라이언트/서버)
✅ DB 마이그레이션 전체 적용
✅ 로그인 페이지 렌더링
✅ Layout + ErrorBoundary 동작
✅ 모든 모듈 디렉토리 구조 생성
```

---

## Phase 2: Room & Chat (M2 + M3)

### T2.1 — 공유방 모듈 (M2)
```
생성 파일:
  src/modules/room/types.ts
  src/modules/room/services/roomService.ts
  src/modules/room/hooks/useRoom.ts
  src/modules/room/hooks/useRoomMembers.ts
  src/modules/room/components/RoomCreate.tsx
  src/modules/room/components/RoomList.tsx
  src/modules/room/components/RoomHeader.tsx
  src/modules/room/components/InviteLink.tsx
  src/modules/room/components/JoinRoom.tsx
  src/app/(main)/rooms/page.tsx
  src/app/(main)/rooms/create/page.tsx
  src/app/(main)/rooms/[id]/page.tsx
  src/app/(main)/rooms/[id]/layout.tsx
  src/app/join/[shareCode]/page.tsx
  src/app/api/rooms/route.ts
  src/app/api/rooms/[id]/route.ts
  src/app/api/rooms/join/[shareCode]/route.ts
```

### T2.2 — 채팅 모듈 (M3)
```
생성 파일:
  src/modules/chat/types.ts
  src/modules/chat/services/chatService.ts
  src/modules/chat/hooks/useChat.ts
  src/modules/chat/hooks/useRealtime.ts
  src/modules/chat/components/ChatRoom.tsx
  src/modules/chat/components/MessageList.tsx
  src/modules/chat/components/MessageInput.tsx
  src/modules/chat/components/PhotoMessage.tsx
  src/modules/chat/components/SystemMessage.tsx
```

### T2.3 — 카카오톡 공유 연동
```
생성 파일:
  src/modules/shared/lib/kakao.ts              ← Kakao SDK 초기화
  src/modules/room/components/KakaoShareButton.tsx ← 초대 공유 버튼
  src/app/layout.tsx 수정                       ← Kakao SDK 스크립트 추가
```

### T2.4 — UI 스타일링
```
채팅방 UI 모바일 최적화
방 목록 카드형 레이아웃
하단 입력창 고정
```

**Phase 2 검증:**
```bash
npx tsc --noEmit && npm run build
# 방 생성 → 초대 링크 생성 → 링크로 참여 → 실시간 메시지 송수신
```

---

## Phase 3: Photo + Design + 참여 퍼널 (M4 확장판)

> 전략 문서 3종(docs/ux-flows.md, docs/design-system.md, docs/mobile-deployment.md)을 반영한 개정판.
> 구현 전 반드시 해당 문서의 관련 섹션을 읽을 것.
> 문서 충돌 시 우선순위: 시각/접근성=design-system, 인프라/메타=mobile-deployment, 퍼널=ux-flows.

### T3.0 — 디자인 파운데이션 (선행 — 다른 태스크보다 먼저)
```
근거 문서: docs/design-system.md (전체)
수정 파일:
  src/app/globals.css            ← 전체 교체 (문서 1장: OKLCH 토큰 light/dark + @theme + 모션 + @utility)
  src/app/layout.tsx             ← Pretendard CDN, next-themes ThemeProvider, themeColor 교정(코랄/웜블랙), viewportFit:cover, maximumScale:5
  src/modules/shared/components/MobileLayout.tsx ← lucide 아이콘, 글래스 네비, pb-safe
  src/modules/auth/components/KakaoLoginButton.tsx ← bg-kakao 토큰화, h-12
  src/modules/room/components/KakaoShareButton.tsx ← bg-kakao 토큰화
  src/modules/auth/components/LoginPage.tsx ← 그라데이션 히어로 + 바텀시트 구조 (5.1절)
  src/modules/room/components/RoomList.tsx ← 커버 카드 + 스켈레톤 (5.2절)
  src/modules/chat/components/MessageList.tsx ← 새 버블 스타일 (4.4절)
  public/icons/icon.svg + public/manifest.json 교정 (theme_color 코랄)
의존성 추가: next-themes
주의: (main) template.tsx 전환 모션은 채팅방 제외가 라우트 그룹으로 불가 → pathname 분기 클라이언트 template
```

### T3.1 — 참여 퍼널 P0 수정 (카카오 UX)
```
근거 문서: docs/ux-flows.md (1~3장)
생성/수정 파일:
  supabase/migrations/008_join_funnel.sql   ← get_room_preview + join_room_via_share_code (security definer, anon/authenticated grant 분리)
  src/modules/auth/services/authService.ts  ← signInWithKakao(next?), signInWithMagicLink(email, next?)
  src/app/auth/callback/route.ts            ← next 오픈 리다이렉트 검증 (startsWith("/") && !startsWith("//"))
  src/modules/auth/components/KakaoLoginButton.tsx ← next prop
  src/app/(auth)/login/page.tsx + LoginPage.tsx ← searchParams.next 전달, isKakaoInApp() 분기로 이메일 폼 숨김
  src/app/join/[shareCode]/page.tsx         ← SSR 미리보기 + 4분기(비로그인/auto=1/기존멤버/수동) + generateMetadata(OG)
  src/modules/room/components/RoomPreview.tsx ← 신규 (JoinRoom.tsx 대체)
  src/modules/room/services/roomService.ts  ← RPC 래퍼 (getRoomPreview/joinRoomViaShareCode)
  src/modules/shared/utils/browserEnv.ts    ← isKakaoInApp()/isIos()/openExternalBrowser()
  src/modules/shared/lib/kakao.ts           ← buildFeedTemplate(variant) 3종 (invite/newPhotos/photobook)
주의: 미리보기에 방 UUID 미노출, 커버는 public thumbnails 버킷 URL만 (signed URL은 만료 후 OG 깨짐)
```

### T3.2 — 사진 모듈 코어 (M4)
```
근거 문서: docs/dev-plan.md M4 + docs/mobile-deployment.md (photoPickerService)
생성 파일:
  src/modules/photo/types.ts
  src/modules/photo/services/photoService.ts     ← 업로드(Storage+DB), 목록, 삭제, 포토북 토글, 코멘트
  src/modules/photo/services/imageProcessor.ts   ← 클라이언트 리사이즈(썸네일 400px/중간 1280px), EXIF 촬영일
  src/modules/photo/services/photoPickerService.ts ← 촬영/앨범 다중선택 추상화 (Capacitor 분기 지점)
  src/modules/photo/hooks/usePhotos.ts           ← 목록 + Realtime 갱신
  src/modules/photo/hooks/usePhotoUpload.ts      ← 큐/진행률/에러 재시도
  src/modules/photo/hooks/usePhotoComments.ts
경로 규칙: photos/{userId}/{roomId}/{uuid}.jpg, thumbnails/{userId}/{roomId}/{uuid}.jpg (RLS가 1번째 폴더=uid 검사)
```

### T3.3 — 갤러리 UI + 코멘트
```
근거 문서: docs/design-system.md (5.4 갤러리, 5.5 뷰어, 4.7 엠티 스테이트)
생성/수정 파일:
  src/modules/photo/components/PhotoUploader.tsx   ← FAB + 진행률
  src/modules/photo/components/PhotoGrid.tsx       ← grid-cols-3 gap-0.5
  src/modules/photo/components/PhotoTimeline.tsx   ← sticky 날짜 그룹
  src/modules/photo/components/PhotoViewer.tsx     ← fixed inset-0 bg-black 몰입형 + 스와이프
  src/modules/photo/components/PhotoComments.tsx   ← 바텀시트
  src/app/(main)/rooms/[id]/photos/page.tsx        ← 탭(그리드/타임라인) + 업로더
  src/modules/chat/components/PhotoMessage.tsx     ← 실제 썸네일 연동 (placeholder 교체)
  src/modules/room/components/RoomHeader.tsx       ← 사진 갤러리 진입 버튼
  업로드 완료 후 "카톡방에 알리기" (buildFeedTemplate('newPhotos'))
```

### T3.4 — PWA 스캐폴딩
```
근거 문서: docs/mobile-deployment.md (2장, 6장)
생성/수정 파일:
  public/sw.js                    ← 수동 SW (내비 network-first + /offline 폴백, /_next/static cache-first, Supabase 제외, CACHE_VERSION 상수)
  src/modules/shared/components/ServiceWorkerRegister.tsx ← 'use client' 등록
  src/app/offline/page.tsx        ← 오프라인 폴백
  src/app/layout.tsx              ← ServiceWorkerRegister 마운트, apple-touch-icon
  public/manifest.json            ← id:"/", start_url:/rooms, purpose 분리, display_override
  src/proxy.ts                    ← matcher에 offline, .well-known, sw.js 제외
  public/icons/                   ← icon.svg 마스터 (+PNG 파생은 외부 작업으로 기록)
```

### T3.5 — Phase 3 검증
```
npx tsc --noEmit && npm run lint && npm run build
완료 조건:
  ✅ 빌드 통과 + 신규 라우트(photos, offline) 생성
  ✅ 디자인 토큰 적용 (코랄 primary, 다크모드 클래스 전환)
  ✅ /join 미리보기 SSR (RPC 마이그레이션은 외부 적용 후 런타임 검증)
  ⚠ 실기기 E2E(카톡 인앱 → 로그인 → next 복귀)는 .env + 도메인 확정 후 — Supabase redirect allowlist의 쿼리 포함 redirectTo 매칭 실측 필수
```

---

## Phase 4~7 (요약)

### Phase 4: Editor ⭐ (M5)
```
핵심: Fabric.js 캔버스(dynamic import), 텍스트/이미지/도형/클립아트/배경 편집,
      모바일 터치(핀치줌), Undo/Redo, JSON 직렬화, 서버 리소스 로드
검증: SSR 에러 없음 + 편집 도구 동작 + 모바일 터치 + 저장/불러오기
위험: SSR 충돌 — 반드시 dynamic import 사용
```

### Phase 5: Photobook + PDF (M6 + M8)
```
핵심: 사이즈 선택(A4/A5/210x210), 사진+코멘트 자동 레이아웃,
      표지/내지 편집기 연동, 미리보기, 300dpi PDF 서버 생성
검증: 포토북 생성 → 자동편집 → 표지 커스텀 → PDF 다운로드
```

### Phase 6: Orders & Admin (M7 + M9)
```
핵심: 인화 주문 폼, 포토북 주문, 관리자 리소스 CRUD, 주문 대시보드
검증: 주문 생성 → 주문 목록 → 관리자 리소스 등록
```

### Phase 7: Integration & Deploy (모바일 패키징 포함)
```
핵심: E2E 테스트 (Playwright), 성능 최적화, Vercel 배포, 모니터링
모바일 (docs/mobile-deployment.md 4~5장):
  - Android: Bubblewrap TWA 패키징 → assetlinks.json(/.well-known) → Play Console(조직 계정) 등록
  - iOS: Capacitor remote URL 하이브리드 + Sign in with Apple(Supabase Provider, 의무) + 네이티브 카메라/APNs/Share Extension → App Store
  - 웹푸시(Phase 5~6 구현분) 연동 확인, push_subscriptions 마이그레이션(009+) 선행
  - SW CACHE_VERSION 증가를 배포 체크리스트에 명문화
검증: 전체 플로우 E2E 통과 + Lighthouse 성능 + Chrome DevTools Manifest 패널 + bubblewrap validate + 프로덕션 배포
```

---

## 자동 파이프라인 명령어 (전체 Phase 순차 실행)

```bash
# Phase 1 실행
echo "=== Phase 1: Foundation ===" && \
  # T1.1~T1.6 실행 후
  npx tsc --noEmit && npm run build && \
  echo "✅ Phase 1 완료" && \

# Phase 2 실행
echo "=== Phase 2: Room & Chat ===" && \
  # T2.1~T2.4 실행 후
  npx tsc --noEmit && npm run build && \
  echo "✅ Phase 2 완료" && \

# ... Phase 3~7 동일 패턴

echo "🎉 전체 파이프라인 완료"
```

---

> **각 Phase를 시작할 때:**
> 1. 이 파일에서 해당 Phase의 생성할 파일 목록 확인
> 2. 순서대로 파일 생성
> 3. 중간중간 `npx tsc --noEmit`으로 타입 검사
> 4. Phase 완료 시 `npm run build`로 전체 빌드 검사
> 5. STATUS.md 업데이트
