import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { createClient } from "@/modules/shared/lib/supabase/server";
import { isAdminEmail } from "@/modules/admin/services/adminAuth";
import { getLandingContent } from "@/modules/landing/services/landingContentServer";
import { LandingEditor } from "@/modules/admin/components/LandingEditor";
import { SignOutButton } from "@/modules/auth/components/SignOutButton";

export const metadata = {
  title: "랜딩 관리 — ShareSnap",
  robots: { index: false, follow: false },
};

// /admin/landing — ADMIN_EMAILS 전용.
// 미로그인 → /login(미들웨어 + 여기서 belt-and-suspenders).
// 로그인했지만 비어드민 → 친절한 권한 안내(현재 이메일 + 어드민 계정 로그인 유도).
export default async function AdminLandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=%2Fadmin%2Flanding");
  }

  if (!isAdminEmail(user.email)) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-5 px-6 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShieldAlert className="size-8" strokeWidth={1.5} aria-hidden />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-[18px] font-bold">관리자 전용 페이지예요</h1>
          <p className="text-[14px] leading-relaxed text-muted-foreground">
            지금 <span className="font-semibold text-foreground">{user.email}</span>{" "}
            계정으로 로그인되어 있어요.
            <br />
            관리자 계정으로 다시 로그인하면 편집할 수 있어요.
          </p>
        </div>
        <div className="w-full max-w-xs space-y-2.5">
          <SignOutButton />
          <Link
            href="/"
            className="block text-[13px] font-medium text-muted-foreground underline-offset-4 hover:underline"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const content = await getLandingContent();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 px-4 py-4 backdrop-blur-xl">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-[18px] font-bold tracking-[-0.02em]">
            랜딩페이지 관리
          </h1>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {user.email} · 문구와 이미지를 수정하고 저장하세요
          </p>
        </div>
      </header>
      <LandingEditor initial={content} />
    </div>
  );
}
