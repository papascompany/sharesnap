"use client";

import Link from "next/link";
import { BookHeart, FileText, ShoppingBag } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/modules/shared/components/Skeleton";
import { formatRelativeTime } from "@/modules/shared/lib/utils";
import { BOOK_SIZES } from "@/modules/shared/lib/constants";
import { useMyPhotobookOrders } from "@/modules/photobook/hooks/usePhotobookOrders";
import {
  calculatePhotobookPrice,
  formatKRW,
} from "@/modules/photobook/utils/pricing";
import {
  PHOTOBOOK_STATUS_META,
  statusBadgeClass,
} from "@/modules/photobook/utils/status";
import type { PhotobookOrderListItem } from "@/modules/photobook/types";

/** 편집 이어가기가 가능한 상태(작업 중) */
const EDITABLE = new Set(["draft", "editing", "confirmed"]);

/**
 * 내 포토북 목록.
 * - mode="works": 모든 작업물(작성 중 포함) — "내 포토북"
 * - mode="orders": 작성/편집 단계를 제외한 진행 주문 — "주문 내역"
 */
export function PhotobookList({ mode }: { mode: "works" | "orders" }) {
  const { orders, isLoading, error } = useMyPhotobookOrders();

  if (isLoading) {
    return (
      <ul className="flex flex-col gap-3 px-4 py-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <li key={i}>
            <Skeleton className="h-28 w-full rounded-2xl" />
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

  const items =
    mode === "orders"
      ? orders.filter((o) => o.status !== "draft" && o.status !== "editing")
      : orders;

  if (items.length === 0) {
    const isOrders = mode === "orders";
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center animate-fade-up">
        <div className="flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary">
          {isOrders ? (
            <ShoppingBag className="size-9" strokeWidth={1.5} aria-hidden />
          ) : (
            <BookHeart className="size-9" strokeWidth={1.5} aria-hidden />
          )}
        </div>
        <div className="space-y-1.5">
          <p className="text-[17px] font-semibold">
            {isOrders ? "주문 내역이 없어요" : "아직 만든 포토북이 없어요"}
          </p>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            {isOrders ? (
              <>
                포토북을 제작하면
                <br />
                여기에서 주문 내역을 확인할 수 있어요
              </>
            ) : (
              <>
                공유방 사진을 모아
                <br />
                나만의 포토북을 만들어 보세요
              </>
            )}
          </p>
        </div>
        <Link href="/rooms">
          <Button className="h-11 rounded-xl px-6 font-semibold">
            공유방으로 가기
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3 px-4 py-4">
      {items.map((order, i) => (
        <li
          key={order.id}
          className="animate-fade-up"
          style={{ animationDelay: `${Math.min(i, 6) * 50}ms` }}
        >
          <PhotobookCard order={order} />
        </li>
      ))}
    </ul>
  );
}

function PhotobookCard({ order }: { order: PhotobookOrderListItem }) {
  const meta = PHOTOBOOK_STATUS_META[order.status];
  const sizeLabel = BOOK_SIZES[order.bookSize].label;
  const price =
    order.totalPrice ??
    calculatePhotobookPrice(order.bookSize, order.pageCount, order.quantity);
  const isEstimate = order.totalPrice == null;
  const canEdit = EDITABLE.has(order.status);
  const hasPdf = Boolean(order.pdfPath);

  return (
    <Card className="gap-0 rounded-2xl p-4 ring-border/60">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="line-clamp-1 break-keep text-[15px] font-semibold tracking-[-0.01em]">
            {order.roomName ? `${order.roomName} 포토북` : "포토북"}
          </p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {sizeLabel}
            {order.pageCount > 0 ? (
              <>
                {" · "}
                <span className="tabular-nums">{order.pageCount}</span>면
              </>
            ) : null}
            {order.orderNo != null ? (
              <>
                {" · 주문번호 "}
                <span className="tabular-nums">{order.orderNo}</span>
              </>
            ) : null}
          </p>
        </div>
        <Badge className={`shrink-0 border-0 ${statusBadgeClass(order.status)}`}>
          {meta.label}
        </Badge>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-[15px] font-semibold tabular-nums">
            {isEstimate ? (
              <span className="text-muted-foreground">예상 </span>
            ) : null}
            {formatKRW(price)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {formatRelativeTime(order.createdAt)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasPdf ? (
            <a
              href={`/api/photobook/orders/${order.id}/pdf`}
              target="_blank"
              rel="noreferrer"
            >
              <Button
                size="sm"
                variant="outline"
                className="h-9 rounded-lg font-semibold"
              >
                <FileText className="size-4" aria-hidden />
                PDF 보기
              </Button>
            </a>
          ) : null}
          {canEdit ? (
            <Link href={`/rooms/${order.roomId}/photobook`}>
              <Button size="sm" className="h-9 rounded-lg font-semibold">
                편집 이어서
              </Button>
            </Link>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
