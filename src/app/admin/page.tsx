import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, ShoppingBag, Flag, ChevronRight } from "lucide-react";
import { createClient } from "@/modules/shared/lib/supabase/server";
import { isAdminEmail } from "@/modules/admin/services/adminAuth";
import { AdminDenied } from "@/modules/admin/components/AdminDenied";
import { SignOutButton } from "@/modules/auth/components/SignOutButton";

export const metadata = {
  title: "관리자 — ShareSnap",
  robots: { index: false, follow: false },
};

const MENU = [
  {
    href: "/admin/orders",
    icon: ShoppingBag,
    title: "주문 관리",
    desc: "포토북·인화 주문과 결제 현황, 배송 상태 변경",
  },
  {
    href: "/admin/reports",
    icon: Flag,
    title: "신고 관리",
    desc: "신고된 콘텐츠 검토 및 조치",
  },
  {
    href: "/admin/landing",
    icon: LayoutDashboard,
    title: "랜딩페이지 관리",
    desc: "랜딩 문구와 이미지 편집",
  },
] as const;

export default async function AdminHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=%2Fadmin");
  if (!isAdminEmail(user.email)) return <AdminDenied email={user.email} />;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 px-4 py-4 backdrop-blur-xl">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-[18px] font-bold tracking-[-0.02em]">관리자</h1>
          <p className="mt-0.5 text-[12px] text-muted-foreground">{user.email}</p>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6">
        <ul className="space-y-3">
          {MENU.map((m) => (
            <li key={m.href}>
              <Link
                href={m.href}
                className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-5 transition active:scale-[0.99]"
              >
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <m.icon className="size-6" strokeWidth={1.7} aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[16px] font-semibold">{m.title}</p>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">
                    {m.desc}
                  </p>
                </div>
                <ChevronRight
                  className="size-5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>

        <div className="mx-auto mt-8 max-w-xs">
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
