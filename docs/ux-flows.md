# ux-flows.md — 카카오톡 중심 참여·공유 UX 설계

> **목표: "카톡 링크 받은 사람이 3탭 이내에 사진을 보고 있어야 한다."**
> 탭 1 = 카톡 메시지의 버튼, 탭 2 = 미리보기 화면의 "카카오로 시작하기", 탭 3 = 카카오 동의 화면의 "동의하고 계속하기".
> 재방문자(이미 동의 완료)는 동의 화면이 생략되어 **2탭**에 입장한다.
>
> 작성일: 2026-06-12 / 기준 코드: Phase 2 완료 시점 (`src/app/join/[shareCode]/page.tsx` 외)

---

## 0. 요약 — 현재 퍼널은 두 곳에서 끊겨 있다 (P0)

코드 검증 결과, 현재 구현은 "초대받은 신규 사용자"에 대해 **동작하지 않는다**. 설계 개선 이전에 결함 수정이 선행되어야 한다.

| # | 결함 | 위치 | 증상 |
|---|------|------|------|
| **P0-1** | RLS `rooms_select`가 `is_room_member(id) or owner_id = auth.uid()` 만 허용 → **로그인한 비멤버조차** `share_code`로 방 조회 불가 | `supabase/migrations/006_create_rls_policies.sql:38-43` + `src/modules/room/services/roomService.ts:67-78` (`getRoomByShareCode`) | RLS는 에러 없이 행을 필터링하므로 `maybeSingle()`이 `null` 반환 → `JoinRoom.tsx:60`이 유효한 코드인데도 **"잘못된 초대 링크"** 표시. `joinRoomByShareCode`(roomService.ts:145)도 같은 함수를 호출하므로 참여 자체가 불가능 |
| **P0-2** | `signInWithKakao`가 `next`를 전달하지 않음 → 로그인 후 무조건 `/rooms`로 이탈, 초대 맥락 소실 | `src/modules/auth/services/authService.ts:7-18` (redirectTo가 고정 `/auth/callback`), `src/app/auth/callback/route.ts:8`은 `next`를 읽도록 준비돼 있으나 아무도 넣어주지 않음 | `/join/[shareCode]` → `/login?next=...` 리다이렉트까지는 정상이나, `LoginPage.tsx`·`KakaoLoginButton.tsx` 모두 `next`를 읽지도 넘기지도 않음 |

해결 수단은 §1.3 (security definer RPC 2종) + §3 (next 보존 스펙)에 정의한다.

---

## 1. 참여 퍼널 분석

### 1.1 단계별 이탈 지점 — 현재 vs 개선

```
[카톡 메시지 수신] → [인앱 브라우저 오픈] → [방 미리보기] → [로그인] → [방 입장] → [첫 사진 열람/업로드]
```

| 단계 | 현재 동작 | 이탈 요인 | 개선안 |
|------|-----------|-----------|--------|
| ① 카톡 메시지 탭 | Feed 템플릿 버튼 "공유방 참여" → `/join/{code}` | 메시지가 generic (아이콘 이미지, 밋밋한 문구) → 탭 동기 부족 | §4 템플릿 개편: 커버 사진 + "사진 N장 · 멤버 N명" + 버튼 "사진 보러 가기" |
| ② 인앱 브라우저 오픈 | KakaoTalk in-app browser(WebView)에서 열림 | 느린 첫 로드, 낯선 화면 | `/join`을 서버 컴포넌트 SSR로 즉시 렌더 (현재는 클라이언트 fetch 스피너), LCP < 2.5s 목표 |
| ③ 방 미리보기 | **없음.** 비로그인 시 즉시 `/login` redirect (`join/[shareCode]/page.tsx:20-22`) | "정체불명 서비스가 다짜고짜 로그인 요구" — 퍼널 최대 이탈 지점. 신뢰 형성 전 권한 요구 | **비로그인 미리보기 도입**: 방 이름·커버·멤버 수·사진 수를 먼저 보여주고 나서 "카카오로 시작하기" CTA. anon은 RLS로 rooms 조회 불가 → **`get_room_preview(share_code)` security definer RPC 필수** (§1.3) |
| ④ 로그인 | 카카오 OAuth. 단 P0-2로 인해 로그인 후 `/rooms`로 이탈 | 동의 항목 과다 시 이탈, next 소실 | 동의 항목은 닉네임(필수)+프로필사진(선택)만. `next` 보존 (§3). 카카오 인앱에서는 카카오계정 세션이 공유되어 사실상 원클릭 (§2.1) |
| ⑤ 방 입장 | P0-1로 인해 "잘못된 초대 링크" → **퍼널 사망** | 추가 "참여하기" 버튼 탭 요구 | `join_room_via_share_code` RPC (§1.3) + **자동 입장**: 미리보기 CTA가 곧 참여 의사이므로 로그인 복귀 시 `?auto=1`로 자동 join (§1.4) |
| ⑥ 첫 사진 열람 | Phase 3 미구현 | 빈 화면이면 이탈 | 입장 직후 갤러리 탭이 기본. 사진 0장이면 "첫 사진을 올려보세요" 업로드 CTA empty state |

