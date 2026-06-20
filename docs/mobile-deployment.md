# ShareSnap Android/iOS 배포 전략

> **작성일**: 2026-06-12
> **대상 코드베이스**: Next.js 16.2.6 (App Router, Turbopack) + React 19.2 + Supabase + Vercel SSR 배포
> **목표**: 단일 Next.js 코드베이스로 **웹(PWA) + Google Play + App Store** 3채널 배포
> **관련 ADR**: ADR-002(PWA 채택) 유지, 본 문서로 스토어 배포 전략 확장 (→ MEMORY.md에 ADR-008로 기록 예정)

---

## 0. 결론 요약 (TL;DR)

| 채널 | 방식 | 시점 | 비용 |
|------|------|------|------|
| **웹 (핵심 채널)** | PWA — 카카오톡 인앱브라우저 → 모바일웹 → 홈화면 설치 | **Phase 3부터 점진 완성** | 무료 |
| **Google Play** | **TWA (Bubblewrap)** — 동일 웹을 Chrome 엔진으로 풀스크린 구동 | **Phase 7** | $25 (1회) |
| **App Store** | **Capacitor 하이브리드 (remote URL + 네이티브 플러그인 레이어)** | **Phase 7 이후, 서비스 검증 후 별도 트랙** | $99/년 |

핵심 판단: ShareSnap의 유입 퍼널은 **카카오톡 공유 링크 → 인앱브라우저 → 카카오 로그인 → 사진 업로드**이므로, 스토어 앱이 없어도 핵심 시나리오가 100% 동작한다. 따라서 **PWA 품질을 먼저 완성**하고, Play Store는 TWA로 사실상 무료 탑재(웹 배포 = 앱 업데이트), App Store는 Apple 심사 리스크(가이드라인 4.2)와 Sign in with Apple 의무(4.8) 비용이 있으므로 **사용자 검증 후 착수**한다.

---

## 1. 전략 결정

### 1.1 플랫폼별 옵션 비교

#### Android — TWA vs Capacitor

| 항목 | **TWA (Bubblewrap/PWABuilder)** ⭐ 채택 | Capacitor (Android) |
|------|------|------|
| 렌더링 엔진 | 설치된 Chrome (브라우저 그대로) | WebView (WKWebView 대응물) |
| Next.js SSR 호환 | **완전 호환** — 그냥 URL을 연다 | remote URL 모드 필요 |
| 앱 업데이트 | **웹 배포 = 즉시 반영** (스토어 재심사 불필요) | 동일 (remote URL 모드 시) |
| 푸시 | Web Push 그대로 (Chrome이 FCM 자동 사용) | 네이티브 FCM 플러그인 |
| 쿠키/세션 | **Chrome과 공유** — 웹에서 로그인했으면 앱도 로그인 상태 | WebView 독립 세션 |
| 사전 조건 | HTTPS + 유효한 manifest + Service Worker + Lighthouse PWA 통과 + Digital Asset Links | 없음 |
| 심사 리스크 | 낮음 (Google이 공식 지원하는 PWA 탑재 경로, 2019년 Chrome 72부터) | 낮음 |
| 유지보수 | **거의 0** — 네이티브 코드 없음 | Gradle/SDK 버전 관리 필요 |

→ **Android는 TWA 확정.** Bubblewrap은 GoogleChromeLabs가 유지하는 공식 CLI이고 PWABuilder도 내부적으로 동일 엔진을 쓴다. 2026년 현재도 활발히 유지되는, Google이 인정하는 PWA → Play Store 경로다. 네이티브 코드 0줄로 Play Store에 올라가고, 이후 모든 기능 추가는 웹 배포만으로 끝난다.

#### iOS — 3가지 옵션

**전제: Next.js가 Vercel SSR 구조라 `next export`(정적 추출)가 불가능하다.** Server Components, Server Actions, `/auth/callback` Route Handler, 동적 라우트(`/join/[shareCode]`, `/rooms/[id]`)가 모두 서버 런타임을 요구한다. 따라서 Capacitor의 표준 방식(정적 `webDir` 번들)은 ShareSnap에 쓸 수 없다.

