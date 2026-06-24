import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Printer, CheckCircle2 } from "lucide-react";
import { createClient } from "@/modules/shared/lib/supabase/server";
import { getTossClientKey } from "@/modules/payment/services/paymentServer";
import { CheckoutForm } from "@/modules/payment/components/CheckoutForm";
import { thumbnailPublicUrl } from "@/modules/print-order/utils/thumbnail";
import {
  PRINT_SIZES,
  PRINT_PAPERS,
  calculatePrintTotal,
  isPrintSize,
  isPrintPaper,
  type PrintItemSpec,
} from "@/modules/print-order/utils/pricing";
import { formatKRW } from "@/modules/photobook/utils/pricing";

export const metadata = {
  title: "인화 주문하기 — ShareSnap",
};

const PAYABLE = new Set(["draft", "confirmed"]);
const ALREADY = new Set(["paid", "printing", "shipped", "delivered"]);

export default async function PrintCheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/print/${id}/checkout`);

  const { data: order } = await supabase
    .from("print_orders")
    .select("id, status, recipient_name")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!order) {
    return (
      <Shell>
        <Empty
          title="주문을 찾을 수 없어요"
          desc="이미 삭제되었거나 접근 권한이 없어요."
          href="/orders"
          cta="주문 내역으로"
        />
      </Shell>
    );
  }

  if (ALREADY.has(order.status)) {
    return (
      <Shell>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="size-8" strokeWidth={1.5} aria-hidden />
          </div>
          <p className="text-[17px] font-semibold">이미 결제된 주문이에요</p>
          <Link
            href="/orders"
            className="inline-flex h-11 items-center rounded-xl bg-primary px-6 text-[15px] font-semibold text-primary-foreground"
          >
            주문 내역 보기
          </Link>
        </div>
      </Shell>
    );
  }

  if (!PAYABLE.has(order.status)) {
    return (
      <Shell>
        <Empty
          title="결제할 수 없는 주문이에요"
          desc="주문 상태를 확인해 주세요."
          href="/orders"
          cta="주문 내역으로"
        />
      </Shell>
    );
  }

  // 항목 로드 + 금액 서버 재산출
  const { data: items } = await supabase
    .from("print_order_items")
    .select("id, photo_id, paper_size, paper_type, quantity")
    .eq("order_id", id);

  const validItems = (items ?? []).filter(
    (it) => isPrintSize(it.paper_size) && isPrintPaper(it.paper_type),
  );
  const specs: PrintItemSpec[] = validItems.map((it) => ({
    size: it.paper_size as PrintItemSpec["size"],
    paper: it.paper_type as PrintItemSpec["paper"],
    quantity: it.quantity,
  }));
  const amount = calculatePrintTotal(specs);
  const totalSheets = specs.reduce((s, it) => s + it.quantity, 0);

  // 대표 썸네일 몇 장
  const photoIds = [...new Set(validItems.map((it) => it.photo_id))].slice(0, 5);
  const { data: photos } = photoIds.length
    ? await supabase
        .from("photos")
        .select("id, thumbnail_path")
        .in("id", photoIds)
    : { data: [] };
  const thumbById = new Map(
    (photos ?? []).map((p) => [p.id, thumbnailPublicUrl(p.thumbnail_path)]),
  );
  const previews = photoIds
    .map((pid) => thumbById.get(pid))
    .filter((u): u is string => Boolean(u));

  const firstSpec = specs[0];
  const optionLabel = firstSpec
    ? `${PRINT_SIZES[firstSpec.size].label} · ${PRINT_PAPERS[firstSpec.paper].label}`
    : "";

  if (amount <= 0) {
    return (
      <Shell>
        <Empty
          title="주문 금액을 계산할 수 없어요"
          desc="사진을 다시 선택해 주세요."
          href="/print/new"
          cta="다시 주문하기"
        />
      </Shell>
    );
  }

  return (
    <Shell>
      <section className="px-4 pt-5">
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Printer className="size-6" strokeWidth={1.6} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold">사진 인화 {totalSheets}매</p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                {optionLabel}
              </p>
            </div>
            <p className="shrink-0 text-[15px] font-bold tabular-nums">
              {formatKRW(amount)}
            </p>
          </div>
          {previews.length > 0 ? (
            <div className="mt-3 flex gap-1.5">
              {previews.map((url, i) => (
                <div
                  key={i}
                  className="relative size-12 overflow-hidden rounded-lg bg-muted ring-1 ring-border/40"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    className="absolute inset-0 size-full object-cover"
                  />
                </div>
              ))}
              {totalSheets > previews.length ? (
                <div className="flex size-12 items-center justify-center rounded-lg bg-muted text-[12px] font-medium text-muted-foreground">
                  +{totalSheets - previews.length}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <CheckoutForm
        orderKind="print"
        orderId={order.id}
        orderName={`ShareSnap 사진 인화 ${totalSheets}매`}
        amount={amount}
        clientKey={getTossClientKey()}
        customerKey={`user_${user.id.replace(/-/g, "").slice(0, 24)}`}
        customerEmail={user.email ?? null}
        defaultRecipientName={order.recipient_name || ""}
      />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border/50 bg-background/85 px-2 backdrop-blur-xl">
        <Link
          href="/orders"
          className="flex size-10 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted active:scale-95"
          aria-label="뒤로"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <h1 className="text-[17px] font-bold tracking-[-0.01em]">인화 주문하기</h1>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}

function Empty({
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