### 1.2 탭 수 검증 (개선 후)

| 사용자 | 탭 시퀀스 | 탭 수 |
|--------|-----------|:---:|
| 신규 (카카오 최초 동의) | 카톡 버튼 → "카카오로 시작하기" → 카카오 동의 "계속하기" → (자동 join) 갤러리 | **3** |
| 재방문 (동의 완료, 세션 만료) | 카톡 버튼 → "카카오로 시작하기" → (동의 생략, 자동 join) 갤러리 | **2** |
| 재방문 (인앱 브라우저에 세션 살아있음) | 카톡 버튼 → (이미 멤버면 즉시 방으로 redirect) | **1** |

세 번째 케이스가 중요하다: 재방문 경로 대부분이 "카톡방에 떠 있는 기존 초대 링크 재탭"이며, 카카오톡 인앱 브라우저는 쿠키를 유지하므로(§2.3) **이미 멤버 + 세션 보유 시 `/join`에서 미리보기 없이 `/rooms/{id}`로 즉시 redirect**해야 한다.

### 1.3 마이그레이션 스펙 — `008_join_funnel.sql`

anon(비로그인)과 로그인한 비멤버 모두를 위한 security definer RPC 2종. **이것 없이는 §1.1의 ③④⑤가 모두 불가능하다.**

```sql
-- 008_join_funnel.sql
-- 참여 퍼널용 RPC: 비로그인 미리보기 + share_code 기반 참여

-- 1) 방 미리보기 (anon 허용 — share_code 자체가 비밀이므로 room id는 노출하지 않음)
create or replace function public.get_room_preview(p_share_code text)
returns table (
  name text,
  description text,
  cover_url text,
  member_count bigint,
  photo_count bigint,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.name,
    r.description,
    r.cover_url,
    (select count(*) from public.room_members m where m.room_id = r.id),
    (select count(*) from public.photos p where p.room_id = r.id),
    r.created_at
  from public.rooms r
  where r.share_code = p_share_code;
$$;

revoke all on function public.get_room_preview(text) from public;
grant execute on function public.get_room_preview(text) to anon, authenticated;

-- 2) share_code로 참여 (멱등 — 이미 멤버면 그냥 room id 반환)
create or replace function public.join_room_via_share_code(p_share_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_id uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select id into v_room_id
  from public.rooms
  where share_code = p_share_code;

  if v_room_id is null then
    raise exception 'INVALID_SHARE_CODE';
  end if;

  insert into public.room_members (room_id, user_id, role)
  values (v_room_id, auth.uid(), 'member')
  on conflict (room_id, user_id) do nothing;

  return v_room_id;
end;
$$;

revoke all on function public.join_room_via_share_code(text) from public;
grant execute on function public.join_room_via_share_code(text) to authenticated;
```

