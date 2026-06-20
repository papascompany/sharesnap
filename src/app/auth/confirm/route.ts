import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/modules/shared/lib/supabase/server";

// Magic Link / 이메일 OTP 확인 라우트 — Supabase SSR 공식 이메일 링크 패턴
//
// Supabase가 발송하는 이메일 템플릿의 ConfirmationURL이 ?token_hash=&type= 형태로
// 이 라우트를 호출하면 서버에서 verifyOtp로 세션을 수립한다.
// (/auth/callback 은 OAuth/PKCE code 교환 전용 — 두 라우트는 역할이 다르다)
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  // EmailOtpType: 'signup' | 'invite' | 'magiclink' | 'recovery' | 'email_change' | 'email'
  // 쿼리 문자열이므로 안전 캐스팅 — 잘못된 값이면 verifyOtp가 에러를 반환한다
  const type = searchParams.get("type") as EmailOtpType | null;

  // 오픈 리다이렉트 방지: 내부 경로("/...")만 허용, "//..."(프로토콜 상대 URL)는 거부
  const rawNext = searchParams.get("next");
  const next =
    rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//")
      ? rawNext
      : "/rooms";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  return NextResponse.redirect(`${origin}/login?error=missing_token`);
}
