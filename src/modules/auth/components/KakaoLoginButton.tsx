"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { signInWithKakao } from "@/modules/auth/services/authService";
import { useToast } from "@/modules/shared/hooks/useToast";
import { track } from "@/modules/shared/lib/analytics";

interface KakaoLoginButtonProps {
  /** 로그인 후 복귀 경로 (예: /join/{shareCode}?auto=1) — 초대 맥락 보존용 */
  next?: string;
}

export function KakaoLoginButton({ next }: KakaoLoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { error: toastError } = useToast();

  const handleClick = async () => {
    try {
      setIsLoading(true);
      track("login_started", { method: "kakao" });
      await signInWithKakao(next);
      // OAuth 리디렉트가 발생하므로 이후 코드는 실행되지 않음
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "카카오 로그인에 실패했습니다.";
      toastError(message);
      setIsLoading(false);
    }
  };

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      // 카카오 디자인 가이드: 컨테이너 #FEE500 + 라벨 #191919, 다크모드 변형 없음 (토큰으로 강제)
      className="h-12 w-full rounded-xl bg-kakao text-base font-semibold text-kakao-foreground
        transition-transform hover:bg-kakao/90 active:scale-[0.97] disabled:opacity-70
        dark:bg-kakao dark:text-kakao-foreground"
      size="lg"
    >
      <svg
        viewBox="0 0 24 24"
        className="mr-2 h-5 w-5"
        aria-hidden
        fill="currentColor"
      >
        <path d="M12 3C6.48 3 2 6.48 2 10.8c0 2.78 1.86 5.22 4.66 6.58-.17.58-1.06 3.6-1.07 3.67 0 0-.01.06.03.09.04.03.08.02.08.02.12 0 3.42-2.24 4.04-2.66.74.11 1.51.17 2.26.17 5.52 0 10-3.48 10-7.8S17.52 3 12 3z" />
      </svg>
      {isLoading ? "카카오 로그인 중..." : "카카오로 시작하기"}
    </Button>
  );
}
