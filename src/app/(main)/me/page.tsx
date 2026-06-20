import { redirect } from "next/navigation";
import { UserRound, Mail, KeyRound } from "lucide-react";
import { createClient } from "@/modules/shared/lib/supabase/server";
import { MobileLayout } from "@/modules/shared/components/MobileLayout";
import { SignOutButton } from "@/modules/auth/components/SignOutButton";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";

export const metadata = {
  title: "내정보 — ShareSnap",
};

// 카카오/매직링크 등 인증 프로바이더 라벨 매핑
const PROVIDER_LABEL: Record<string, string> = {
  kakao: "카카오 로그인",
  email: "이메일(매직 링크)",
};

export default async function MePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // (main) 레이아웃에서 이미 가드하지만, 타입 안전을 위해 한 번 더 방어
  if (!user) {
    redirect("/login");
  }

  // user_metadata에 아바타가 있으면 사용 (카카오 프로필 이미지 등)
  const avatarUrl =
    (user.user_metadata?.avatar_url as string | undefined) ??
    (user.user_metadata?.picture as string | undefined) ??
    null;
  const email = user.email ?? "이메일 정보 없음";
  const provider = user.app_metadata?.provider ?? "email";
  const providerLabel = PROVIDER_LABEL[provider] ?? provider;
  // 아바타 폴백용 이니셜 (이메일 첫 글자)
  const initial = (user.email?.[0] ?? "S").toUpperCase();

  return (
    <MobileLayout
      header={
        <div className="flex h-14 items-center px-4">
          <h1 className="text-2xl font-bold tracking-[-0.02em]">내정보</h1>
        </div>
      }
    >
      <div className="flex flex-1 flex-col gap-6 px-4 py-6 animate-fade-up">
        {/* 프로필 카드 */}
        <section
          className="flex items-center gap-4 rounded-2xl border border-border/60
            bg-card p-5 shadow-sm"
        >
          <Avatar size="lg" className="size-14">
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} alt="프로필 이미지" />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-primary">
              {avatarUrl ? null : (
                <UserRound className="size-6" strokeWidth={1.8} aria-hidden />
              )}
              <span className="sr-only">{initial}</span>
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[17px] font-semibold tracking-[-0.01em]">
              {email}
            </p>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              {providerLabel}
            </p>
          </div>
        </section>

        {/* 계정 정보 리스트 */}
        <section className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
          <dl className="divide-y divide-border/60">
            <div className="flex items-center gap-3 px-4 py-3.5">
              <Mail
                className="size-5 shrink-0 text-muted-foreground"
                strokeWidth={1.8}
                aria-hidden
              />
              <dt className="text-[13px] text-muted-foreground">이메일</dt>
              <dd className="ml-auto min-w-0 truncate text-[15px] font-medium">
                {email}
              </dd>
            </div>
            <div className="flex items-center gap-3 px-4 py-3.5">
              <KeyRound
                className="size-5 shrink-0 text-muted-foreground"
                strokeWidth={1.8}
                aria-hidden
              />
              <dt className="text-[13px] text-muted-foreground">로그인 방식</dt>
              <dd className="ml-auto text-[15px] font-medium">
                {providerLabel}
              </dd>
            </div>
          </dl>
        </section>

        {/* 로그아웃 — 하단 배치 (한 손 모바일 원칙) */}
        <div className="mt-auto">
          <SignOutButton />
        </div>
      </div>
    </MobileLayout>
  );
}
