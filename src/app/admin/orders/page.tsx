import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/modules/shared/lib/supabase/server";
import { isAdminEmail } from "@/modules/admin/services/adminAuth";
import { AdminDenied } from "@/modules/admin/components/AdminDenied";
import { AdminOrdersClient } from "@/modules/admin/components/AdminOrdersClient";
import {
  listAllOrders,
  summarizeRevenue,
} from "@/modules/admin/services/adminOrders";

export const metadata = {
  title: "주문 관리 — ShareSnap",
  robots: { index: false, follow: false },
};

export default async function AdminOrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=%2Fadmin%2Forders");
  if (!isAdminEmail(user.email)) return <AdminDenied email={user.email} />;

  const orders = await listAllOrders();
  const revenue = summarizeRevenue(orders);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 px-4 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <Link
            href="/admin"
            className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted active:scale-95"
            aria-label="뒤로"
          >
            <ArrowLeft className="size-5" aria-hidden />
          </Link>
          <div>
            <h1 className="text-[18px] font-bold tracking-[-0.02em]">주문 관리</h1>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              포토북·인화 주문과 결제 현황
            </p>
          </div>
        </div>
      </header>
      <AdminOrdersClient
        orders={orders}
        revenue={revenue}
        adminEmail={user.email as string}
      />
    </div>
  );
}