보안 메모:
- `share_code`는 8자 영숫자(`SHARE_CODE_LENGTH=8`, `src/modules/shared/lib/constants.ts:44`)로 약 2.8×10¹⁴ 조합 — 무차별 대입은 비현실적이나, `get_room_preview`가 anon에 열리므로 **추측 시도를 막기 위해 Vercel WAF rate limit 또는 Supabase 측 `pg_net` 없이도 가능한 간단한 지연**을 Phase 7에서 검토. MVP에서는 Vercel의 기본 DDoS 보호로 충분.
- 방 UUID는 미리보기에 포함하지 않는다(참여 성공 시에만 반환). RLS가 모든 테이블을 멤버십으로 보호하므로 노출돼도 직접 위험은 없으나 표면적을 줄인다.
- **`cover_url`은 반드시 공개 접근 가능한 URL이어야 한다** — anon 미리보기 화면과 카카오 OG 스크래퍼(§4.2)가 인증 없이 직접 로드한다. `007_create_storage_buckets.sql` 기준 `photos` 버킷은 private(signed URL, 만료됨)이고 `thumbnails` 버킷만 public이므로, Phase 3에서 방 커버를 설정할 때는 **`thumbnails` 버킷의 public URL을 `rooms.cover_url`에 저장**한다. signed URL 저장 금지(만료 후 미리보기·카톡 썸네일이 깨짐).
- 클라이언트 호출은 `roomService.ts`에 `getRoomPreview(shareCode)` / `joinRoomViaShareCode(shareCode)`로 추가하고, 기존 `getRoomByShareCode`·`joinRoomByShareCode`(roomService.ts:67, 145)는 이 RPC 호출로 교체한다. 직접 `rooms` select는 비멤버에게 영원히 실패하기 때문이다.

### 1.4 개선된 `/join/[shareCode]` 페이지 동작 스펙

`src/app/join/[shareCode]/page.tsx` (서버 컴포넌트)를 다음 분기로 재작성:

```
1. supabase.rpc("get_room_preview", { p_share_code }) 서버 호출
   └ 결과 없음 → "잘못된 초대 링크" 화면 (현재 JoinRoom의 not-found 분기 재사용)
2. 로그인 상태 확인 (supabase.auth.getUser())
   ├ 비로그인 → <RoomPreview> 렌더 (방이름/커버/멤버수/사진수 + KakaoLoginButton next={`/join/${shareCode}?auto=1`})
   ├ 로그인 + searchParams.auto === "1" → 서버에서 join_room_via_share_code RPC 실행 → redirect(`/rooms/${roomId}?welcome=1`)
   ├ 로그인 + 이미 멤버 → redirect(`/rooms/${roomId}`)   ← §1.2의 1탭 케이스
   └ 로그인 + 비멤버 (auto 없음, 예: 링크 직접 붙여넣기) → <RoomPreview joinable> ("참여하기" 버튼 1탭)
```

- 미들웨어는 이미 `/join`을 auth route로 통과시키므로(`src/modules/shared/lib/supabase/middleware.ts:34-37`) 변경 불필요.
- `RoomPreview`는 `src/modules/room/components/RoomPreview.tsx`로 신규 작성, 기존 `JoinRoom.tsx`는 폐기 또는 흡수.
- `?welcome=1`일 때 방 화면에서 sonner toast "'{방이름}'에 참여했어요 — 사진을 올려보세요!" 1회 표시.

---

## 2. 카카오톡 인앱 브라우저 대응

### 2.1 카카오 OAuth는 인앱 브라우저에서 "가장 잘" 동작한다

- 카카오톡 인앱 브라우저(UA에 `KAKAOTALK` 포함)는 **카카오 자신의 WebView**다. 카카오계정 세션이 공유되어 카카오 로그인 동의 화면이 곧바로 뜨고, 기존 동의자는 화면 자체가 생략된다. Google OAuth의 `disallowed_useragent` WebView 차단 같은 제약이 **없다**.
- 따라서 **참여 퍼널(①~⑥)은 인앱 브라우저 안에서 끝까지 처리하는 것이 정답**이다. 외부 브라우저 강제 오픈은 그 자체가 컨텍스트 스위칭 이탈 요인이므로 기본 동선에서 금지한다.

### 2.2 외부 브라우저 강제 오픈 — 필요한 경우에만

