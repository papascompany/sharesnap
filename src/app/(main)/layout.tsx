import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/modules/shared/lib/supabase/server";
import { AuthGuard } from "@/modules/auth/components/AuthGuard";
import { ErrorBoundary } from "@/modules/shared/components/ErrorBoundary";

export default async function MainLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // 미들웨어가 심은 x-pathname으로 로그인 후 원래 자리 복귀 (내부 경로만 — 오픈 리다이렉트 방지)
    const pathname = (await headers()).get("x-pathname");
    const next =
      pathname && pathname.startsWith("/") && !pathname.startsWith("//")
        ? `?next=${encodeURIComponent(pathname)}`
        : "";
    redirect(`/login${next}`);
  }

  // AuthGuard: SPA 체류 중 세션 만료(다른 기기 로그아웃·토큰 revoke·인앱 스토리지 소실) 감지 (감사 P2)
  return (
    <AuthGuard>
      <ErrorBoundary>{children}</ErrorBoundary>
    </AuthGuard>
  );
}
