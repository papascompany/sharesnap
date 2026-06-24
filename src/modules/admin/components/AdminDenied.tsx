import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { SignOutButton } from "@/modules/auth/components/SignOutButton";

/** 로그인했지만 관리자가 아닐 때의 안내(현재 이메일 + 재로그인 유도). */
export function AdminDenied({ email }: { email: string | null | undefined }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        <ShieldAlert className="size-8" strokeWidth={1.5} aria-hidden />
      </div>
      <div className="space-y-1.5">
        <h1 className="text-[18px] font-bold">관리자 전용 페이지예요</h1>
        <p className="text-[14px] leading-relaxed text-muted-foreground">
          지금{" "}
          <span className="font-semibold text-foreground">
            {email ?? "현재 계정"}
          </span>{" "}
          계정으로 로그인되어 있어요.
          <br />
          관리자 계정으로 다시 로그인하면 이용할 수 있어요.
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