| 옵션 | 내용 | 장점 | 단점/리스크 |
|------|------|------|------|
| **A. iOS는 PWA만** (스토어 미진출) | Safari "홈 화면에 추가"로 설치 유도 | 추가 작업 0. iOS 16.4+ 홈화면 설치 시 Web Push 동작. iOS 26부터는 홈 화면 추가 시 기본이 웹앱 모드로 열려 설치 UX가 크게 개선됨 | 설치 유도가 어려움(자동 프롬프트 없음, Share 시트 수동 조작). 스토리지 eviction(7일 미사용 시 사이트 데이터 삭제 가능 — 단, 홈화면 설치 앱은 제외). 앱스토어 검색 노출 없음 |
| **B. Capacitor 순수 래퍼** (remote URL만) | `capacitor.config.ts`의 `server.url = "https://sharesnap.app"` 로 전체를 원격 로딩 | 구현 최소 | **Apple 4.2 (Minimum Functionality) 거절 확률 높음.** "웹사이트 재포장 수준"으로 판정. 실제로 "푸시·위치·공유 추가 정도로는 충분치 않다"는 거절 사례가 2025~2026년에도 빈번 |
| **C. Capacitor 하이브리드** ⭐ 채택(2차) | remote URL 로딩 + **네이티브 플러그인 레이어로 실질 기능 차별화**: ① `@capacitor/camera` 네이티브 카메라/사진 다중선택, ② APNs 네이티브 푸시(`@capacitor/push-notifications`), ③ `@capacitor/share` 네이티브 공유 시트, ④ Haptics/StatusBar/SplashScreen, ⑤ (강력 권장) iOS Share Extension — "사진 앱에서 ShareSnap 공유방으로 바로 보내기" | 단일 코드베이스 유지. 심사 통과 가능성을 실질적으로 높이는 건 ⑤ 같은 "웹에서 불가능한 기능" | Sign in with Apple 의무(아래 1.3). Apple 심사 1~3일+리젝 반복 가능성. Xcode/인증서 관리 부담. remote URL 콘텐츠 자체는 허용되나(WKWebView 원격 로딩 금지 규정은 없음) 심사관 재량 변수 존재 |

### 1.2 확정안: "PWA 우선, TWA 즉시, Capacitor 후행"

```
Phase 3~6  : PWA 완성 (본 문서 §2 체크리스트) — 웹이 곧 제품
Phase 7    : Android TWA → Play Store 출시 (작업량 2~3일)
Phase 7+α  : iOS는 PWA 설치 가이드 UI로 대응 (iOS 26 환경에서 충분히 실용적)
검증 후    : Capacitor 하이브리드로 App Store 진출 (작업량 1.5~2주, 별도 트랙)
```

근거:
1. **핵심 퍼널이 웹**: 초대 링크는 카카오톡 인앱브라우저에서 열린다. iOS 앱이 있어도 이 퍼널은 변하지 않는다 (Universal Link로 앱 열기는 카카오톡 인앱브라우저 내에서 동작이 불안정).
2. **TWA는 공짜 점심**: PWA 체크리스트(§2)를 통과하면 Android 앱은 패키징 작업만 남는다. Play Store 존재 자체가 신뢰도/재방문 채널이 된다.
3. **iOS App Store는 비용 대비 후순위**: $99/년 + Sign in with Apple 구현 + 4.2 리젝 리스크 + 심사 사이클을, 사용자가 검증되기 전에 지불할 이유가 없다. iOS 사용자는 PWA로 푸시까지 받을 수 있다(16.4+, 홈화면 설치 시).

### 1.3 iOS 진출 시 반드시 알아야 할 제약 2가지

1. **Apple 가이드라인 4.8 (Login Services)**: 카카오 로그인 같은 서드파티 로그인을 제공하는 앱은 **Sign in with Apple(또는 동등한 프라이버시 보호 로그인)을 함께 제공해야 한다.** → Supabase Auth가 Apple Provider를 공식 지원하므로 구현 자체는 1~2일 작업. 단, `LoginPage.tsx`에 Apple 버튼 추가 + Apple Developer 설정(Services ID, Key) 필요. **Capacitor 트랙 착수 시 첫 작업으로 잡을 것.**
2. **가이드라인 4.2 대응 전략**: 심사 노트에 "네이티브 카메라 통합, APNs 푸시, Share Extension, 오프라인 갤러리" 등 웹과 차별화된 기능을 명시. 리젝 시 1차 항소(Resolution Center) → 기능 보강 → 재제출 사이클을 일정에 2~3주 버퍼로 반영.

---

## 2. PWA 완성 체크리스트 (Phase 3~6에 걸쳐 완료)

### 2.1 manifest.json 보강 — `public/manifest.json`

현재 파일은 골격이 갖춰져 있으나 다음 수정 필요:

