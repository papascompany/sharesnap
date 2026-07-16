"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { KakaoLoginButton } from "@/modules/auth/components/KakaoLoginButton";
import { signInWithMagicLink } from "@/modules/auth/services/authService";
import { useToast } from "@/modules/shared/hooks/useToast";
import { track } from "@/modules/shared/lib/analytics";
import { APP_NAME } from "@/modules/shared/lib/constants";
import { KAKAO_LOGIN_ENABLED } from "@/modules/shared/lib/featureFlags";
import { isKakaoInApp } from "@/modules/shared/utils/browserEnv";

interface LoginPageProps {
  /** 로그인 후 복귀 경로 — 서버 컴포넌트(login/page.tsx)에서 searchParams로 전달 */
  next?: string;
  /** 인증 실패 사유 — /auth/callback·/auth/confirm이 /login?error= 로 전달 */
  error?: string;
}

// useSyncExternalStore용 no-op 구독 — UA는 세션 중 변하지 않음
function subscribeNoop() {
  return () => {};
}

/** 재전송 쿨다운(초) — 내장 SMTP 발송 한도(2통/시간)를 사용자가 스스로 소진하지 않게 방어 */
const RESEND_COOLDOWN_SEC = 60;

/**
 * 서버가 전달한 error 코드/원문 → 사용자 언어 안내 매핑.
 * Supabase 원문(영문)을 그대로 노출하지 않는다(감사 P0-B: 무언 실패).
 */
function mapAuthError(raw: string): string {
  const c = raw.toLowerCase();
  if (c.includes("expired") || c === "missing_token")
    return "로그인 링크가 만료되었어요. 아래에서 새 링크를 받아 주세요.";
  if (c.includes("provider is not enabled") || c.includes("unsupported provider"))
    return "카카오 로그인이 아직 준비 중이에요. 이메일로 로그인해 주세요.";
  if (c.includes("rate") || c.includes("limit"))
    return "요청이 많아요. 잠시 후 다시 시도해 주세요.";
  if (c === "missing_code" || c.includes("code"))
    return "로그인에 실패했어요. 다시 시도해 주세요.";
  return "로그인에 실패했어요. 다시 시도해 주세요.";
}

/** 매직링크 전송 중 Supabase가 던진 에러 → 사용자 언어 */
function mapSendError(err: unknown): string {
  const msg = err instanceof Error ? err.message.toLowerCase() : "";
  if (msg.includes("rate") || msg.includes("limit") || msg.includes("seconds"))
    return "잠시 후 다시 시도해 주세요. (요청이 많습니다)";
  if (msg.includes("email") && msg.includes("invalid"))
    return "이메일 주소를 다시 확인해 주세요.";
  return "이메일 전송에 실패했어요. 잠시 후 다시 시도해 주세요.";
}

export function LoginPage({ next, error }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  // 카카오 인앱 브라우저 여부 — 서버 스냅숏은 false로 하이드레이션 불일치 방지
  const inKakaoApp = useSyncExternalStore(
    subscribeNoop,
    isKakaoInApp,
    () => false,
  );
  const { success, error: toastError } = useToast();

  // 재전송 쿨다운 카운트다운 (setTimeout 체인 — effect 동기 setState 금지 룰 대응)
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // 매직링크 폼을 숨기는 건 오직 "인앱 + 카카오 로그인 가동" 조합일 때만.
  // (카카오가 꺼져 있으면 인앱이라도 매직링크를 노출 — 로그인 수단 0개 방지, 감사 P0-A)
  const hideMagicLink = inKakaoApp && KAKAO_LOGIN_ENABLED;

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toastError("이메일을 입력해 주세요.");
      return;
    }
    try {
      setIsSending(true);
      track("login_started", { method: "magiclink" });
      await signInWithMagicLink(email, next);
      setSent(true);
      setCooldown(RESEND_COOLDOWN_SEC);
      success("로그인 링크를 이메일로 보냈습니다.", {
        description: "메일함(스팸함 포함)을 확인해 주세요.",
      });
    } catch (err) {
      toastError(mapSendError(err));
    } finally {
      setIsSending(false);
    }
  };

  const resendDisabled = isSending || cooldown > 0;

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
        {/* 인증 실패 안내 배너 — 서버가 error를 실어 보내면 사용자 언어로 표시 */}
        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-center text-[13px] text-destructive"
          >
            {mapAuthError(error)}
          </div>
        ) : null}

        {KAKAO_LOGIN_ENABLED ? <KakaoLoginButton next={next} /> : null}

        {hideMagicLink ? (
          // 카카오 인앱 + 카카오 로그인 가동: Magic Link는 메일 앱→기본 브라우저로 열려
          // PKCE 컨텍스트가 분리되므로 폼을 숨긴다 (ux-flows.md §2.3~2.4)
          <p className="text-center text-xs text-muted-foreground">
            카카오톡으로 3초 만에 시작할 수 있어요.
          </p>
        ) : (
          <>
            {KAKAO_LOGIN_ENABLED ? (
              <div className="relative my-2">
                <Separator />
                <span className="absolute left-1/2 -top-2 -translate-x-1/2 bg-background px-2 text-xs text-muted-foreground">
                  또는
                </span>
              </div>
            ) : null}

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
                variant={KAKAO_LOGIN_ENABLED ? "outline" : "default"}
                className="h-12 w-full rounded-xl"
                disabled={resendDisabled}
              >
                {isSending
                  ? "전송 중..."
                  : cooldown > 0
                    ? `${cooldown}초 후 재전송`
                    : sent
                      ? "로그인 링크 다시 받기"
                      : "이메일로 로그인 링크 받기"}
              </Button>
            </form>

            {sent ? (
              <p className="text-center text-xs text-muted-foreground">
                메일이 안 보이면 <strong>스팸함</strong>을 확인해 주세요.
              </p>
            ) : null}
          </>
        )}

        <p className="text-center text-xs tracking-normal text-muted-foreground">
          계속 진행하면 이용약관과 개인정보처리방침에 동의하는 것으로 간주됩니다.
        </p>
      </div>
    </div>
  );
}
