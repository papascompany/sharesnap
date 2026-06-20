import { type NextRequest } from "next/server";
import { updateSession } from "@/modules/shared/lib/supabase/middleware";

// Next.js 16: middleware → proxy 컨벤션으로 마이그레이션 (세션 갱신 + 인증 가드)
export default async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // _next 내부 파일과 이미지/아이콘 같은 정적 자산을 제외하고 모든 경로 매칭
    // .well-known: TWA Digital Asset Links(assetlinks.json) 정적 서빙 — 미들웨어 자체를 안 타게 제외(TWA 검증 위험 차단)
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|\\.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