| 외부 브라우저가 필요한 상황 | 이유 |
|---|---|
| PWA 홈 화면 설치 | 인앱 WebView는 `beforeinstallprompt` 미발생(Android), iOS는 Safari에서만 "홈 화면에 추가" 가능 |
| 웹푸시 구독 | 인앱 WebView는 Push API 미지원 |
| Magic Link 로그인 | 메일 앱이 링크를 **기본 브라우저**로 열어 PKCE `code_verifier` 쿠키가 없는 컨텍스트에 떨어짐 → "both auth code and code verifier should be non-empty" 에러 (§2.3) |
| 수십 장 대용량 업로드 | 인앱 WebView 메모리 제약으로 탭 강제 종료 사례 — 권장 안내 수준 |

강제 오픈 방법 (iOS/Android 공통으로 카카오톡이 공식 지원하는 스킴):

```ts
// src/modules/shared/utils/browserEnv.ts (신규)
"use client";

/** 카카오톡 인앱 브라우저 여부 */
export function isKakaoInApp(): boolean {
  if (typeof navigator === "undefined") return false;
  return /KAKAOTALK/i.test(navigator.userAgent);
}

export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/** 현재 페이지(또는 지정 URL)를 기기 기본 브라우저로 강제 오픈 */
export function openExternalBrowser(url: string = window.location.href): void {
  window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`;
}
```

- **Android**: 기본 브라우저(보통 Chrome)로 열림. 스킴 실패 시 폴백으로 `intent://{host}{path}#Intent;scheme=https;end`를 시도할 수 있으나, `openExternal` 스킴은 2025~2026 현재 안정 동작이 확인되므로 MVP는 단일 스킴으로 충분.
- **iOS**: Safari(기본 브라우저)로 열림. iOS는 `intent://` 미지원 — `openExternal` 스킴이 유일한 방법.
- 주의: 이 스킴 실행 후 **인앱 브라우저 탭은 그대로 남는다**. 호출 직후 안내 화면("Safari에서 계속 진행해 주세요")으로 교체해 사용자가 인앱 쪽에서 중복 조작하지 않게 한다.

### 2.3 세션 쿠키 유지 이슈

| 사실 | UX 함의 |
|---|---|
| 카카오톡 인앱 WebView(iOS: WKWebView, Android: Chromium WebView)는 **자체 쿠키 저장소**를 가지며, 카톡을 껐다 켜도 유지된다 | 재방문 경로가 대부분 "카톡 링크 재탭"이므로 **인앱 컨텍스트 안에서는 Supabase 세션이 살아 있다** → §1.2의 1탭 재입장이 성립 |
| 인앱 저장소와 Safari/Chrome 저장소는 **완전히 분리**된다 | 인앱에서 로그인해도 외부 브라우저(PWA)에서는 비로그인. **컨텍스트당 1회 로그인은 감수**하는 것이 설계 원칙 — 어차피 카카오 OAuth 재로그인은 2탭이면 끝난다 |
| Supabase PKCE flow의 `code_verifier`는 OAuth를 **시작한 브라우저**의 쿠키에 저장된다 (`@supabase/ssr`) | OAuth 시작과 콜백 복귀는 반드시 같은 브라우저 컨텍스트여야 한다. 인앱에서 시작→인앱으로 복귀(정상), 인앱에서 시작→외부에서 복귀(실패). **로그인 도중에 외부 브라우저로 보내는 설계 금지** |
| Magic Link는 구조적으로 컨텍스트가 갈라진다(§2.2) | `/login`에서 `isKakaoInApp()`이면 이메일 폼을 접거나(아코디언 "다른 방법으로 로그인") 숨기고 카카오 버튼만 노출. Phase 7에서 Magic Link 대신 6자리 OTP 코드 입력(`signInWithOtp` + `verifyOtp`)으로 교체 검토 — OTP는 컨텍스트 분리 문제가 없다 |
| iOS Safari ITP는 7일 미사용 시 localStorage를 소거할 수 있으나, `@supabase/ssr`은 **httpOnly 아님 first-party 쿠키** 기반이라 영향이 작다 | 별도 대응 불필요. 세션 만료 시 §1.2의 2탭 재로그인으로 자연 복구 |

### 2.4 `/login` 화면의 인앱 분기 스펙

`src/modules/auth/components/LoginPage.tsx` 수정:

