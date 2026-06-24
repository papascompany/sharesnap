// ⚠️ 서버 전용 모듈 — 클라이언트 컴포넌트에서 절대 import 금지
// (TOSS_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY가 번들에 노출됨)
// Route Handler(src/app/api/payments/*)에서만 사용할 것.
//
// 토스페이먼츠 v2: 결제 승인(confirm)은 시크릿키 Basic 인증으로 서버에서만 호출.
// 금액은 항상 서버가 pricing으로 재산출 → 클라이언트 위변조 방지.

import { createServiceRoleClient } from "@/modules/photobook/services/storigeServer";
import { APP_URL } from "@/modules/shared/lib/constants";
import { calculatePhotobookPrice } from "@/modules/photobook/utils/pricing";
import {
  calculatePrintTotal,
  isPrintSize,
  isPrintPaper,
  type PrintItemSpec,
} from "@/modules/print-order/utils/pricing";
import type { CheckoutInput, CheckoutSession, OrderKind } from "@/modules/payment/types";
import type { Json } from "@/modules/shared/types/database";

const TOSS_API = "https://api.tosspayments.com";

/** 토스 미설정 시 라우트가 503으로 응답할 에러 코드 */
export const TOSS_NOT_CONFIGURED = "TOSS_NOT_CONFIGURED";

/** 클라이언트 위젯용 키(브라우저 노출 가능). 미설정 시 "". */
export function getTossClientKey(): string {
  return process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || "";
}

/** 서버 승인용 시크릿키. 미설정 시 null → 결제 불가(503). */
export function getTossSecretKey(): string | null {
  return process.env.TOSS_SECRET_KEY || null;
}

export function isTossConfigured(): boolean {
  return Boolean(getTossClientKey() && getTossSecretKey());
}

// ============================================================
// 금액 산출 — 도메인별 (항상 서버 권위값)
// ============================================================

interface OrderAmount {
  amount: number;
  orderName: string;
}

/** 주문 종류/내용으로 청구금액을 서버에서 산출. 0원 이하면 null(결제 불가). */
async function resolveOrderAmount(
  admin: NonNullable<ReturnType<typeof createServiceRoleClient>>,
  userId: string,
  kind: OrderKind,
  orderId: string,
): Promise<OrderAmount | null> {
  if (kind === "photobook") {
    const { data: order } = await admin
      .from("photobook_orders")
      .select("id, book_size, page_count, quantity, room_id")
      .eq("id", orderId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!order) return null;
    const amount = calculatePhotobookPrice(
      order.book_size,
      order.page_count,
      order.quantity ?? 1,
    );
    return amount > 0 ? { amount, orderName: "ShareSnap 포토북" } : null;
  }

  // print
  const { data: order } = await admin
    .from("print_orders")
    .select("id")
    .eq("id", orderId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!order) return null;

  const { data: items } = await admin
    .from("print_order_items")
    .select("paper_size, paper_type, quantity")
    .eq("order_id", orderId);
  if (!items || items.length === 0) return null;

  const specs: PrintItemSpec[] = items
    .filter((it) => isPrintSize(it.paper_size) && isPrintPaper(it.paper_type))
    .map((it) => ({
      size: it.paper_size as PrintItemSpec["size"],
      paper: it.paper_type as PrintItemSpec["paper"],
      quantity: it.quantity,
    }));
  const amount = calculatePrintTotal(specs);
  const totalQty = specs.reduce((s, it) => s + it.quantity, 0);
  return amount > 0
    ? { amount, orderName: `ShareSnap 사진 인화 ${totalQty}매` }
    : null;
}

// ============================================================
// 체크아웃 준비 — 배송지 저장 + payments(ready) 발급
// ============================================================

/** 토스 orderId 규칙(영숫자/-/_ 6~64자)에 맞는 고유 주문번호 생성. */
function buildMerchantOrderId(kind: OrderKind, orderId: string): string {
  const slug = orderId.replace(/[^0-9a-zA-Z]/g, "").slice(0, 16);
  const stamp = Date.now().toString(36);
  return `${kind === "photobook" ? "pb" : "pr"}-${slug}-${stamp}`;
}

