import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  BookHeart,
  Check,
  CreditCard,
  FileText,
  MapPin,
  PencilLine,
  Receipt,
} from "lucide-react";
import { createClient } from "@/modules/shared/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { KakaoShareButton } from "@/modules/room/components/KakaoShareButton";
import { KAKAO_SHARE_ENABLED } from "@/modules/shared/lib/featureFlags";
import { BOOK_SIZES } from "@/modules/shared/lib/constants";
import {
  calculatePhotobookPrice,
  formatKRW,
} from "@/modules/photobook/utils/pricing";
import {
  PHOTOBOOK_STATUS_META,
  statusBadgeClass,
} from "@/modules/photobook/utils/status";
import type { PhotobookStatus, ShippingAddress } from "@/modules/shared/types/global";

export const metadata = {
  title: "주문 상세 — ShareSnap",
};

/** 편집 이어가기가 가능한 상태 (PhotobookList와 동일 기준) */
const EDITABLE = new Set<PhotobookStatus>(["draft", "editing", "confirmed"]);
/** 결제(주문) 가능한 상태 — 편집 완료 후 */
const PAYABLE = new Set<PhotobookStatus>([
  "confirmed",
  "generating_pdf",
  "pdf_ready",
]);

/** 주문 접수 이후 진행 타임라인 단계 (순서 고정) */
const PROGRESS_STEPS: readonly PhotobookStatus[] = [
  "paid",
  "printing",
  "shipped",
  "delivered",
];

/** 서버 렌더 타임존(UTC) 무관하게 한국 시간으로 절대 일시 표기 */
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

