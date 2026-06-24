"use client";

// 사진 인화 주문 서비스 — print_orders / print_order_items CRUD (RLS: 본인).
// 결제 전 단계라 배송지는 빈 값으로 draft 생성하고, 체크아웃에서 채운다(서버 prepareCheckout).

import { createClient } from "@/modules/shared/lib/supabase/client";
import type { Json } from "@/modules/shared/types/database";
import {
  calculatePrintTotal,
  printUnitPrice,
  type PrintItemSpec,
} from "@/modules/print-order/utils/pricing";
import { thumbnailPublicUrl } from "@/modules/print-order/utils/thumbnail";
import type {
  NewPrintItem,
  PrintOrder,
  PrintOrderListItem,
  PrintOrderRow,
} from "@/modules/print-order/types";

function mapOrder(row: PrintOrderRow, itemCount: number): PrintOrder {
  return {
    id: row.id,
    userId: row.user_id,
    roomId: row.room_id,
    status: row.status,
    totalPrice: row.total_price,
    recipientName: row.recipient_name,
    recipientPhone: row.recipient_phone,
    memo: row.memo,
    createdAt: row.created_at,
    itemCount,
  };
}

/** 인화 주문서 생성(draft) — 사진/옵션 항목 + 예상 총액. 배송지는 체크아웃에서 채움. */
export async function createPrintOrder(input: {
  roomId: string | null;
  items: NewPrintItem[];
}): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");
  if (input.items.length === 0) throw new Error("인화할 사진을 선택해 주세요.");

  const specs: PrintItemSpec[] = input.items.map((i) => ({
    size: i.size,
    paper: i.paper,
    quantity: i.quantity,
  }));
  const total = calculatePrintTotal(specs);

  const { data: order, error } = await supabase
    .from("print_orders")
    .insert({
      user_id: user.id,
      room_id: input.roomId,
      status: "draft",
      total_price: total,
      shipping_address: {} as unknown as Json,
      recipient_name: "",
      recipient_phone: "",
    })
    .select("id")
    .single();
  if (error) throw error;

  const itemsPayload = input.items.map((i) => ({
    order_id: order.id,
    photo_id: i.photoId,
    paper_size: i.size,
    paper_type: i.paper,
    quantity: Math.max(1, Math.floor(i.quantity)),
    unit_price: printUnitPrice(i.size, i.paper),
  }));
  const { error: itemsError } = await supabase
    .from("print_order_items")
    .insert(itemsPayload);
  if (itemsError) {
    // 항목 저장 실패 시 빈 주문 롤백
    await supabase.from("print_orders").delete().eq("id", order.id);
    throw itemsError;
  }

  return order.id;
}

/** 내 인화 주문 목록(최신순) + 매수/방이름/대표 썸네일. */
export async function getMyPrintOrders(): Promise<PrintOrderListItem[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const { data: orders, error } = await supabase
    .from("print_orders")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!orders || orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id);
  const { data: items } = await supabase
    .from("print_order_items")
    .select("order_id, photo_id, quantity")
    .in("order_id", orderIds);

  const itemsByOrder = new Map<
    string,
    { photo_id: string; quantity: number }[]
  >();
  (items ?? []).forEach((it) => {
    const arr = itemsByOrder.get(it.order_id) ?? [];
    arr.push({ photo_id: it.photo_id, quantity: it.quantity });
    itemsByOrder.set(it.order_id, arr);
  });

  // 대표 썸네일(첫 사진)
  const repPhotoIds = [
    ...new Set(
      orderIds
        .map((id) => itemsByOrder.get(id)?.[0]?.photo_id)
        .filter((x): x is string => Boolean(x)),
    ),
  ];
  const { data: photos } = repPhotoIds.length
    ? await supabase
        .from("photos")
        .select("id, thumbnail_path")
        .in("id", repPhotoIds)
    : { data: [] };
  const thumbById = new Map(
    (photos ?? []).map((p) => [p.id, thumbnailPublicUrl(p.thumbnail_path)]),
  );

  // 방 이름
  const roomIds = [
    ...new Set(
      orders.map((o) => o.room_id).filter((x): x is string => Boolean(x)),
    ),
  ];
  const { data: rooms } = roomIds.length
    ? await supabase.from("rooms").select("id, name").in("id", roomIds)
    : { data: [] };
  const nameById = new Map((rooms ?? []).map((r) => [r.id, r.name]));

  return orders.map((o) => {
    const its = itemsByOrder.get(o.id) ?? [];
    const itemCount = its.reduce((s, it) => s + it.quantity, 0);
    const firstPhoto = its[0]?.photo_id;
    return {
      ...mapOrder(o, itemCount),
      roomName: o.room_id ? (nameById.get(o.room_id) ?? null) : null,
      thumbnailUrl: firstPhoto ? (thumbById.get(firstPhoto) ?? null) : null,
    };
  });
}
