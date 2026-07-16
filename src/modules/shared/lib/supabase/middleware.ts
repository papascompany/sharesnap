// Next.js Middleware 전용 Supabase 클라이언트 (세션 갱신용)
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/modules/shared/types/database";

export const updateSession = async (request: NextRequest) => {
  // 서버 컴포넌트((main) 레이아웃 등)가 현재 경로를 알 수 있도록 요청 헤더에 pathname 주입
  // → 레이아웃 이중 가드도 로그인 후 원래 자리로 복귀시킬 수 있다 (감사 세션#11).
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(
    "x-pathname",
    request.nextUrl.pathname + request.nextUrl.search,
  );

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // 세션 갱신 (refresh token 사용)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/join");
  const isPublicRoute =
    pathname === "/" ||
    // 법적 고지(약관·개인정보처리방침) — 비로그인·크롤러 접근 허용(앱스토어·PG 심사가 URL 요구)
    pathname === "/terms" ||
    pathname === "/privacy" ||
    pathname.startsWith("/_next") ||
    // API 라우트는 미들웨어 redirect 금지 — 자체적으로 인증/응답을 처리한다.
    // (비로그인은 라우트가 401 JSON 반환, /api/storige/webhook은 서버-서버라 비로그인이 정상.
    //  미들웨어가 /login으로 redirect하면 fetch가 HTML을 받아 깨지고 웹훅이 차단됨)
    pathname.startsWith("/api") ||
    pathname.startsWith("/icons") ||
    pathname === "/offline" || // PWA 오프라인 폴백 — SW install 프리캐시가 비로그인으로 fetch함
    pathname.startsWith("/.well-known") || // TWA Digital Asset Links 등 (assetlinks.json 선반영)
    // OG/트위터 공유 이미지(next/og 메타 라우트) — 카톡/슬랙/트위터 크롤러가 비로그인으로 fetch.
    // /login 리다이렉트 시 봇이 PNG 대신 HTML을 받아 썸네일이 깨진다.
    pathname.startsWith("/opengraph-image") ||
    pathname.startsWith("/twitter-image") ||
    pathname === "/manifest.json" ||
    pathname === "/favicon.ico";

  if (!user && !isAuthRoute && !isPublicRoute) {
    const url = request.nextUrl.clone();
    // 원래 목적지를 next로 보존 → 로그인 후 그 자리로 복귀 (감사 세션#11: 재방문 복귀).
    // 수신측(/auth/callback·/auth/confirm)이 '/' 시작·'//' 거부 검증을 이미 수행한다.
    const nextTarget = pathname + request.nextUrl.search;
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", nextTarget);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
};
