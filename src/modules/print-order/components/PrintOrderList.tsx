"use client";

import Link from "next/link";
import { Printer, CreditCard } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/modules/shared/components/Skeleton";
import { formatRelativeTime } from "@/modules/shared/lib/utils";
import { formatKRW } from "@/modules/photobook/utils/pricing";
import { useMyPrintOrders } from "@/modules/print-order/hooks/usePrintOrders";
import type {
  PrintOrderListItem,
  PrintOrderStatus,
} from "@/modules/print-order/types";

const STATUS_META: Record<
  PrintOrderStatus,
  { label: string; cls: string }
> = {
  draft: { label: "작성 중", cls: "bg-muted text-muted-foreground" },
  confirmed: {
    label: "결제 대기",
    cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
  paid: { label: "결제 완료", cls: "bg-primary/15 text-primary" },
  printing: {
    label: "인쇄 중",
    cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
  shipped: {
    label: "배송 중",
    cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
  delivered: {
    label: "배송 완료",
    cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  },
};

const PAYABLE = new Set(["draft", "confirmed"]);

export function PrintOrderList() {
  const { orders, isLoading, error } = useMyPrintOrders();

  if (isLoading) {
    return (
      <ul className="flex flex-col gap-3 px-4 py-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <li key={i}>
            <Skeleton className="h-24 w-full rounded-2xl" />
          </li>
        ))}
      </ul>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-12 text-center text-sm text-destructive">
        {error.message}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-6 py-14 text-center animate-fade-up">
        <div className="flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Printer className="size-9" strokeWidth={1.5} aria-hidden />
        </div>
        <div className="space-y-1.5">
          <p className="text-[17px] font-semibold">인화 주문 내역이 없어요</p>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            공유방 사진을 골라
            <br />
            실물 사진으로 인화해 보세요
          </p>
        </div>
        <Link href="/print/new">
          <Button className="h-11 rounded-xl px-6 font-semibold">
            사진 인화하기
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3 px-4 py-4">
      {orders.map((order, i) => (
        <li
          key={order.id}
          className="animate-fade-up"
          style={{ animationDelay: `${Math.min(i, 6) * 50}ms` }}
        >
          <PrintCard order={order} />
        </li>
      ))}
    </ul>
  );
}

function PrintCard({ order }: { order: PrintOrderListItem }) {
  const meta = STATUS_META[order.status];
  const canPay = PAYABLE.has(order.status);

  return (
    <Card className="gap-0 rounded-2xl p-4 ring-border/60">
      {/* 상단 정보 행 탭 → 주문 상세(진행 상황·배송 추적·결제 정보) */}
      <Link href={`/print/${order.id}`} className="flex items-center gap-3">
        <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-muted ring-1 ring-border/40">
          {order.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={order.thumbnailUrl}
              alt=""
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            <div className="grid size-full place-items-center text-muted-foreground">
              <Printer className="size-6" aria-hidden />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-[15px] font-semibold tracking-[-0.01em]">
            사진 인화 <span className="tabular-nums">{order.itemCount}</span>매
          </p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {order.roomName ? `${order.roomName} · ` : ""}
            {formatRelativeTime(order.createdAt)}
          </p>
        </div>
        <Badge className={`shrink-0 border-0 ${meta.cls}`}>{meta.label}</Badge>
      </Link>

      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-[15px] font-semibold tabular-nums">
          {formatKRW(order.totalPrice)}
        </p>
        {canPay ? (
          <Link href={`/print/${order.id}/checkout`}>
            <Button size="sm" className="h-9 rounded-lg font-semibold">
              <CreditCard className="size-4" aria-hidden />
              {order.status === "draft" ? "주문 계속하기" : "결제하기"}
            </Button>
          </Link>
        ) : null}
      </div>
    </Card>
  );
}