```jsonc
{
  "id": "/",                          // ← 추가: 앱 식별자 고정 (업데이트 연속성)
  "name": "ShareSnap — 사진 공유 & 포토북",
  "short_name": "ShareSnap",
  "description": "여행·모임 사진 공유와 포토북 자동편집 PWA",
  "start_url": "/rooms",              // ← "/" 대신 로그인 후 첫 화면 권장 (설치 사용자는 기존 유저)
  "display": "standalone",
  "display_override": ["standalone", "minimal-ui"],
  "orientation": "portrait",
  "background_color": "#FBF8F3",      // ← 웜 오프화이트 (design-system.md §6.4)
  "theme_color": "#F2654C",           // ← ⚠️ 카카오 옐로(#FEE500) 금지 — 브랜드 코랄 (design-system.md §0 원칙 2). TWA는 이 값으로 상태바/스플래시 색을 추출하므로 패키징 전 필수 교정
  "lang": "ko",
  "scope": "/",
  "icons": [
    // ⚠️ 현재 "purpose": "any maskable" 결합 표기는 안티패턴 — 분리할 것
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-192-maskable.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "/icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "screenshots": [                     // ← Phase 6에 추가: Android 리치 설치 UI + PWABuilder 점수
    { "src": "/screenshots/room.png", "sizes": "1080x2340", "type": "image/png", "form_factor": "narrow" }
  ],
  "shortcuts": [                       // ← 선택: 롱프레스 바로가기
    { "name": "내 공유방", "url": "/rooms", "icons": [{ "src": "/icons/icon-192.png", "sizes": "192x192" }] }
  ]
}
```

