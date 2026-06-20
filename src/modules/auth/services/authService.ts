"use client";

// 인증 서비스 — 클라이언트 측 로그인/로그아웃 흐름
import { createClient } from "@/modules/shared/lib/supabase/client";
import type { AuthSession, AuthUser } from "@/modules/auth/types";

// 콜백 URL 생성 — next(로그인 후 복귀 경로)를 안전하게 부착
// 내부 경로("/...")만 허용, "//..."(프로토콜 상대 URL)는 오픈 리다이렉트 방지를 위해 차단
function buildCallbackUrl(next?: string): string {
  const callbackUrl = new URL("/auth/callback", window.location.origin);
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    callbackUrl.searchParams.set("next", next);
  }
  return callbackUrl.toString();
}

export async function signInWithKakao(next?: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "kakao",
    options: {
      redirectTo: buildCallbackUrl(next),
    },
  });
  if (error) throw error;
  return data;
}

export async function signInWithMagicLink(email: string, next?: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // 인증 라우트 역할 구분:
      // - /auth/callback — OAuth/PKCE code 교환 전용 (?code= → exchangeCodeForSession).
      //   Magic Link도 코드 플로우로 떨어지는 경우가 있어 emailRedirectTo는 그대로 유지.
      // - /auth/confirm — Supabase 이메일 템플릿의 token_hash 검증 전용
      //   (?token_hash=&type= → verifyOtp, SSR 공식 패턴).
      //   이메일 템플릿 ConfirmationURL을 /auth/confirm 으로 바꾸면 그쪽 경로를 탄다.
      emailRedirectTo: buildCallbackUrl(next),
    },
  });
  if (error) throw error;
  return data;
}

export async function signOut(): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getSession(): Promise<AuthSession | null> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}