interface PrepareCheckoutResult {
  ok: true;
  session: CheckoutSession;
}
interface PrepareCheckoutError {
  ok: false;
  code: "ORDER_NOT_FOUND" | "EMPTY_AMOUNT" | "SERVER_ERROR";
  message: string;
}

/**
 * 결제 준비: 본인 주문 검증 → 금액 산출 → 배송지/연락처 저장 + 주문상태 전이
 * → ready payment upsert(동일 주문 재시도 시 재사용) → 위젯용 CheckoutSession 반환.
 */
export async function prepareCheckout(
  userId: string,
  userEmail: string | null,
  input: CheckoutInput,
): Promise<PrepareCheckoutResult | PrepareCheckoutError> {
  const admin = createServiceRoleClient();
  if (!admin) {
    return { ok: false, code: "SERVER_ERROR", message: "SERVICE_ROLE 미설정" };
  }

  const resolved = await resolveOrderAmount(
    admin,
    userId,
    input.orderKind,
    input.orderId,
  );
  if (!resolved) {
    return {
      ok: false,
      code: "ORDER_NOT_FOUND",
      message: "주문을 찾을 수 없거나 결제 가능한 금액이 아니에요.",
    };
  }

  const shippingJson = {
    zipcode: input.address.zipcode,
    address: input.address.address,
    addressDetail: input.address.addressDetail,
  } as unknown as Json;

  // 1) 주문에 배송지/연락처 저장 + 상태 전이
  if (input.orderKind === "photobook") {
    await admin
      .from("photobook_orders")
      .update({
        recipient_name: input.recipientName,
        recipient_phone: input.recipientPhone,
        shipping_address: shippingJson,
        memo: input.memo ?? null,
        total_price: resolved.amount,
        status: "ordered",
      })
      .eq("id", input.orderId)
      .eq("user_id", userId);
  } else {
    await admin
      .from("print_orders")
      .update({
        recipient_name: input.recipientName,
        recipient_phone: input.recipientPhone,
        shipping_address: shippingJson,
        memo: input.memo ?? null,
        total_price: resolved.amount,
        status: "confirmed",
      })
      .eq("id", input.orderId)
      .eq("user_id", userId);
  }

  // 2) ready payment 재사용/발급
  const { data: existing } = await admin
    .from("payments")
    .select("id, merchant_order_id")
    .eq("order_kind", input.orderKind)
    .eq("order_id", input.orderId)
    .eq("status", "ready")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let merchantOrderId: string;
  if (existing) {
    merchantOrderId = existing.merchant_order_id;
    await admin
      .from("payments")
      .update({ amount: resolved.amount })
      .eq("id", existing.id);
  } else {
    merchantOrderId = buildMerchantOrderId(input.orderKind, input.orderId);
    const { error } = await admin.from("payments").insert({
      user_id: userId,
      order_kind: input.orderKind,
      order_id: input.orderId,
      merchant_order_id: merchantOrderId,
      amount: resolved.amount,
      status: "ready",
    });
    if (error) {
      return { ok: false, code: "SERVER_ERROR", message: error.message };
    }
  }

  const base = APP_URL.replace(/\/+$/, "");
  return {
    ok: true,
    session: {
      clientKey: getTossClientKey(),
      customerKey: `user_${userId.replace(/-/g, "").slice(0, 24)}`,
      merchantOrderId,
      amount: resolved.amount,
      orderName: resolved.orderName,
      customerEmail: userEmail,
      customerName: input.recipientName,
      successUrl: `${base}/api/payments/confirm`,
      failUrl: `${base}/api/payments/fail`,
    },
  };
}

// ============================================================
// 토스 승인(confirm) + 결제 확정
// ============================================================

interface TossConfirmResponse {
  paymentKey: string;
  orderId: string;
  status: string;
  totalAmount: number;
  method?: string;
  approvedAt?: string;
  receipt?: { url?: string } | null;
  [k: string]: unknown;
}