```
- isKakaoInApp() === true  → KakaoLoginButton 단독 + "카카오톡으로 3초 만에 시작" 카피.
                             이메일 로그인은 <details> 접힘 처리 + "카카오톡에서는 이메일 링크가
                             정상 동작하지 않을 수 있어요" 경고 문구
- isKakaoInApp() === false → 현행 유지 (카카오 버튼 + 구분선 + 이메일 폼)
```

---

## 3. OAuth `next` 파라미터 보존 — 수정 스펙

현재 콜백 라우트(`src/app/auth/callback/route.ts:8`)는 `next`를 읽을 준비가 되어 있으므로, **보내는 쪽 3개 파일만 수정**하면 된다.

### 3.1 `src/modules/auth/services/authService.ts`

```ts
// 변경: next 인자 추가 — redirectTo 쿼리로 콜백에 전달
export async function signInWithKakao(next?: string) {
  const supabase = createClient();
  const callbackUrl = new URL("/auth/callback", window.location.origin);
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    callbackUrl.searchParams.set("next", next);
  }
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "kakao",
    options: { redirectTo: callbackUrl.toString() },
  });
  if (error) throw error;
  return data;
}

// signInWithMagicLink(email, next?) 도 동일하게 emailRedirectTo에 ?next= 부착
```

### 3.2 `src/modules/auth/components/KakaoLoginButton.tsx`

```ts
interface KakaoLoginButtonProps {
  next?: string;          // 로그인 후 복귀 경로
}
// handleClick → signInWithKakao(next)
```

### 3.3 `src/app/(auth)/login/page.tsx` + `LoginPage.tsx`

`useSearchParams`(Suspense 경계 필요) 대신 **서버 컴포넌트에서 searchParams를 읽어 prop으로 전달**한다 (Next 16: searchParams는 Promise):

```tsx
// src/app/(auth)/login/page.tsx
export default async function Page({
  searchParams,
}: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <LoginPage next={next} />;
}
// LoginPage는 next를 KakaoLoginButton과 Magic Link 폼에 그대로 전달
```

### 3.4 콜백 검증 강화 — `src/app/auth/callback/route.ts`

오픈 리다이렉트 방지(현재는 `next`를 무검증 사용):

```ts
const rawNext = searchParams.get("next");
const next =
  rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//")
    ? rawNext
    : "/rooms";
```

### 3.5 Supabase 대시보드 설정

- Auth → URL Configuration → Redirect URLs에 `https://sharesnap.app/auth/callback`과 `http://localhost:3000/auth/callback` 등록. 쿼리 파라미터가 붙은 redirectTo가 allowlist 매칭에서 거부되면 glob `https://sharesnap.app/auth/callback?*` 형태로 등록한다(배포 후 1회 실측 확인 항목).
- `/join/{code}?auto=1`처럼 **쿼리가 포함된 next**도 `encodeURIComponent`로 안전하게 왕복됨 — §1.4의 자동 입장 분기가 이 값에 의존한다.

---

## 4. 카카오톡 공유 메시지 최적화

### 4.1 Feed 템플릿 — 시나리오별 구성

현재 `KakaoShareButton.tsx:28-42`는 generic 문구 + 앱 아이콘 폴백이다. 시나리오 3종으로 확장한다 (이미지: 권장 800×800 또는 800×400(2:1), 최소 200×200, 5MB 이하).

| 필드 | ① 초대 (방 생성/초대 화면) | ② 사진 N장 추가됨 (리마인드) | ③ 포토북 완성 (Phase 5+) |
|---|---|---|---|
| `content.title` | `{방이름}` | `{방이름}에 새 사진 {N}장!` | `{방이름} 포토북이 완성됐어요` |
| `content.description` | `사진 {photoCount}장 · 멤버 {memberCount}명 — 우리 사진 함께 모아요` | `{닉네임}님이 방금 올렸어요. 놓치기 전에 확인하세요` | `함께 모은 {photoCount}장이 한 권의 책으로` |
| `content.imageUrl` | 커버 사진(`cover_url`) → 없으면 최신 업로드 사진 → 없으면 기본 OG 이미지 | 새로 올라온 사진 중 첫 장의 썸네일 | 포토북 표지 렌더링 PNG |
| `buttons[0].title` | **`사진 보러 가기`** (현행 "공유방 참여"에서 변경 — 행동이 아니라 보상을 약속) | `지금 확인하기` | `포토북 구경하기` |
| 링크 | `/join/{shareCode}` | `/join/{shareCode}` (멤버는 §1.4 분기로 즉시 방 이동) | `/rooms/{id}/photobook` (비멤버 대비 `/join/{shareCode}`) |

