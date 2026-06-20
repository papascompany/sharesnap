// Next.js Middleware 전용 Supabase 클라이언트 (세션 갱신용)
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/modules/shared/types/database";

export const updateSession = async (request: NextRequest) => {
  let supabaseResponse = NextResponse.next({ request });

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
          supabaseResponse = NextResponse.next({ request });
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
    pathname.startsWith("/_next") ||
    // API 라우트는 미들웨어 redirect 금지 — 자체적으로 인증/응답을 처리한다.
    // (비로그인은 라우트가 401 JSON 반환, /api/storige/webhook은 서버-서버라 비로그인이 정상.
    //  미들웨어가 /login으로 redirect하면 fetch가 HTML을 받아 깨지고 웹훅이 차단됨)
    pathname.startsWith("/api") ||
    pathname.startsWith("/icons") ||
    pathname === "/offline" || // PWA 오프라인 폴백 — SW install 프리캐시가 비로그인으로 fetch함
    pathname.startsWith("/.well-known") || // TWA Digital Asset Links 등 (assetlinks.json 선반영)
    pathname === "/manifest.json" ||
    pathname === "/favicon.ico";

  if (!user && !isAuthRoute && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
};
