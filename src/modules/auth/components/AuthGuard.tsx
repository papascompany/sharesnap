"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { LoadingSpinner } from "@/modules/shared/components/LoadingSpinner";

interface AuthGuardProps {
  children: ReactNode;
  fallbackPath?: string;
}

// 클라이언트 측 추가 가드 — 서버 미들웨어가 1차로 보호하지만 SPA 전환 시 보호용
export function AuthGuard({
  children,
  fallbackPath = "/login",
}: AuthGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace(fallbackPath);
    }
  }, [isLoading, user, fallbackPath, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" label="확인 중..." />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