구현 메모:
- `KakaoShareButton`에 `variant: "invite" | "newPhotos" | "photobook"` prop과 `photoCount`/`memberCount` prop을 추가하고 템플릿 빌더를 `src/modules/shared/lib/kakao.ts`에 `buildFeedTemplate(variant, room)` 함수로 분리(비즈니스 로직 services/lib 분리 규칙 준수).
- 카카오 공유는 일 200건/사용자 무료 쿼터(`docs/kakao-api-report.md` §7) — 리마인드 버튼 남발 방지를 위해 방당 1시간 1회 쿨다운을 클라이언트에 둔다.

### 4.2 OG 메타태그 — 카톡에 URL을 "직접 붙여넣는" 경로 대응

`Kakao.Share.sendDefault`는 템플릿 파라미터를 쓰지만, 사용자가 **링크를 복사해 카톡 채팅에 붙여넣는 경우** 카카오 스크래퍼가 OG 태그를 읽는다. 두 경로 모두 커버해야 한다.

`src/app/join/[shareCode]/page.tsx`에 `generateMetadata` 추가 (§1.3의 RPC 재사용 — anon 권한이므로 스크래퍼 요청에서도 동작):

```tsx
export async function generateMetadata({ params }: JoinPageProps): Promise<Metadata> {
  const { shareCode } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .rpc("get_room_preview", { p_share_code: shareCode })
    .maybeSingle();

  if (!data) return { title: "공유방 초대 — ShareSnap" };

  const description = `사진 ${data.photo_count}장 · 멤버 ${data.member_count}명 — 함께 사진을 모아보세요`;
  return {
    title: `${data.name} — ShareSnap`,
    description,
    openGraph: {
      title: data.name,
      description,
      images: [data.cover_url ?? `${APP_URL}/og-default.png`],
      type: "website",
    },
  };
}
```

