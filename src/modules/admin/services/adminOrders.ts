// ⚠️ 서버 전용 — 관리자 주문 조회/상태변경(service_role로 RLS 우회).
// 호출부(라우트/페이지)에서 반드시 getAdmin() 게이트 후에만 사용할 것.

import { createServiceRoleClient } from "@/modules/photobook/services/storigeServer";
import type { OrderKind } from "@/modules/payment/types";
import type { PhotobookStatus, PrintOrderStatus } from "@/modules/shared/types/global";
import type { AdminOrder } from "@/modules/admin/types";

function shippingText(j: unknown): string | null {
  if (!j || typeof j !== "object") return null;
  const o = j as Record<string, unknown>;
  const zip = typeof o.zipcode === "string" ? o.zipcode : "";
  const addr = typeof o.address === "string" ? o.address : "";
  const detail = typeof o.addressDetail === "string" ? o.addressDetail : "";
  const s = [zip ? `(${zip})` : "", addr, detail].filter(Boolean).join(" ").trim();
  return s || null;
}

/** 모든 포토북·인화 주문을 최신순으로 통합 조회(결제 상태 포함). */
export async function listAllOrders(): Promise<AdminOrder[]> {
  const admin = createServiceRoleClient();
  if (!admin) return [];

  const [pbRes, prRes, payRes] = await Promise.all([
    admin
      .from("photobook_orders")
      .select(
        "id, order_no, status, total_price, recipient_name, recipient_phone, shipping_address, room_id, created_at, paid_at, tracking_carrier, tracking_number",
      )
      .order("created_at", { ascending: false }),
    admin
      .from("print_orders")
      .select(
        "id, status, total_price, recipient_name, recipient_phone, shipping_address, created_at, paid_at, tracking_carrier, tracking_number",
      )
      .order("created_at", { ascending: false }),
    admin
      .from("payments")
      .select("order_kind, order_id, status, method, created_at")
      .order("created_at", { ascending: false }),
  ]);

  const pb = pbRes.data ?? [];
  const pr = prRes.data ?? [];

  // 결제 매핑(최신 우선)
  const payMap = new Map<string, { status: string; method: string | null }>();
  (payRes.data ?? []).forEach((p) => {
    const key = `${p.order_kind}:${p.order_id}`;
    if (!payMap.has(key)) payMap.set(key, { status: p.status, method: p.method });
  });

  // 방 이름
  const roomIds = [
    ...new Set(pb.map((o) => o.room_id).filter((x): x is string => Boolean(x))),
  ];
  const { data: rooms } = roomIds.length
    ? await admin.from("rooms").select("id, name").in("id", roomIds)
    : { data: [] };
  const nameById = new Map((rooms ?? []).map((r) => [r.id, r.name]));

  // 인화 매수
  const prIds = pr.map((o) => o.id);
  const { data: items } = prIds.length
    ? await admin
        .from("print_order_items")
        .select("order_id, quantity")
        .in("order_id", prIds)
    : { data: [] };
  const countByOrder = new Map<string, number>();
  (items ?? []).forEach((it) =>
    countByOrder.set(it.order_id, (countByOrder.get(it.order_id) ?? 0) + it.quantity),
  );

  const pbOrders: AdminOrder[] = pb.map((o) => ({
    kind: "photobook",
    id: o.id,
    label: o.order_no != null ? `포토북 #${o.order_no}` : "포토북",
    sub: o.room_id ? (nameById.get(o.room_id) ?? null) : null,
    status: o.status,
    amount: o.total_price,
    recipientName: o.recipient_name,
    recipientPhone: o.recipient_phone,
    shippingText: shippingText(o.shipping_address),
    paymentStatus: payMap.get(`photobook:${o.id}`)?.status ?? null,
    paymentMethod: payMap.get(`photobook:${o.id}`)?.method ?? null,
    createdAt: o.created_at,
    paidAt: o.paid_at,
    trackingCarrier: o.tracking_carrier,
    trackingNumber: o.tracking_number,
  }));

  const prOrders: AdminOrder[] = pr.map((o) => ({
    kind: "print",
    id: o.id,
    label: `인화 ${countByOrder.get(o.id) ?? 0}매`,
    sub: null,
    status: o.status,
    amount: o.total_price,
    recipientName: o.recipient_name,
    recipientPhone: o.recipient_phone,
    shippingText: shippingText(o.shipping_address),
    paymentStatus: payMap.get(`print:${o.id}`)?.status ?? null,
    paymentMethod: payMap.get(`print:${o.id}`)?.method ?? null,
    createdAt: o.created_at,
    paidAt: o.paid_at,
    trackingCarrier: o.tracking_carrier,
    trackingNumber: o.tracking_number,
  }));

  return [...pbOrders, ...prOrders].sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : -1,
  );
}

/** 매출 요약(결제 완료 기준). */
export function summarizeRevenue(orders: AdminOrder[]): {
  paidCount: number;
  paidRevenue: number;
} {
  const paid = orders.filter((o) => o.paymentStatus === "paid");
  return {
    paidCount: paid.length,
    paidRevenue: paid.reduce((s, o) => s + (o.amount ?? 0), 0),
  };
}

/** 주문 상태 변경(관리자). 종류별 enum으로 좁혀 갱신. 배송 단계면 송장 정보도 함께 저장. */
export async function updateOrderStatus(
  kind: OrderKind,
  id: string,
  status: string,
  tracking?: { carrier?: string | null; number?: string | null },
): Promise<void> {
  const admin = createServiceRoleClient();
  if (!admin) throw new Error("SERVICE_ROLE_NOT_CONFIGURED");

  // 송장 정보는 전달된 경우에만 갱신(빈 문자열은 null로 정리)
  const trackingPatch =
    tracking === undefined
      ? {}
      : {
          tracking_carrier: tracking.carrier?.trim() || null,
          tracking_number: tracking.number?.trim() || null,
        };

  if (kind === "photobook") {
    const { error } = await admin
      .from("photobook_orders")
      .update({ status: status as PhotobookStatus, ...trackingPatch })
      .eq("id", id);
    if (error) throw error;
  } else {
    const { error } = await admin
      .from("print_orders")
      .update({ status: status as PrintOrderStatus, ...trackingPatch })
      .eq("id", id);
    if (error) throw error;
  }
}