export default async function PhotobookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/photobooks/${id}`);

  const { data: order } = await supabase
    .from("photobook_orders")
    .select(
      "id, room_id, book_size, page_count, quantity, status, order_no, total_price, pdf_path, recipient_name, recipient_phone, shipping_address, memo, paid_at, created_at",
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
              이미 삭제되었거나 접근 권한이 없는 포토북이에요.
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

  // 방 이름(요약용) + 결제 내역(paid 우선, RLS로 본인 것만)
  const [{ data: room }, { data: payments }] = await Promise.all([
    supabase
      .from("rooms")
      .select("name, share_code")
      .eq("id", order.room_id)
      .maybeSingle(),
    supabase
      .from("payments")
      .select("id, status, amount, method, receipt_url, approved_at, created_at")
      .eq("order_kind", "photobook")
      .eq("order_id", order.id)
      .order("created_at", { ascending: false }),
  ]);
  const payment =
    payments?.find((p) => p.status === "paid") ?? null;

  const status = order.status as PhotobookStatus;
  const meta = PHOTOBOOK_STATUS_META[status];
  const sizeLabel = BOOK_SIZES[order.book_size].label;
  const quantity = order.quantity ?? 1;
  const price =
    order.total_price ??
    calculatePhotobookPrice(order.book_size, order.page_count, quantity);
  const isEstimate = order.total_price == null;
  const canEdit = EDITABLE.has(status);
  const canPay = PAYABLE.has(status);
  const hasPdf = Boolean(order.pdf_path);
  const address = (order.shipping_address ?? null) as ShippingAddress | null;
  // 진행 타임라인은 결제 완료 이후에만 의미가 있다 (ordered는 접수 배지로 충분)
  const progressIndex = PROGRESS_STEPS.indexOf(status);

  return (
    <DetailShell>
      {/* 주문 요약 */}
      <section className="px-4 pt-5">
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BookHeart className="size-6" strokeWidth={1.6} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="line-clamp-1 text-[15px] font-semibold">
                  {room?.name ? `${room.name} 포토북` : "포토북"}
                </p>
                <Badge
                  className={`shrink-0 border-0 ${statusBadgeClass(status)}`}
                >
                  {meta.label}
                </Badge>
              </div>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                {sizeLabel}
                {order.page_count > 0 ? ` · ${order.page_count}면` : ""}
                {quantity > 1 ? ` · ${quantity}권` : ""}
                {order.order_no != null ? ` · 주문번호 ${order.order_no}` : ""}
              </p>
            </div>
          </div>

          <dl className="mt-4 space-y-1.5 border-t border-border/50 pt-3 text-[13px]">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">
                {isEstimate ? "예상 금액" : "결제 금액"}
              </dt>
              <dd className="font-semibold tabular-nums">{formatKRW(price)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">주문 생성</dt>
              <dd className="tabular-nums text-muted-foreground">
                {formatDateTime(order.created_at)}
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

      {/* 진행 타임라인 — 결제 완료 이후 단계 시각화 */}
      {progressIndex >= 0 ? (
        <section className="px-4 pt-4">
          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <h2 className="text-[13px] font-semibold text-muted-foreground">
              배송 진행
            </h2>
            <ol className="mt-3 flex items-start">
              {PROGRESS_STEPS.map((step, i) => {
                const done = i <= progressIndex;
                return (
                  <li
                    key={step}
                    className="relative flex flex-1 flex-col items-center"
                  >
                    {/* 이전 단계와의 연결선 — 원 중앙 높이(size-7의 절반) */}
                    {i > 0 ? (
                      <div
                        className={`absolute right-1/2 top-3.5 h-0.5 w-full -translate-y-1/2 ${
                          done ? "bg-primary" : "bg-muted"
                        }`}
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
                      className={`mt-1.5 text-[11px] ${
                        done
                          ? "font-semibold text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {PHOTOBOOK_STATUS_META[step].label}
                    </span>
                  </li>
                );
              })}
            </ol>
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
              {payment.approved_at ? (
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">승인 일시</dt>
                  <dd className="tabular-nums text-muted-foreground">
                    {formatDateTime(payment.approved_at)}
                  </dd>
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
                <FileText className="size-4" aria-hidden />
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

      {/* 액션 — 상태별 다음 행동 (PhotobookList와 동일 기준) */}
      <section className="mt-auto px-4 py-6">
        <div className="flex flex-col gap-2">
          {canPay ? (
            <Link
              href={`/photobooks/${order.id}/checkout`}
              className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl bg-primary text-[15px] font-semibold text-primary-foreground transition active:scale-[0.99]"
            >
              <CreditCard className="size-4" aria-hidden />
              주문하기
            </Link>
          ) : null}
          {canEdit ? (
            <Link
              href={`/rooms/${order.room_id}/photobook`}
              className={`inline-flex h-12 items-center justify-center gap-1.5 rounded-xl text-[15px] font-semibold transition active:scale-[0.99] ${
                canPay
                  ? "border border-border bg-card text-foreground"
                  : "bg-primary text-primary-foreground"
              }`}
            >
              <PencilLine className="size-4" aria-hidden />
              편집 이어서
            </Link>
          ) : null}
          {hasPdf ? (
            <a
              href={`/api/photobook/orders/${order.id}/pdf`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl border border-border bg-card text-[15px] font-semibold text-foreground transition active:scale-[0.99]"
            >
              <FileText className="size-4" aria-hidden />
              PDF 보기
            </a>
          ) : null}
          {/* 완성 포토북 카톡 자랑 — 유기적 획득 루프(감사 P2). 카카오 공유 가동 시에만 노출 */}
          {hasPdf && KAKAO_SHARE_ENABLED && room?.share_code ? (
            <KakaoShareButton
              variant="photobook"
              shareCode={room.share_code}
              roomName={room.name ?? "포토북"}
              photoCount={order.page_count}
            />
          ) : null}
        </div>
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
        <h1 className="text-[17px] font-bold tracking-[-0.01em]">주문 상세</h1>
      </header>
      <main className="flex flex-1 flex-col pb-[env(safe-area-inset-bottom)]">
        {children}
      </main>
    </div>
  );
}