- `public/og-default.png` (1200×630) 신규 제작 필요 — 브랜드 컬러 배경 + "사진을 모으면 포토북이 됩니다" 카피.
- 카카오는 OG를 캐싱한다 — 커버 변경 후 미반영 시 [카카오 OG 캐시 초기화 도구](https://developers.kakao.com/tool/clear/og)와 [공유 디버거](https://developers.kakao.com/tool/debugger/sharing)로 검증.
- Phase 5+: `src/app/join/[shareCode]/opengraph-image.tsx` (`next/og` `ImageResponse`)로 "방 이름 + 커버 사진 콜라주" 동적 OG 이미지 생성으로 업그레이드.

---

## 5. 재참여 루프 — 사진이 올라올 때 다시 불러오기

### 5.1 수단 비교

| 수단 | 도달 대상 | 비용 | 제약 | 판정 |
|---|---|---|---|---|
| **방장 리마인드 공유** (②템플릿 수동 발송) | 카톡방 전원 (비가입자 포함) | 무료 | 방장의 수고에 의존, 자동화 불가 | **MVP 채택** — 업로드 후 "카톡방에 알리기" 버튼으로 마찰 최소화 |
| **웹푸시 (PWA)** | 푸시 구독자 (설치+허용한 멤버) | 무료 | 카톡 인앱 불가, iOS는 홈화면 설치 PWA만(iOS 16.4+), 허용률 낮음 | **채택(보조)** — 구현은 **Phase 5~6** (`mobile-deployment.md` §5.3 Web Push 일정과 일치). Phase 3에서는 업로드 이벤트 발생 지점만 식별해 두고 발송 로직은 붙이지 않는다 |
| 카카오톡 나에게 보내기 | 본인 1명 | 무료 | **각 멤버의 카카오 access token을 서버 보관+갱신**해야 타인 업로드를 본인에게 알릴 수 있음 (scope `talk_message`, 토큰 수명 관리 부담) | Phase 6 검토 |
| 카카오 알림톡 (채널) | 채널 추가자 | ~7.5원/건 | 비즈니스 채널 심사, 템플릿 사전 승인 | 주문/배송 알림 한정으로 Phase 6 |

### 5.2 트리거 설계

| 트리거 | 채널 | 메시지 |
|---|---|---|
| 멤버가 사진 업로드 완료 | 업로더 화면에 "카톡방에 알리기" 버튼 (②템플릿) | "새 사진 {N}장!" |
| 같은 방에 24시간 내 누적 10장 이상 + 미방문 멤버 존재 | 웹푸시 (구독자만) | "{방이름}에 새 사진 {N}장이 모였어요" |
| 포토북 생성 완료 | 웹푸시 + 방장에게 ③템플릿 공유 유도 | "포토북 완성!" |

### 5.3 PWA 설치 유도 타이밍

설치 유도는 **가치를 경험한 직후, 단 한 번**이 원칙이다.

1. **타이밍**: 첫 사진 업로드 성공 toast 직후 (또는 두 번째 세션 진입 시) — 가입 직후 금지.
2. **카톡 인앱에서는 설치 불가** → `isKakaoInApp()`이면 설치 배너 대신 "Safari/Chrome으로 열고 홈 화면에 추가하면 푸시 알림을 받을 수 있어요" 안내 + `openExternalBrowser()` 버튼(§2.2). 외부 브라우저에서는 재로그인 1회 발생함을 안내 문구에 포함.
3. **Android(외부 Chrome)**: `beforeinstallprompt` 이벤트를 가로채 커스텀 배너에서 `prompt()` 호출.
4. **iOS(Safari)**: 자동 프롬프트가 없으므로 "공유 버튼 → 홈 화면에 추가" 그림 안내 모달.
5. 거절 시 `localStorage`에 `pwa-prompt-dismissed-at` 기록, 14일간 재노출 금지.

### 5.4 퍼널 계측 (최소 스펙)

Vercel Web Analytics 커스텀 이벤트 5종으로 시작 (별도 테이블 불필요):
`invite_shared` → `join_viewed` → `login_started` → `join_completed` → `first_photo_uploaded`.
목표: `join_viewed → join_completed` 전환율 60% 이상, `join_completed → first_photo_uploaded` 40% 이상.

---

## 6. 전체 여정 워크플로우 다이어그램

```
[모임장]                          [카카오톡]                       [참여자]
   │                                  │                                │
   ├ 방 생성 (/rooms/create)          │                                │
   ├ 초대 화면 (/rooms/{id}/invite)   │                                │
   ├ KakaoShareButton 탭 ──────────▶ Feed 메시지 수신 ───────────────▶ │
   │   (①초대 템플릿:                 │  "{방이름} · 사진 N장 · 멤버 N명" │
   │    커버사진+사진수+멤버수)        │  [사진 보러 가기] ◀── 탭 1 ───── ┤
   │                                  │                                │
   │                          카카오톡 인앱 브라우저 오픈                │
   │                                  │                                │
   │                    /join/{shareCode}  ← get_room_preview RPC (anon)
   │                                  │                                │
   │              ┌─── 세션有+멤버 ── 즉시 /rooms/{id} (탭 1로 종료) ────┤
   │              │                                                    │
   │              └─── 비로그인 ── [방 미리보기 화면]                    │
   │                               방이름/커버/멤버수/사진수              │
   │                               [카카오로 시작하기] ◀── 탭 2 ──────── ┤
   │                                  │                                │
   │                    카카오 OAuth (인앱: 계정 세션 공유)              │
   │                    신규: 동의 화면 [계속하기] ◀── 탭 3 ──────────── ┤
   │                    기존: 동의 화면 생략                             │
   │                                  │                                │
   │            /auth/callback?next=/join/{code}%3Fauto%3D1            │
   │                    → exchangeCodeForSession                       │
   │                    → /join/{code}?auto=1                          │
   │                    → join_room_via_share_code RPC (자동 입장)      │
   │                    → /rooms/{id}?welcome=1                        │
   │                                  │                                │
   │                          [갤러리 + 채팅 화면]                       │
   │                          사진 0장 → "첫 사진 올리기" CTA            │
   │                                  │                                │
   │ ◀── Realtime(room:{roomId}) ── 사진 업로드 ◀──────────────────────┤
   │                                  │                                │
   │                          [업로드 완료 toast]                       │
   │                          "카톡방에 알리기" (②템플릿) ──▶ 카톡방      │
   │                          첫 업로드면: PWA 설치 유도 (§5.3)          │
   │                                  │                                │
   ├ (여행 후) 포토북 만들기            │                                │
   ├ 자동편집 → 표지/내지 → PDF        │                                │
   ├ ③템플릿 공유 "포토북 완성" ─────▶ 카톡방 ────────────────────────▶ │
   │                                  │                     포토북 열람/주문
   ▼                                  ▼                                ▼
```

---

## 7. 구현 체크리스트 (Phase 3 반영 순서)

| 우선순위 | 작업 | 파일 |
|:---:|---|---|
| P0 | `008_join_funnel.sql` — `get_room_preview` + `join_room_via_share_code` RPC | `supabase/migrations/008_join_funnel.sql` (신규) |
| P0 | `signInWithKakao(next?)` / `signInWithMagicLink(email, next?)` | `src/modules/auth/services/authService.ts` |
| P0 | `KakaoLoginButton`에 `next` prop, login page에서 searchParams 전달 | `src/modules/auth/components/KakaoLoginButton.tsx`, `src/modules/auth/components/LoginPage.tsx`, `src/app/(auth)/login/page.tsx` |
| P0 | 콜백 `next` 검증 (오픈 리다이렉트 방지) | `src/app/auth/callback/route.ts` |
| P0 | `/join` 재작성: SSR 미리보기 + 자동입장 분기 + `generateMetadata` | `src/app/join/[shareCode]/page.tsx`, `src/modules/room/components/RoomPreview.tsx` (신규) |
| P0 | `roomService`에 RPC 래퍼 추가, 기존 share_code 직접 select 교체 | `src/modules/room/services/roomService.ts` |
| P1 | `browserEnv.ts` 유틸 + LoginPage 인앱 분기 | `src/modules/shared/utils/browserEnv.ts` (신규) |
| P1 | Feed 템플릿 빌더 + 버튼 문구/이미지 개편 | `src/modules/shared/lib/kakao.ts`, `src/modules/room/components/KakaoShareButton.tsx` |
| P1 | 기본 OG 이미지 | `public/og-default.png` (신규) |
| P2 | 업로드 후 "카톡방에 알리기", PWA 설치 유도, 퍼널 계측 | 사진 모듈(M4) 구현과 함께 |

---

## 참고자료

- [카카오 데브톡 — 인앱브라우저 외부 브라우저 이동](https://devtalk.kakao.com/t/topic/131149)
- [카카오톡 인앱브라우저에서 외부브라우저 띄우기 (openExternal 스킴)](https://burndogfather.com/271)
- [인앱 브라우저 호환성 이슈와 실무 대응 전략](https://iropke.com/ko/archive/page/inapp-browser-compatibility)
- [카카오 인앱 브라우저 탈출하기 (Next.js)](https://velog.io/@jungsu/%EC%B9%B4%EC%B9%B4%EC%98%A4-%EB%9D%BC%EC%9D%B8-%EC%9D%B8%EC%95%B1-%EC%9B%B9%EB%B7%B0-%ED%83%88%EC%B6%9C%ED%95%98%EA%B8%B0React-Next)
- [Kakao Developers — 카카오 로그인 활용](https://developers.kakao.com/docs/latest/ko/kakaologin/utilize)
- [Supabase Docs — PKCE Flow](https://supabase.com/docs/guides/auth/sessions/pkce-flow)
- [Supabase Docs — Login with Kakao](https://supabase.com/docs/guides/auth/social-login/auth-kakao)
- [Supabase Issue — empty code_verifier 오류](https://github.com/supabase/auth/issues/2099)
- 프로젝트 내부: `docs/kakao-api-report.md`(API 제약), `MEMORY.md` ADR-001/002(카카오 전략·PWA 결정)
