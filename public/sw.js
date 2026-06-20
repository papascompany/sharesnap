// ShareSnap Service Worker — 수동 관리 (빌드 도구 비의존, docs/mobile-deployment.md §2.2)
// ⚠️ 캐시 전략을 공격적으로 가져가지 말 것 — 실시간 서비스(Realtime 채팅/업로드)라 stale 콘텐츠가 해로움.
//    내비게이션 network-first + 불변 자산 cache-first가 안전 하한선 (TWA/Lighthouse 통과에 충분).

const CACHE_VERSION = 'v1'; // ← 배포 시 버전을 올려 구버전 캐시 무효화 (v1 → v2 → ...)
const CACHE_NAME = `sharesnap-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline';

// 설치 시 프리캐시할 리소스 (실존 파일만 — 하나라도 404면 install 전체가 실패함)
const PRECACHE = [
  OFFLINE_URL,
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/icon-192.png',
];

// ── install: 오프라인 폴백 페이지 프리캐시 ──────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)),
  );
  // 새 SW가 대기 없이 즉시 활성화되도록
  self.skipWaiting();
});

// ── activate: 구버전 캐시 정리 ──────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ── fetch: 요청 종류별 전략 분기 ────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // ① POST 등 비GET 요청은 절대 캐시하지 않음 (업로드/뮤테이션 안전)
  if (request.method !== 'GET') return;

  // ② Supabase API/Auth/Storage/Realtime은 절대 캐시하지 않음 — 브라우저 기본 동작에 위임
  if (url.hostname.endsWith('.supabase.co')) return;

  // ③ 페이지 내비게이션: network-first → 오프라인 시 /offline 폴백
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches
          .match(OFFLINE_URL)
          .then((cached) => cached ?? Response.error()),
      ),
    );
    return;
  }

  // ④ Next 정적 자산(/_next/static — 해시 파일명이라 불변) + 앱 아이콘: cache-first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/')
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            // 정상 응답만 캐시에 적재 (opaque/에러 응답 캐시 방지)
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
    return;
  }

  // ⑤ 그 외(이미지 CDN 등)는 브라우저 기본 동작에 위임 (respondWith 호출 안 함)
});

// ── push: Web Push 수신 골격 — Phase 5~6에서 활성화 예정 ────────────────
// TODO(Phase 5~6): VAPID 키 발급 + 구독 저장(Supabase) 후 아래 주석 해제
// self.addEventListener('push', (event) => {
//   const data = event.data?.json() ?? {};
//   event.waitUntil(
//     self.registration.showNotification(data.title ?? 'ShareSnap', {
//       body: data.body,
//       icon: '/icons/icon-192.png',
//       badge: '/icons/icon-192.png',
//       data: { url: data.url ?? '/rooms' },
//     }),
//   );
// });
//
// self.addEventListener('notificationclick', (event) => {
//   event.notification.close();
//   event.waitUntil(clients.openWindow(event.notification.data?.url ?? '/rooms'));
// });
