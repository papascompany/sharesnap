"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BookHeart, Printer, Loader2, Phone, MapPin } from "lucide-react";
import { formatKRW } from "@/modules/photobook/utils/pricing";
import { formatRelativeTime } from "@/modules/shared/lib/utils";
import type { AdminOrder } from "@/modules/admin/types";
import type { OrderKind } from "@/modules/payment/types";

const PHOTOBOOK_STATUSES = [
  "draft",
  "editing",
  "confirmed",
  "generating_pdf",
  "pdf_ready",
  "ordered",
  "paid",
  "printing",
  "shipped",
  "delivered",
];
const PRINT_STATUSES = ["draft", "confirmed", "paid", "printing", "shipped", "delivered"];

const STATUS_LABEL: Record<string, string> = {
  draft: "작성 중",
  editing: "편집 중",
  confirmed: "편집/결제 대기",
  generating_pdf: "PDF 생성 중",
  pdf_ready: "제작 준비 완료",
  ordered: "주문 접수",
  paid: "결제 완료",
  printing: "인쇄 중",
  shipped: "배송 중",
  delivered: "배송 완료",
};

const PAY_LABEL: Record<string, string> = {
  ready: "결제 대기",
  paid: "결제 완료",
  canceled: "결제 취소",
  failed: "결제 실패",
};

export function AdminOrdersClient({
  orders,
  revenue,
  adminEmail,
}: {
  orders: AdminOrder[];
  revenue: { paidCount: number; paidRevenue: number };
  adminEmail: string;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {/* 매출 요약 */}
      <div className="mb-5 grid grid-cols-3 gap-3">
        <SummaryCard label="전체 주문" value={`${orders.length}건`} />
        <SummaryCard label="결제 완료" value={`${revenue.paidCount}건`} />
        <SummaryCard label="결제 매출" value={formatKRW(revenue.paidRevenue)} accent />
      </div>

      {orders.length === 0 ? (
        <p className="py-16 text-center text-[14px] text-muted-foreground">
          아직 주문이 없어요.
        </p>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <AdminOrderRow key={`${o.kind}:${o.id}`} order={o} />
          ))}
        </ul>
      )}

      <p className="mt-6 text-center text-[11px] text-muted-foreground">
        {adminEmail} · 상태를 바꾸면 고객 주문 내역에 즉시 반영돼요
      </p>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-[16px] font-bold tabular-nums ${
          accent ? "text-primary" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function AdminOrderRow({ order }: { order: AdminOrder }) {
  const [status, setStatus] = useState(order.status);
  const [savedStatus, setSavedStatus] = useState(order.status);
  const [saving, setSaving] = useState(false);
  const dirty = status !== savedStatus;
  const options = order.kind === "photobook" ? PHOTOBOOK_STATUSES : PRINT_STATUSES;
  const Icon = order.kind === "photobook" ? BookHeart : Printer;

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderKind: order.kind as OrderKind,
          orderId: order.id,
          status,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.message || j.error || "상태 변경 실패");
      toast.success("주문 상태를 변경했어요.");
      setSavedStatus(status); // 저장 성공 — 기준값 갱신(다음 dirty 비교용)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "상태 변경 실패");
      setStatus(savedStatus);
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" strokeWidth={1.7} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[15px] font-semibold">{order.label}</p>
            {order.amount != null ? (
              <span className="text-[14px] font-semibold tabular-nums text-muted-foreground">
                {formatKRW(order.amount)}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {order.sub ? `${order.sub} · ` : ""}
            {formatRelativeTime(order.createdAt)}
            {order.paymentStatus
              ? ` · ${PAY_LABEL[order.paymentStatus] ?? order.paymentStatus}`
              : ""}
            {order.paymentMethod ? ` (${order.paymentMethod})` : ""}
          </p>

          {/* 배송 정보 */}
          {order.recipientName || order.shippingText ? (
            <div className="mt-2 space-y-0.5 rounded-lg bg-muted/40 px-3 py-2 text-[12px] text-muted-foreground">
              {order.recipientName ? (
                <p className="flex items-center gap-1.5">
                  <Phone className="size-3" aria-hidden />
                  {order.recipientName}
                  {order.recipientPhone ? ` · ${order.recipientPhone}` : ""}
                </p>
              ) : null}
              {order.shippingText ? (
                <p className="flex items-start gap-1.5">
                  <MapPin className="mt-0.5 size-3 shrink-0" aria-hidden />
                  <span>{order.shippingText}</span>
                </p>
              ) : null}
            </div>
          ) : null}

          {/* 상태 변경 */}
          <div className="mt-3 flex items-center gap-2">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-9 flex-1 rounded-lg border border-border bg-background px-2.5 text-[13px] outline-none focus:ring-2 focus:ring-ring/40"
            >
              {options.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s] ?? s}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={save}
              disabled={!dirty || saving}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-[13px] font-semibold text-primary-foreground transition active:scale-95 disabled:opacity-40"
            >
              {saving ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : null}
              저장
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