**아이콘 제작 체크** (현재 `public/icons/` 디렉터리 자체가 없음 — manifest가 깨진 참조 상태):
- [ ] `public/icons/icon.svg` — 마스터 SVG 1개 (이것만 디자인하면 나머지는 생성)
- [ ] `icon-192.png`, `icon-512.png` (purpose: any — 여백 없는 풀 디자인)
- [ ] `icon-192-maskable.png`, `icon-512-maskable.png` (maskable — **중요 요소를 중앙 지름 80% 안전영역 안에**, 배경 꽉 채움. https://maskable.app 로 검증)
- [ ] `apple-touch-icon.png` 180×180 (모서리 라운딩 없이, 불투명 배경 — iOS가 자동 라운딩)
- 생성 도구: `npx pwa-asset-generator icons/icon.svg public/icons --opaque false --padding "10%"`

### 2.2 Service Worker — 수동 `public/sw.js` + 등록 컴포넌트 (확정)

**`next-pwa`(shadow-walker)는 사용하지 않는다.** Webpack 플러그인 기반이라 Next 16 + Turbopack에서 동작 보장이 없고 유지보수가 정체됨. Serwist(`@serwist/next`)도 빌드 파이프라인 개입형이라 동일 리스크. → **빌드 시스템과 완전히 분리된 수동 SW**가 Next 16 환경의 정답이다. 이미 `src/proxy.ts:12` matcher가 `sw.js`를 제외하도록 선반영돼 있다.

**파일 1: `public/sw.js`** — 전략 요약:

```javascript
// ShareSnap Service Worker — 수동 관리 (빌드 도구 비의존)
const CACHE_VERSION = 'sharesnap-v1';          // 배포 시 버전 올려 캐시 무효화
const OFFLINE_URL = '/offline';
const PRECACHE = [OFFLINE_URL, '/icons/icon-192.png', '/manifest.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_VERSION).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // ① GET만 처리. ② Supabase API/Auth/Realtime은 절대 캐시하지 않음
  if (e.request.method !== 'GET') return;
  if (url.hostname.endsWith('.supabase.co')) return;

  // ③ 페이지 내비게이션: network-first → 실패 시 /offline 폴백
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() =>
        caches.match(OFFLINE_URL).then((r) => r ?? Response.error())
      )
    );
    return;
  }

  // ④ Next 정적 자산(/_next/static — 해시 파일명, 불변): cache-first
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    e.respondWith(
      caches.match(e.request).then(
        (cached) => cached ?? fetch(e.request).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(e.request, copy));
          return res;
        })
      )
    );
  }
  // ⑤ 그 외(이미지 CDN 등)는 브라우저 기본 동작에 위임
});

// ⑥ Web Push 수신 (Phase 5~6에서 활성화)
self.addEventListener('push', (e) => {
  const data = e.data?.json() ?? {};
  e.waitUntil(self.registration.showNotification(data.title ?? 'ShareSnap', {
    body: data.body, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png',
    data: { url: data.url ?? '/rooms' },
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data?.url ?? '/rooms'));
});
```

**파일 2: `src/modules/shared/components/ServiceWorkerRegister.tsx`**:

```tsx
'use client';
import { useEffect } from 'react';

// 서비스 워커 등록 — 루트 레이아웃에 마운트
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
        // 등록 실패는 치명적이지 않음 — 조용히 무시 (PWA 미지원 브라우저)
      });
    }
  }, []);
  return null;
}
```

→ `src/app/layout.tsx`의 `<body>` 안에 `<ServiceWorkerRegister />` 추가.

**파일 3: `src/app/offline/page.tsx`** — 오프라인 폴백 (정적 페이지, "네트워크 연결을 확인해주세요" + 재시도 버튼).

⚠️ **주의**: SW 캐시 전략을 공격적으로 가져가지 말 것. ShareSnap은 실시간 서비스(Realtime 채팅, 사진 업로드)라 stale 콘텐츠가 오히려 해롭다. 위 전략(내비게이션 network-first, 불변 자산만 cache-first)이 안전 하한선이며, TWA/Lighthouse 통과에는 이것으로 충분하다.

### 2.3 iOS 전용 메타 — `src/app/layout.tsx`

현재 상태와 수정 사항:

```tsx
export const metadata: Metadata = {
  // ... 기존 유지 (manifest, appleWebApp.capable/title은 이미 OK)
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",  // ← "default" → 변경: 콘텐츠가 노치 영역까지 확장
    title: "ShareSnap",
    // startupImage: [...]                // ← splash는 아래 참고
  },
  icons: {
    apple: "/icons/apple-touch-icon.png", // ← 추가 (180×180)
  },
};

export const viewport: Viewport = {
  // ⚠️ 카카오 옐로 금지 — 브랜드 코랄/웜블랙 (design-system.md §2.1과 동일 값)
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBF8F3" },
    { media: "(prefers-color-scheme: dark)", color: "#1B1715" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",                   // ← 추가 필수: safe-area-inset이 이것 없이는 0
  maximumScale: 5,                        // ← 현행 maximumScale:1 + userScalable:false는 WCAG 1.4.4 위반 → 해제 (design-system.md §7.3)
  userScalable: true,
};
```

**iOS Splash Screen**: `apple-touch-startup-image`는 기기 해상도별 PNG 수십 장이 필요해 수동 관리 비효율. → `npx pwa-asset-generator`로 일괄 생성해 `public/splash/`에 넣고 `metadata.appleWebApp.startupImage` 배열로 연결. **우선순위 낮음(Phase 6)** — 없어도 동작하며, iOS 26은 manifest 기반 배경색 스플래시를 자동 표시.

### 2.4 safe-area 대응 — `src/app/globals.css`

`viewportFit: "cover"` 적용 시 노치/다이내믹 아일랜드/홈 인디케이터 영역까지 콘텐츠가 확장되므로:

```css
/* ⚠️ 구현은 design-system.md §1의 globals.css 완성본에 이미 포함 — 여기서 재정의하지 말 것 (단일 소스: 디자인 시스템 문서)
   Tailwind v4 @utility 방식: */
@utility pb-safe { padding-bottom: env(safe-area-inset-bottom); }
@utility pt-safe { padding-top: env(safe-area-inset-top); }
```

적용 대상: 채팅 입력바(`src/modules/chat/components/` 하단 고정 요소), 헤더(`RoomHeader.tsx`), 추후 하단 탭바. **Phase 3에서 채팅/갤러리 UI 만들 때부터 적용해야 나중에 일괄 수정을 피한다.**

### 2.5 설치 유도 UI

- **Android/Chrome**: `beforeinstallprompt` 이벤트 캡처 → 커스텀 "앱 설치" 배너. `src/modules/shared/hooks/useInstallPrompt.ts` + `src/modules/shared/components/InstallBanner.tsx`.
- **iOS Safari**: 자동 프롬프트 없음 → UA 감지 후 "공유 버튼 → 홈 화면에 추가" 안내 시트 (1회 노출, localStorage로 dismiss 기억).
- **카카오톡 인앱브라우저**: `beforeinstallprompt` 미발생 + 설치 불가 환경. UA에 `KAKAOTALK` 포함 시 설치 배너 숨기고, 필요 시 "다른 브라우저로 열기" 안내만. (인앱브라우저 UX 상세는 카카오 UX 전략 문서 소관)

### 2.6 PWA 검증 게이트 (Phase 7 TWA 전제조건)

```bash
# ⚠️ Lighthouse 12(2024)부터 PWA 카테고리가 삭제됨 — --only-categories=pwa는 동작하지 않음.
#    설치 가능성(installability)은 Chrome DevTools > Application > Manifest 패널에서 확인.
npx lighthouse https://sharesnap.app --only-categories=performance --view   # 성능 점수 80+
npx @bubblewrap/cli validate --url https://sharesnap.app                    # TWA 요건(manifest/아이콘/SW) 검증
```

---

## 3. 네이티브 기능 매트릭스

| 기능 | 웹/PWA (모바일 브라우저·홈화면) | Android TWA | iOS Capacitor | 구현 방법 |
|------|------|------|------|------|
| **카메라 촬영** | ✅ `<input type="file" accept="image/*" capture="environment">` — 카카오톡 인앱브라우저 포함 동작 | ✅ 동일 (Chrome) | ✅+ `@capacitor/camera` `getPhoto()` 네이티브 카메라 | 웹 구현 하나로 3채널 커버, Capacitor는 점진 강화 |
| **사진 다중선택** | ✅ `<input type="file" multiple>` — iOS 14+/Android 모두 네이티브 피커에서 다중선택 지원 (`capture` 속성과 `multiple` 동시 사용 불가 — 버튼 분리: "촬영" / "앨범에서 선택") | ✅ 동일 | ✅+ `Camera.pickImages()` — 네이티브 PHPicker, 대량 선택 UX 우수 | `src/modules/photo/components/PhotoUploader.tsx`에서 입력 추상화 — Capacitor 감지 시 플러그인 분기 (`Capacitor.isNativePlatform()`) |
| **푸시 알림** | Android Chrome ✅ Web Push(VAPID). iOS ⚠️ **16.4+ & 홈화면 설치 시에만** — Safari 탭에선 불가. iOS 18.4+ Declarative Web Push로 안정성 개선 | ✅ Web Push 그대로 (Chrome이 수신). 알림 채널 통합 원하면 Bubblewrap notification delegation 옵션 | ✅ APNs 네이티브 (`@capacitor/push-notifications`) — 설치 즉시 권한 요청 가능 | 발송: Supabase Edge Function + `web-push`(VAPID). 구독 정보 `push_subscriptions` 테이블. Capacitor만 FCM/APNs 토큰 별도 컬럼 |
| **공유 (앱 → 외부)** | ✅ Web Share API `navigator.share({files})` — iOS Safari/Android Chrome 모두 파일 공유 지원. 미지원 브라우저는 클립보드 폴백 | ✅ 동일 | ✅ `@capacitor/share` | 카카오톡 공유는 별도(Kakao JS SDK — 기존 `src/modules/shared/lib/kakao.ts`) |
| **공유 (외부 → 앱)** | ⚠️ Web Share Target (manifest `share_target`) — Android Chrome만, 홈화면 설치 시 | ✅ Web Share Target 동작 — **사진 앱에서 ShareSnap으로 공유 가능** | ✅+ iOS Share Extension (네이티브 작업, 4.2 심사 방어 핵심 카드) | Phase 7에서 manifest에 `share_target` 추가 검토 |
| **홈 설치** | Android ✅ 프롬프트. iOS ⚠️ 수동(공유→홈화면 추가), iOS 26부터 기본 웹앱 모드로 개선 | ✅ Play Store 설치 = 홈 아이콘 | ✅ App Store 설치 | §2.5 설치 유도 UI |
| **오프라인** | ⚠️ SW 폴백 페이지 수준 (실시간 서비스 특성상 깊은 오프라인 불필요) | 동일 | 동일 + 네이티브 스플래시 | §2.2 |
| **생체인증/세션 유지** | 쿠키 (Supabase SSR) — iOS PWA는 Safari와 쿠키 분리 주의(설치 후 재로그인 1회 발생) | Chrome 쿠키 공유 — **웹 로그인 상태 승계** | WKWebView 독립 쿠키 — 최초 1회 로그인 | — |

**Phase 3 사진 업로더 설계 지침**: 위 매트릭스가 단일 코드로 수렴하도록, `PhotoUploader`는 "촬영" 버튼(`capture` 단일)과 "앨범 선택" 버튼(`multiple`)을 분리하고, 파일 획득 로직을 `src/modules/photo/services/photoPickerService.ts`로 추상화한다. Capacitor 도입 시 이 서비스 한 곳만 분기 추가하면 된다.

---

## 4. 카카오 로그인 호환성 (TWA / Capacitor)

### 4.1 Android TWA — 사실상 무수정 동작 ✅

TWA는 WebView가 아니라 **진짜 Chrome**이다. 따라서:

- `supabase.auth.signInWithOAuth({ provider: 'kakao' })` → `kauth.kakao.com` 리디렉트 → 카카오톡 앱 간편로그인(`intent://` 스킴) → `https://<project>.supabase.co/auth/v1/callback` → `https://sharesnap.app/auth/callback` 전 과정이 **웹과 동일하게 동작**한다. Chrome은 `intent://` 처리와 앱 전환 복귀를 모두 지원.
- 리디렉트 최종 목적지가 `sharesnap.app` (Digital Asset Links로 검증된 도메인)이므로 플로우 종료 후에도 풀스크린 TWA 모드 유지. 중간에 `kauth.kakao.com` 등 외부 도메인을 지나는 동안은 상단에 Custom Tab 바가 잠깐 보이는 게 정상 동작이며 기능에는 문제 없음.
- 쿠키가 Chrome과 공유되므로, 사용자가 이미 모바일웹에서 로그인한 상태라면 TWA 설치 후 **재로그인 없이 세션 승계**.
- **할 일**: 카카오 Developers 콘솔에 Android 플랫폼 등록(패키지명 `app.sharesnap.twa`, 키 해시)은 **불필요** — 카카오 SDK를 안 쓰고 순수 웹 OAuth이기 때문. 기존 Web 플랫폼 등록(`https://sharesnap.app`)으로 충분.

### 4.2 iOS Capacitor — 시스템 브라우저 + 딥링크 복귀 패턴 필요 ⚠️

WKWebView 안에서 OAuth를 돌리는 것은 두 가지 문제: ① 카카오톡 앱 전환 후 WKWebView로 복귀가 불안정, ② 일부 OAuth 제공자(특히 향후 추가할 Apple/Google)는 임베디드 WebView를 차단. **표준 패턴**:

```typescript
// Capacitor 환경 분기 — src/modules/auth/services/authService.ts
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

async function signInWithKakao() {
  if (Capacitor.isNativePlatform()) {
    // ① skipBrowserRedirect로 URL만 획득
    const { data } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: 'https://sharesnap.app/auth/native-callback', // Universal Link
        skipBrowserRedirect: true,
      },
    });
    // ② 시스템 브라우저(SFSafariViewController)에서 OAuth 진행
    await Browser.open({ url: data.url! });
    // ③ Universal Link(apple-app-site-association)로 앱 복귀
    //    → appUrlOpen 리스너에서 URL의 code 파라미터 추출
    //    → supabase.auth.exchangeCodeForSession(code)
  } else {
    // 기존 웹 플로우 (현행 코드 유지)
  }
}
```

- **Universal Link 설정**: `public/.well-known/apple-app-site-association` (JSON, 확장자 없음) 배포 + Xcode Associated Domains `applinks:sharesnap.app`. 커스텀 스킴(`sharesnap://`)보다 Universal Link 권장 — 카카오톡 앱에서 복귀 시 신뢰성이 높고 Apple 권장 방식.
- **Supabase 설정**: Auth → URL Configuration → Redirect URLs에 `https://sharesnap.app/auth/native-callback` 추가.
- **카카오 Developers**: 역시 웹 OAuth이므로 iOS 네이티브 SDK 등록 불필요. (단, 카카오톡 간편로그인 앱 전환을 쓰려면 SFSafariViewController에서 자동 처리됨.)
- **Apple 로그인 추가**(가이드라인 4.8 의무): Supabase Apple Provider + 동일 패턴. `LoginPage.tsx`(`src/modules/auth/components/LoginPage.tsx`)에 버튼 추가.

### 4.3 공통 주의사항

- `src/app/auth/callback/route.ts`는 `origin` 기반 리디렉트를 쓰므로 TWA에서 그대로 동작. Capacitor 트랙에서만 `native-callback` 별도 라우트 추가.
- `NEXT_PUBLIC_APP_URL`(`src/modules/shared/lib/constants.ts`의 `APP_URL`)이 프로덕션 도메인으로 설정돼 있어야 카카오 공유 링크·OAuth 리디렉트가 일관됨.

---

## 5. 단계별 로드맵 — Phase 7 추가 작업

### 5.1 Phase 7 작업 목록 확장 (기존: E2E 테스트, 배포)

#### 7-A. PWA 최종 검증 (0.5일)
- [ ] Lighthouse 성능 점수 80+ & 설치 가능성 확인 (§2.6 — Lighthouse 12+는 PWA 카테고리 없음, DevTools Manifest 패널로 확인)
- [ ] maskable 아이콘 검증, manifest 스크린샷 추가
- [ ] iOS 실기기 테스트: 홈화면 설치 → 푸시 권한 → 수신 확인 (iPhone, iOS 17+ 1대 이상)

#### 7-B. Android TWA 패키징 → Play Store (2~3일 + 심사 대기)

```bash
# 1. Bubblewrap 초기화 (JDK/Android SDK 자동 설치 지원)
npx @bubblewrap/cli init --manifest https://sharesnap.app/manifest.json
#    → packageId: app.sharesnap.twa / 앱 이름, 색상은 manifest에서 자동 추출
# 2. 빌드 (AAB + 서명키 생성 — 키스토어는 1Password 등에 백업 필수!)
npx @bubblewrap/cli build
# 3. 웹 업데이트 후 재패키징이 필요한 경우(manifest 변경 시만):
npx @bubblewrap/cli update && npx @bubblewrap/cli build
```

- [ ] **Digital Asset Links**: `public/.well-known/assetlinks.json` 생성 — Play Console > 설정 > 앱 무결성에서 **Play App Signing의 SHA-256 지문**을 받아 기입 (업로드 키 지문이 아님! 둘 다 넣는 게 안전). 이게 틀리면 앱 상단에 브라우저 주소창이 떠서 TWA가 무의미해짐. 검증: https://developers.google.com/digital-asset-links/tools/generator
- [ ] **`src/proxy.ts` matcher 수정**: 현재 matcher가 `.well-known`을 제외하지 않음 → `|.well-known` 추가 (assetlinks.json이 미들웨어에 걸리면 검증 실패)
- [ ] Play Console 등록 ($25 1회): 데이터 보안 양식(수집 항목: 이메일/프로필/사진 — Supabase 저장 명시), 개인정보처리방침 URL(`/privacy` 페이지 Phase 7에서 작성 필요), 콘텐츠 등급 설문
- [ ] ⚠️ **신규 개인 개발자 계정은 비공개 테스트 요건**(테스터 12명 × 14일)이 적용됨 — **법인(조직) 계정으로 등록하면 면제**. papascompany 사업자로 조직 계정 등록 권장. 개인 계정일 경우 일정에 +2주.
- [ ] 심사: 통상 1~7일

#### 7-C. 스토어 자산 제작 (1~2일, 디자인 작업)

| 자산 | Google Play | App Store (후행 트랙) |
|------|------|------|
| 아이콘 | 512×512 PNG | 1024×1024 PNG (알파 불가) |
| 스크린샷 | 폰 최소 2장 (1080×1920 권장) | 6.7" (1290×2796) 필수, 6.5"/5.5" 권장 |
| 피처 그래픽 | 1024×500 필수 | — |
| 설명 | 짧은 설명 80자 + 전체 4000자 (한국어) | 프로모션 텍스트 170자 + 설명 4000자 |
| 기타 | 데이터 보안 양식 | 개인정보 영양표시(Privacy Nutrition Label), 심사 노트(테스트 계정 제공) |

스크린샷 소스: 공유방 채팅, 사진 갤러리, 포토북 편집기, 카카오톡 초대 플로우 4컷 — Phase 6 완료 후 실데이터로 캡처.

#### 7-D. 빌드 파이프라인

- 웹: 기존 Vercel CI/CD 그대로 (TWA는 웹 배포 시 자동 최신화 — 스토어 재제출 불필요)
- TWA 재빌드가 필요한 경우: manifest 변경(이름/아이콘/색상), 권한 추가 시만. GitHub Actions에 `bubblewrap build` 잡 추가는 선택사항(빈도가 낮아 수동으로 충분)
- 버전 관리: `twa-manifest.json`(Bubblewrap 생성)을 레포에 커밋, `appVersionCode` 수동 증가

### 5.2 iOS Capacitor 트랙 (서비스 검증 후, 별도 1.5~2주)

| 주차 | 작업 |
|------|------|
| 1주차 | Capacitor 셋업(`server.url` 모드) + Universal Link + 카카오 OAuth 네이티브 플로우(§4.2) + **Sign in with Apple**(§1.3) |
| 2주차 | APNs 푸시 + 네이티브 카메라/피커 분기 + Share Extension + 스플래시/아이콘 + TestFlight 배포 |
| +버퍼 | App Store 심사 (1~3일) + 4.2 리젝 대응 버퍼 2주 |

선행 조건: Apple Developer Program 가입($99/년, 법인 D-U-N-S 번호로 조직 가입 권장), Mac + Xcode 환경(현재 macOS 개발 환경이므로 충족).

### 5.3 일정 요약

```
Phase 3 (지금)        : §6 즉시 적용 항목 (PWA 기반 공사, +0.5일)
Phase 5~6             : Web Push 구현 (SW push 핸들러 활성화 + Edge Function 발송)
Phase 7 (+3~4일 추가)  : PWA 검증 → TWA 패키징 → Play 심사 제출 → 스토어 자산
Phase 7 + 2~4주        : Play Store 공개 (심사/테스트 요건에 따라)
서비스 검증 후 +4주     : App Store 공개 (Capacitor 트랙)
```

---

## 6. 즉시 적용 항목 (Phase 3에서 함께 처리)

Phase 3 사진 모듈 구현과 같은 PR 흐름에서 처리할 수 있는 저비용·고효과 작업. **나중에 하면 전 화면 일괄 수정이 필요해지는 항목들이므로 지금 깔아둔다.**

| # | 작업 | 파일 | 내용 |
|---|------|------|------|
| 1 | viewport-fit=cover | `src/app/layout.tsx` | `viewport`에 `viewportFit: "cover"` 추가, `appleWebApp.statusBarStyle: "black-translucent"` 변경, `icons.apple` 추가, themeColor 코랄 교정·줌 차단 해제는 design-system.md §2.1 코드와 동일 적용 (충돌 시 디자인 시스템이 기준) |
| 2 | safe-area 유틸 | `src/app/globals.css` | `env(safe-area-inset-*)` 유틸리티 클래스 (§2.4) — Phase 3 채팅 입력바/갤러리 UI가 첫 적용 대상 |
| 3 | 앱 아이콘 | `public/icons/` (신규 디렉터리) | `icon.svg` 마스터 + 192/512 any/maskable 4종 + `apple-touch-icon.png` — **현재 manifest가 존재하지 않는 아이콘을 참조 중인 깨진 상태이므로 최우선** |
| 4 | manifest 보강 | `public/manifest.json` | `purpose` any/maskable 분리, `id` 추가, `start_url: "/rooms"` (§2.1) |
| 5 | Service Worker | `public/sw.js` (신규) | §2.2 코드 — push 핸들러는 골격만 두고 Phase 5~6에서 활성화 |
| 6 | SW 등록 | `src/modules/shared/components/ServiceWorkerRegister.tsx` (신규) + `src/app/layout.tsx` 마운트 | §2.2 |
| 7 | 오프라인 폴백 | `src/app/offline/page.tsx` (신규) | 정적 안내 페이지 + 재시도 버튼. `src/proxy.ts`에서 public 경로 처리 확인 |
| 8 | proxy matcher | `src/proxy.ts` | matcher 제외 목록에 `offline`, `.well-known` 추가 (TWA assetlinks 선반영) |
| 9 | 사진 입력 추상화 | `src/modules/photo/services/photoPickerService.ts` (Phase 3 신규 파일) | "촬영"(capture)과 "앨범 다중선택"(multiple) 버튼 분리 설계 — §3 매트릭스의 단일 코드 수렴 지점 |
| 10 | 설치 배너 (선택) | `src/modules/shared/hooks/useInstallPrompt.ts` + `InstallBanner.tsx` | `beforeinstallprompt` 캡처. 카카오톡 인앱브라우저(UA `KAKAOTALK`)에서는 숨김. Phase 3 말미 여유 시 |

검증: 각 항목 적용 후 `npx tsc --noEmit && npm run lint && npm run build` (CLAUDE.md 규칙), Chrome DevTools > Application 탭에서 manifest/SW 정상 인식 확인.

---

## 7. 리스크 및 미결정 사항

| 리스크 | 영향 | 완화책 |
|--------|------|--------|
| Apple 4.2 리젝 (Capacitor) | iOS 출시 2~4주 지연 | Share Extension 등 네이티브 차별 기능 선탑재, 심사 노트에 명시, 리젝 버퍼 반영 (§1.3) |
| Play 개인계정 테스트 요건 (12명×14일) | Android 출시 +2주 | 법인(조직) 계정으로 등록 (§5.1 7-B) |
| iOS PWA 쿠키 분리 (Safari ↔ 홈화면 앱) | 설치 후 재로그인 1회 | Magic Link/카카오 원클릭이라 마찰 낮음. 설치 안내 문구에 "최초 1회 로그인" 명시 |
| TWA 키스토어 분실 | 앱 업데이트 영구 불가 | Play App Signing 사용 + 업로드 키 백업 절차 문서화 |
| 도메인 미확정 (`sharesnap.app` 가정) | assetlinks/OAuth/공유 링크 전부 도메인 종속 | **TWA 패키징 전 프로덕션 도메인 확정 필수** — Digital Asset Links는 도메인에 바인딩됨 |
| 카카오톡 인앱브라우저에서 SW/푸시 제한 | 인앱 유입 사용자는 푸시 불가 | 정상 — 푸시는 설치 사용자 대상 기능. 인앱에서는 카카오톡 "나에게 보내기" 알림으로 보완 (kakao-api-report.md §2.5) |

---

## 참고 자료

- [Can You Publish a PWA to the App Store and Google Play? (2026) — MobiLoud](https://www.mobiloud.com/blog/publishing-pwa-app-store)
- [PWA iOS Limitations and Safari Support (2026) — MagicBell](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide)
- [Bubblewrap CLI — GoogleChromeLabs](https://github.com/GoogleChromeLabs/bubblewrap)
- [Trusted Web Activities Quick Start — Android Developers](https://developer.android.com/develop/ui/views/layout/webapps/guide-trusted-web-activities-version2)
- [PWA in Play — Google Codelab](https://developers.google.com/codelabs/pwa-in-play)
- [Sending web push notifications in web apps and browsers — Apple Developer](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers)
- [The State of Declarative Web Push in 2026 — Aimtell](https://aimtell.com/blog/state-of-declarative-web-push-2026)
- [Do Progressive Web Apps Work on iOS? (2026) — MobiLoud](https://www.mobiloud.com/blog/progressive-web-apps-ios)
- [Building Progressive Web Apps — Capacitor Docs](https://capacitorjs.com/docs/web/progressive-web-apps)
