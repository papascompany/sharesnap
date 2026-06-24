// ⚠️ 서버 전용 — 어드민 권한 판정.
// ADMIN_EMAILS(쉼표구분 env) 허용목록 + 현재 로그인 사용자 이메일 매칭.
// 외부공개 페이지(랜딩)를 바꾸는 권한이므로, 모든 쓰기 라우트에서 서버 측 재검증 필수.

import { createClient } from "@/modules/shared/lib/supabase/server";

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

/** 현재 로그인 사용자가 어드민이면 {email} 반환, 아니면 null. */
export async function getAdmin(): Promise<{ email: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) return null;
  return { email: user.email as string };
}
