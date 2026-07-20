import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CreditCard,
  MapPin,
  Printer,
  Receipt,
  Truck,
} from "lucide-react";
import { createClient } from "@/modules/shared/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { thumbnailPublicUrl } from "@/modules/print-order/utils/thumbnail";
import { carrierLabel, trackingUrl } from "@/modules/shared/lib/tracking";
import {
  PRINT_SIZES,
  PRINT_PAPERS,
  isPrintSize,
  isPrintPaper,
} from "@/modules/print-order/utils/pricing";
import { formatKRW } from "@/modules/photobook/utils/pricing";
import type { ShippingAddress } from "@/modules/shared/types/global";

export const metadata = {
  title: "인화 주문 상세 — ShareSnap",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "작성 중",
  confirmed: "결제 대기",
  paid: "결제 완료",
  printing: "인화 중",
  shipped: "배송 중",
  delivered: "배송 완료",
};

const STATUS_TONE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  confirmed: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  paid: "bg-primary/15 text-primary",
  printing: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  shipped: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  delivered: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
};

/** 결제 이후 진행 타임라인 */
const PROGRESS_STEPS = ["paid", "printing", "shipped", "delivered"] as const;

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function PrintOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/print/${id}`);

  const { data: order } = await supabase
    .from("print_orders")
    .select(
      "id, status, total_price, recipient_name, recipient_phone, shipping_address, memo, paid_at, created_at, tracking_carrier, tracking_number",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!order) {
    return (
      <DetailShell>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
          <div className="space-y-1.5">
            <p className="text-[17px] font-semibold">주문을 찾을 수 없어요</p>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              이미 삭제되었거나 접근 권한이 없는 주문이에요.
            </p>
          </div>
          <Link
            href="/orders"
            className="inline-flex h-11 items-center rounded-xl bg-primary px-6 text-[15px] font-semibold text-primary-foreground"
          >
            주문 내역으로
          </Link>
        </div>
      </DetailShell>
    );
  }

  // 주문 항목(사진별 사이즈/용지/매수) + 결제 내역
  const [{ data: items }, { data: payments }] = await Promise.all([
    supabase
      .from("print_order_items")
      .select("id, photo_id, paper_size, paper_type, quantity, unit_price")
      .eq("order_id", order.id),
    supabase
      .from("payments")
      .select("id, status, amount, method, receipt_url, approved_at, created_at")
      .eq("order_kind", "print")
      .eq("order_id", order.id)
      .order("created_at", { ascending: false }),
  ]);
  const payment = payments?.find((p) => p.status === "paid") ?? null;

  // 항목 썸네일
  const photoIds = [
    ...new Set((items ?? []).map((it) => it.photo_id).filter(Boolean)),
  ];
  const { data: photos } = photoIds.length
    ? await supabase
        .from("photos")
        .select("id, thumbnail_path")
        .in("id", photoIds)
    : { data: [] };
  const thumbById = new Map(
    (photos ?? []).map((p) => [p.id, thumbnailPublicUrl(p.thumbnail_path)]),
  );

  const totalSheets = (items ?? []).reduce((s, it) => s + it.quantity, 0);
  const progressIndex = PROGRESS_STEPS.indexOf(
    order.status as (typeof PROGRESS_STEPS)[number],
  );
  const address = (order.shipping_address ?? null) as ShippingAddress | null;
  const canPay = order.status === "draft" || order.status === "confirmed";

  return (
    <DetailShell>
      {/* 주문 요약 */}
      <section className="px-4 pt-5">
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Printer className="size-6" strokeWidth={1.6} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[15px] font-semibold">
                  사진 인화 {totalSheets}매
                </p>
                <Badge
                  className={`shrink-0 border-0 ${STATUS_TONE[order.status] ?? "bg-muted text-muted-foreground"}`}
                >
                  {STATUS_LABEL[order.status] ?? order.status}
                </Badge>
              </div>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                {(items ?? []).length}종 · 주문일{" "}
                {formatDateTime(order.created_at)}
              </p>
            </div>
          </div>

          <dl className="mt-4 space-y-1.5 border-t border-border/50 pt-3 text-[13px]">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">결제 금액</dt>
              <dd className="font-semibold tabular-nums">
                {formatKRW(order.total_price ?? 0)}
              </dd>
            </div>
            {order.paid_at ? (
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">결제 일시</dt>
                <dd className="tabular-nums text-muted-foreground">
                  {formatDateTime(order.paid_at)}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      </section>

      {/* 진행 타임라인 */}
      {progressIndex >= 0 ? (
        <section className="px-4 pt-4">
          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <h2 className="text-[13px] font-semibold text-muted-foreground">
              진행 상황
            </h2>
            <ol className="mt-3 flex items-start">
              {PROGRESS_STEPS.map((step, i) => {
                const done = i <= progressIndex;
                return (
                  <li
                    key={step}
                    className="relative flex flex-1 flex-col items-center"
                  >
                    {i > 0 ? (
                      <div
                        className={`absolute right-1/2 top-3.5 h-0.5 w-full -translate-y-1/2 ${done ? "bg-primary" : "bg-muted"}`}
                        aria-hidden
                      />
                    ) : null}
                    <div
                      className={`relative z-10 flex size-7 items-center justify-center rounded-full text-[11px] font-bold ${
                        done
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                      aria-hidden
                    >
                      {done ? <Check className="size-4" /> : i + 1}
                    </div>
                    <span
                      className={`mt-1.5 text-[11px] ${done ? "font-semibold text-foreground" : "text-muted-foreground"}`}
                    >
                      {STATUS_LABEL[step]}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>
      ) : null}

      {/* 배송 추적 */}
      {order.tracking_number ? (
        <section className="px-4 pt-4">
          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground">
              <Truck className="size-4" aria-hidden />
              배송 추적
            </h2>
            <p className="mt-2 text-[13px]">
              {carrierLabel(order.tracking_carrier)}{" "}
              <span className="tabular-nums text-muted-foreground">
                {order.tracking_number}
              </span>
            </p>
            {trackingUrl(order.tracking_carrier, order.tracking_number) ? (
              <a
                href={
                  trackingUrl(order.tracking_carrier, order.tracking_number) ??
                  "#"
                }
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-[13px] font-semibold transition hover:bg-muted"
              >
                배송 조회
              </a>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* 인화 항목 */}
      {(items ?? []).length > 0 ? (
        <section className="px-4 pt-4">
          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <h2 className="text-[13px] font-semibold text-muted-foreground">
              인화 사진
            </h2>
            <ul className="mt-3 space-y-2">
              {(items ?? []).map((it) => {
                const sizeLabel = isPrintSize(it.paper_size)
                  ? PRINT_SIZES[it.paper_size].label
                  : it.paper_size;
                const paperLabel = isPrintPaper(it.paper_type)
                  ? PRINT_PAPERS[it.paper_type].label
                  : it.paper_type;
                const thumb = thumbById.get(it.photo_id);
                return (
                  <li key={it.id} className="flex items-center gap-3">
                    <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1 text-[13px]">
                      <p className="font-medium">
                        {sizeLabel} · {paperLabel}
                      </p>
                      <p className="text-[12px] text-muted-foreground">
                        {it.quantity}매 · {formatKRW(it.unit_price)}/매
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      ) : null}

      {/* 결제 정보 */}
      {payment ? (
        <section className="px-4 pt-4">
          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground">
              <Receipt className="size-4" aria-hidden />
              결제 정보
            </h2>
            <dl className="mt-3 space-y-1.5 text-[13px]">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">결제 금액</dt>
                <dd className="font-semibold tabular-nums">
                  {formatKRW(payment.amount)}
                </dd>
              </div>
              {payment.method ? (
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">결제 수단</dt>
                  <dd>{payment.method}</dd>
                </div>
              ) : null}
            </dl>
            {payment.receipt_url ? (
              <a
                href={payment.receipt_url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-[13px] font-semibold transition hover:bg-muted"
              >
                영수증 보기
              </a>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* 배송 정보 */}
      {order.recipient_name ? (
        <section className="px-4 pt-4">
          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground">
              <MapPin className="size-4" aria-hidden />
              배송 정보
            </h2>
            <dl className="mt-3 space-y-1.5 text-[13px]">
              <div className="flex items-center justify-between gap-4">
                <dt className="shrink-0 text-muted-foreground">받는 분</dt>
                <dd className="text-right">{order.recipient_name}</dd>
              </div>
              {order.recipient_phone ? (
                <div className="flex items-center justify-between gap-4">
                  <dt className="shrink-0 text-muted-foreground">연락처</dt>
                  <dd className="text-right tabular-nums">
                    {order.recipient_phone}
                  </dd>
                </div>
              ) : null}
              {address ? (
                <div className="flex items-start justify-between gap-4">
                  <dt className="shrink-0 text-muted-foreground">주소</dt>
                  <dd className="text-right leading-relaxed">
                    {address.zipcode ? `(${address.zipcode}) ` : ""}
                    {address.address}
                    {address.addressDetail ? (
                      <>
                        <br />
                        {address.addressDetail}
                      </>
                    ) : null}
                  </dd>
                </div>
              ) : null}
              {order.memo ? (
                <div className="flex items-start justify-between gap-4">
                  <dt className="shrink-0 text-muted-foreground">요청 사항</dt>
                  <dd className="text-right leading-relaxed">{order.memo}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        </section>
      ) : null}

      {/* 액션 */}
      <section className="mt-auto px-4 py-6">
        {canPay ? (
          <Link
            href={`/print/${order.id}/checkout`}
            className="inline-flex h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-primary text-[15px] font-semibold text-primary-foreground transition active:scale-[0.99]"
          >
            <CreditCard className="size-4" aria-hidden />
            {order.status === "draft" ? "주문 계속하기" : "결제하기"}
          </Link>
        ) : null}
      </section>
    </DetailShell>
  );
}

function DetailShell({ children }: { children: React.ReactNode }) {
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
        <h1 className="text-[17px] font-bold tracking-[-0.01em]">인화 주문 상세</h1>
      </header>
      <main className="flex flex-1 flex-col pb-[env(safe-area-inset-bottom)]">
        {children}
      </main>
    </div>
  );
}
