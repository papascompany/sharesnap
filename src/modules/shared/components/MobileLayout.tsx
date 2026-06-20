"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Images, BookHeart, ShoppingBag, UserRound } from "lucide-react";
import { cn } from "@/modules/shared/lib/utils";

interface MobileLayoutProps {
  children: ReactNode;
  header?: ReactNode;
  hideNav?: boolean;
}

// 하단 네비 항목 — 아이콘 어휘는 design-system.md §6.2 고정
const NAV_ITEMS = [
  { href: "/rooms", label: "공유방", icon: Images },
  { href: "/photobooks", label: "포토북", icon: BookHeart },
  { href: "/orders", label: "주문", icon: ShoppingBag },
  { href: "/me", label: "내정보", icon: UserRound },
] as const;

export function MobileLayout({
  children,
  header,
  hideNav = false,
}: MobileLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh flex-col">
      {header ? (
        <header className="sticky top-0 z-30 border-b border-border/50 bg-background/80 backdrop-blur-xl">
          {header}
        </header>
      ) : null}
      <main
        className={cn(
          "flex flex-1 flex-col",
          // 네비 높이(4rem) + 홈 인디케이터 안전영역만큼 본문 하단 패딩 확보
          hideNav ? "pb-0" : "pb-[calc(4rem+env(safe-area-inset-bottom))]",
        )}
      >
        {children}
      </main>
      {!hideNav ? (
        <nav
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border/50
            bg-background/75 backdrop-blur-xl backdrop-saturate-150
            supports-[backdrop-filter]:bg-background/60
            pb-safe"
        >
          <ul className="mx-auto flex h-16 max-w-md items-stretch justify-around">
            {NAV_ITEMS.map((item) => {
              const active = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <li key={item.href} className="flex flex-1">
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex flex-1 flex-col items-center justify-center gap-1 min-w-16 px-2",
                      "transition-colors duration-150 active:scale-95",
                      active ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    <Icon
                      className="size-6"
                      strokeWidth={active ? 2.4 : 1.8}
                      aria-hidden
                    />
                    <span
                      className={cn(
                        "text-[11px] tracking-normal",
                        active && "font-semibold",
                      )}
                    >
                      {item.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
