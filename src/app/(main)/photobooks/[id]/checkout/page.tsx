import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, BookHeart, CheckCircle2 } from "lucide-react";
import { createClient } from "@/modules/shared/lib/supabase/server";
import { getTossClientKey } from "@/modules/payment/services/paymentServer";
import { CheckoutForm } from "@/modules/payment/components/CheckoutForm";
import {
  calculatePhotobookPrice,
  formatKRW,
} from "@/modules/photobook/utils/pricing";
import { BOOK_SIZES } from "@/modules/shared/lib/constants";

export const metadata = {
  title: "주문하기 — ShareSnap",
};

// 편집 완료 이후 결제 가능한 상태
const PAYABLE = new Set(["confirmed", "generating_pdf", "pdf_ready"]);
const ALREADY = new Set(["ordered", "paid", "printing", "shipped", "delivered"]);

export default async function PhotobookCheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/photobooks/${id}/checkout`);

  const { data: order } = await supabase
    .from("photobook_orders")
    .select(
      "id, room_id, book_size, page_count, quantity, status, recipient_name",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!order) {
    return (
      <CheckoutShell>
        <EmptyState
          title="주문을 찾을 수 없어요"
          desc="이미 삭제되었거나 접근 권한이 없는 포토북이에요."
          href="/photobooks"
          cta="내 포토북으로"
        />
      </CheckoutShell>
    );
  }

  // 편집 미완료 → 편집 이어가기 유도
  if (!PAYABLE.has(order.status) && !ALREADY.has(order.status)) {
    return (
      <CheckoutShell>
        <EmptyState
          title="편집을 먼저 완료해 주세요"
          desc="포토북 편집을 마치면 주문할 수 있어요."
          href={`/rooms/${order.room_id}/photobook`}
          cta="편집 이어가기"
        />
      </CheckoutShell>
    );
  }

  // 이미 주문됨 → 주문 내역
  if (ALREADY.has(order.status)) {
    return (
      <CheckoutShell>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="size-8" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="space-y-1.5">
            <p className="text-[17px] font-semibold">이미 주문된 포토북이에요</p>
            <p className="text-[13px] text-muted-foreground">
              주문 내역에서 진행 상황을 확인할 수 있어요.
            </p>
          </div>
          <Link
            href="/orders"
            className="inline-flex h-11 items-center rounded-xl bg-primary px-6 text-[15px] font-semibold text-primary-foreground"
          >
            주문 내역 보기
          </Link>
        </div>
      </CheckoutShell>
    );
  }

  // 방 이름(요약용)
  const { data: room } = await supabase
    .from("rooms")
    .select("name")
    .eq("id", order.room_id)
    .maybeSingle();

  const amount = calculatePhotobookPrice(
    order.book_size,
    order.page_count,
    order.quantity ?? 1,
  );
  const sizeLabel = BOOK_SIZES[order.book_size].label;

  return (
    <CheckoutShell>
      {/* 주문 요약 */}
      <section className="px-4 pt-5">
        <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BookHeart className="size-6" strokeWidth={1.6} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-1 text-[15px] font-semibold">
              {room?.name ? `${room.name} 포토북` : "포토북"}
            </p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {sizeLabel}
              {order.page_count > 0 ? ` · ${order.page_count}면` : ""}
              {order.quantity > 1 ? ` · ${order.quantity}권` : ""}
            </p>
          </div>
          <p className="shrink-0 text-[15px] font-bold tabular-nums">
            {formatKRW(amount)}
          </p>
        </div>
      </section>

      <CheckoutForm
        orderKind="photobook"
        orderId={order.id}
        orderName={room?.name ? `${room.name} 포토북` : "ShareSnap 포토북"}
        amount={amount}
        clientKey={getTossClientKey()}
        customerKey={`user_${user.id.replace(/-/g, "").slice(0, 24)}`}
        customerEmail={user.email ?? null}
        defaultRecipientName={order.recipient_name ?? ""}
      />
    </CheckoutShell>
  );
}

function CheckoutShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border/50 bg-background/85 px-2 backdrop-blur-xl">
        <Link
          href="/photobooks"
          className="flex size-10 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted active:scale-95"
          aria-label="뒤로"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <h1 className="text-[17px] font-bold tracking-[-0.01em]">주문하기</h1>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}

function EmptyState({
  title,
  desc,
  href,
  cta,
}: {
  title: string;
  desc: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="space-y-1.5">
        <p className="text-[17px] font-semibold">{title}</p>
        <p className="text-[13px] leading-relaxed text-muted-foreground">{desc}</p>
      </div>
      <Link
        href={href}
        className="inline-flex h-11 items-center rounded-xl bg-primary px-6 text-[15px] font-semibold text-primary-foreground"
      >
        {cta}
      </Link>
    </div>
  );
}
