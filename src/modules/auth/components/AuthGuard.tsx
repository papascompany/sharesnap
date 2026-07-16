"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/modules/auth/hooks/useAuth";

// 클라이언트 측 추가 가드 — 서버 미들웨어/레이아웃이 1차로 보호하지만,
// SPA 체류 중 세션이 만료되는 경우(다른 기기 로그아웃·토큰 revoke·인앱 스토리지 소실)를
// 감지해 재로그인으로 유도한다. 복귀 경로(next)를 부착해 로그인 후 같은 자리로 되돌린다. (감사 P2)
export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading || user) return;
    const target = pathname && pathname.startsWith("/") ? pathname : "/rooms";
    router.replace(`/login?next=${encodeURIComponent(target)}`);
  }, [isLoading, user, pathname, router]);

  // 서버(미들웨어+레이아웃)가 이미 1차 통과시켰으므로 초기 로딩엔 낙관적으로 콘텐츠를 보여준다
  // (초기 진입마다 스피너가 깜빡이지 않도록). 만료가 확정되면 그때 화면을 비우고 리다이렉트.
  if (!isLoading && !user) return null;

  return <>{children}</>;
}
