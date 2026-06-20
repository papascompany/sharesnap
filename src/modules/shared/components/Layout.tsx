import type { ReactNode } from "react";
import { cn } from "@/modules/shared/lib/utils";

interface LayoutProps {
  children: ReactNode;
  header?: ReactNode;
  className?: string;
}

// 데스크톱/공통 레이아웃 — 모바일은 MobileLayout 사용
export function Layout({ children, header, className }: LayoutProps) {
  return (
    <div className={cn("flex min-h-screen flex-col", className)}>
      {header ? (
        <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
          {header}
        </header>
      ) : null}
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
