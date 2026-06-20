"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/modules/auth/services/authService";
import { useToast } from "@/modules/shared/hooks/useToast";

// 로그아웃 버튼 — authService.signOut() 배선 + 완료 후 /login 으로 이동
export function SignOutButton() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      await signOut();
      success("로그아웃했어요");
      // replace로 히스토리에 보호된 화면이 남지 않게 처리
      router.replace("/login");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "로그아웃에 실패했습니다.";
      toastError(message);
      setIsLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleSignOut}
      disabled={isLoading}
      className="h-12 w-full rounded-xl text-base font-medium text-destructive
        transition-transform active:scale-[0.97] disabled:opacity-70"
    >
      <LogOut className="mr-2 size-5" aria-hidden />
      {isLoading ? "로그아웃 중..." : "로그아웃"}
    </Button>
  );
}