/** 토스 v2 결제 승인 — POST /v1/payments/confirm (시크릿키 Basic 인증). */
export async function confirmTossPayment(params: {
  paymentKey: string;
  orderId: string;
  amount: number;
}): Promise<TossConfirmResponse> {
  const secret = getTossSecretKey();
  if (!secret) throw new Error(TOSS_NOT_CONFIGURED);

  // 시크릿키 뒤에 콜론을 붙여 base64 (비밀번호 없음을 의미 — 콜론 누락 금지)
  const auth = Buffer.from(`${secret}:`).toString("base64");

  const res = await fetch(`${TOSS_API}/v1/payments/confirm`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      paymentKey: params.paymentKey,
      orderId: params.orderId,
      amount: params.amount,
    }),
    cache: "no-store",
  });

  const data = (await res.json().catch(() => ({}))) as TossConfirmResponse & {
    code?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(
      `TOSS_CONFIRM_FAILED: ${res.status} ${data.code ?? ""} ${data.message ?? ""}`.trim(),
    );
  }
  return data;
}

export interface FinalizeResult {
  ok: boolean;
  orderKind?: OrderKind;
  orderId?: string;
  message?: string;
}

/**
 * successUrl 콜백 처리: ready payment 검증(금액 일치) → 토스 승인 →
 * payments=paid + 주문=paid 전이. service_role로 RLS 우회.
 */
export async function finalizePayment(params: {
  merchantOrderId: string;
  paymentKey: string;
  amount: number;
}): Promise<FinalizeResult> {
  const admin = createServiceRoleClient();
  if (!admin) return { ok: false, message: "SERVICE_ROLE 미설정" };

  // 1) ready payment 조회 + 금액 위변조 검증
  const { data: payment } = await admin
    .from("payments")
    .select("id, order_kind, order_id, amount, status")
    .eq("merchant_order_id", params.merchantOrderId)
    .maybeSingle();

  if (!payment) return { ok: false, message: "결제 정보를 찾을 수 없어요." };
  if (payment.status === "paid") {
    // 이미 승인됨(중복 콜백) — 멱등 처리
    return {
      ok: true,
      orderKind: payment.order_kind,
      orderId: payment.order_id,
    };
  }
  if (payment.amount !== params.amount) {
    await admin
      .from("payments")
      .update({ status: "failed", raw: { reason: "amount_mismatch" } as Json })
      .eq("id", payment.id);
    return { ok: false, message: "결제 금액이 일치하지 않아요." };
  }

  // 2) 토스 승인
  let confirmed: TossConfirmResponse;
  try {
    confirmed = await confirmTossPayment({
      paymentKey: params.paymentKey,
      orderId: params.merchantOrderId,
      amount: params.amount,
    });
  } catch (e) {
    await admin
      .from("payments")
      .update({
        status: "failed",
        raw: { error: e instanceof Error ? e.message : String(e) } as Json,
      })
      .eq("id", payment.id);
    return { ok: false, message: "결제 승인에 실패했어요." };
  }

  // 3) payments 확정
  const approvedAt = confirmed.approvedAt ?? new Date().toISOString();
  await admin
    .from("payments")
    .update({
      status: "paid",
      payment_key: confirmed.paymentKey,
      method: confirmed.method ?? null,
      receipt_url: confirmed.receipt?.url ?? null,
      approved_at: approvedAt,
      raw: confirmed as unknown as Json,
    })
    .eq("id", payment.id);

  // 4) 주문 paid 전이
  if (payment.order_kind === "photobook") {
    await admin
      .from("photobook_orders")
      .update({ status: "paid", paid_at: approvedAt })
      .eq("id", payment.order_id);
  } else {
    await admin
      .from("print_orders")
      .update({ status: "paid", paid_at: approvedAt })
      .eq("id", payment.order_id);
  }

  return {
    ok: true,
    orderKind: payment.order_kind,
    orderId: payment.order_id,
  };
}
