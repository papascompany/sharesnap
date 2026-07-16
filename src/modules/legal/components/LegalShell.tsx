import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LEGAL_EFFECTIVE_DATE } from "@/modules/shared/lib/businessInfo";

interface LegalShellProps {
  title: string;
  children: ReactNode;
}

// 이용약관·개인정보처리방침 공통 셸 — 뒤로가기 헤더 + 읽기 좋은 본문 컨테이너
export function LegalShell({ title, children }: LegalShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border/50 bg-background/85 px-2 backdrop-blur-xl">
        <Link
          href="/"
          className="flex size-10 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted active:scale-95"
          aria-label="뒤로"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <h1 className="text-[17px] font-bold tracking-[-0.01em]">{title}</h1>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-6 pb-[max(env(safe-area-inset-bottom),2rem)]">
        <p className="mb-6 text-[12px] text-muted-foreground">
          시행일: {LEGAL_EFFECTIVE_DATE}
        </p>
        <div className="space-y-6 text-[14px] leading-relaxed text-foreground/90">
          {children}
        </div>
      </main>
    </div>
  );
}

/** 법적 문서 조항 블록 — 소제목 + 본문 */
export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-[15px] font-bold tracking-[-0.01em] text-foreground">
        {heading}
      </h2>
      <div className="space-y-2 text-[13.5px] leading-[1.7] text-muted-foreground">
        {children}
      </div>
    </section>
  );
}
