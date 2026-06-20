"use client";

import { useState, useSyncExternalStore } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { KakaoLoginButton } from "@/modules/auth/components/KakaoLoginButton";
import { signInWithMagicLink } from "@/modules/auth/services/authService";
import { useToast } from "@/modules/shared/hooks/useToast";
import { APP_NAME } from "@/modules/shared/lib/constants";
import { isKakaoInApp } from "@/modules/shared/utils/browserEnv";

interface LoginPageProps {
  /** 로그인 후 복귀 경로 — 서버 컴포넌트(login/page.tsx)에서 searchParams로 전달 */
  next?: string;
}

// useSyncExternalStore용 no-op 구독 — UA는 세션 중 변하지 않음
function subscribeNoop() {
  return () => {};
}

export function LoginPage({ next }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  // 카카오 인앱 브라우저 여부 — 서버 스냅숏은 false로 하이드레이션 불일치 방지
  const inKakaoApp = useSyncExternalStore(
    subscribeNoop,
    isKakaoInApp,
    () => false,
  );
  const { success, error: toastError } = useToast();

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toastError("이메일을 입력해 주세요.");
      return;
    }
    try {
      setIsSending(true);
      await signInWithMagicLink(email, next);
      success("로그인 링크를 이메일로 보냈습니다.", {
        description: "메일함을 확인해 주세요.",
      });
    } catch (err) {
      toastError(err instanceof Error ? err.message : "이메일 전송 실패");
    } finally {
      setIsSending(false);
    }
  };

  return (
    // min-h-dvh: 카카오 인앱 브라우저 주소창 변동 대응 (100vh 금지 — design-system.md §5.1)
    <div className="relative flex min-h-dvh flex-col bg-sunset">
      {/* 히어로 영역 — 선셋 그라데이션 위 브랜드명 + 태그라인 */}
      <div className="flex flex-1 flex-col items-center justify-center px-8 pt-safe text-white animate-fade-up">
        <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
          {/* 앱 아이콘 글리프 — 폴라로이드 + 태양/산 (icon.svg의 흰색 라인 버전) */}
          <svg
            viewBox="0 0 48 48"
            className="size-9"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <rect x="8" y="6" width="32" height="36" rx="5" />
            <circle cx="20" cy="18" r="3.5" fill="currentColor" stroke="none" />
            <path d="M11 33l9-10 6 6.5 5-5.5 6 9" />
          </svg>
        </div>
        <h1 className="text-[32px] font-bold leading-[1.25] tracking-[-0.02em]">
          {APP_NAME}
        </h1>
        <p className="mt-2 text-[15px] text-white/85">추억을 모아, 빛나게</p>
      </div>

      {/* 로그인 시트 — 바닥에서 올라온 카드 */}
      <div
        className="animate-fade-up space-y-4 rounded-t-3xl bg-background px-6 pt-8
          pb-[calc(2rem+env(safe-area-inset-bottom))] [animation-delay:120ms]"
      >
        <KakaoLoginButton next={next} />

        {/* 카카오 인앱 브라우저: Magic Link가 메일 앱→기본 브라우저로 열려 PKCE
            code_verifier 컨텍스트가 분리되므로 이메일 폼 숨김 (ux-flows.md §2.3~2.4) */}
        {inKakaoApp ? (
          <p className="text-center text-xs text-muted-foreground">
            카카오톡으로 3초 만에 시작할 수 있어요.
          </p>
        ) : (
          <>
            <div className="relative my-2">
              <Separator />
              <span className="absolute left-1/2 -top-2 -translate-x-1/2 bg-background px-2 text-xs text-muted-foreground">
                또는
              </span>
            </div>

            <form onSubmit={handleMagicLink} className="space-y-3">
              <Input
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                // text-base(16px): iOS 입력 포커스 자동 줌 회피 (design-system.md §7.3)
                className="h-12 rounded-xl px-4 text-base focus-visible:border-primary focus-visible:ring-primary/30"
              />
              <Button
                type="submit"
                variant="outline"
                className="h-11 w-full rounded-xl"
                disabled={isSending}
              >
                {isSending ? "전송 중..." : "이메일로 로그인 링크 받기"}
              </Button>
            </form>
          </>
        )}

        <p className="text-center text-xs tracking-normal text-muted-foreground">
          계속 진행하면 이용약관과 개인정보처리방침에 동의하는 것으로 간주됩니다.
        </p>
      </div>
    </div>
  );
}
