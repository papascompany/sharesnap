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

/**
 * 가격 정책 확정 여부 — 토스 키가 있어도 이게 true가 아니면 판매 개시 금지 (감사 P0-C).
 * '결제 활성화(토스 키)'와 '가격 확정'이라는 별개 의사결정을 분리해, 키만 넣으면
 * placeholder 가격으로 실판매가 시작되는 사고를 막는다. 운영 env PRICING_CONFIRMED=true로 개시.
 */
export function isPricingConfirmed(): boolean {
  return process.env.PRICING_CONFIRMED === "true";
}

/**
 * 클라이언트 위젯용 키(브라우저 노출 가능). 미설정 또는 가격 미확정 시 "".
 * 빈 문자열이면 CheckoutForm이 "결제 준비 중" graceful 분기로 표시된다.
 */
export function getTossClientKey(): string {
  if (!isPricingConfirmed()) return "";
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
  code: "ORDER_NOT_FOUND" | "EMPTY_AMOUNT" | "SERVER_ERROR" | "PRICING_UNCONFIRMED";
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
  // 서버 방어: 가격 미확정이면 청구 자체를 거부(클라이언트 우회 방지, 감사 P0-C)
  if (!isPricingConfirmed()) {
    return {
      ok: false,
      code: "PRICING_UNCONFIRMED",
      message: "결제 준비 중이에요. 잠시 후 다시 시도해 주세요.",
    };
  }

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

// ============================================================
// 결제 취소(환불) — 관리자
// ============================================================

export interface CancelResult {
  ok: boolean;
  message?: string;
}

/**
 * 관리자 결제 취소: 토스 취소 API 호출 → payments=canceled + 주문 롤백(confirmed).
 * 제작 착수(주문 status=paid) 전에만 허용 — printing 이후에는 거부(약관 §9 청약철회 제한과 정합).
 * 웹훅의 취소 동기화와 동일한 최종 상태를 만든다(즉시 반영용).
 */
export async function cancelPayment(params: {
  orderKind: OrderKind;
  orderId: string;
  reason: string;
}): Promise<CancelResult> {
  const secret = getTossSecretKey();
  if (!secret) return { ok: false, message: "결제 연동이 설정되지 않았어요." };
  const admin = createServiceRoleClient();
  if (!admin) return { ok: false, message: "SERVICE_ROLE 미설정" };

  const table =
    params.orderKind === "photobook" ? "photobook_orders" : "print_orders";

  // 제작 착수 전(status=paid)만 취소 허용
  const { data: order } = await admin
    .from(table)
    .select("status")
    .eq("id", params.orderId)
    .maybeSingle();
  if (!order) return { ok: false, message: "주문을 찾을 수 없어요." };
  if (order.status !== "paid") {
    return {
      ok: false,
      message: "결제 완료(제작 착수 전) 상태에서만 취소할 수 있어요.",
    };
  }

  // 최신 paid 결제
  const { data: payment } = await admin
    .from("payments")
    .select("id, payment_key")
    .eq("order_kind", params.orderKind)
    .eq("order_id", params.orderId)
    .eq("status", "paid")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!payment?.payment_key) {
    return { ok: false, message: "취소할 결제 정보를 찾을 수 없어요." };
  }

  // 토스 취소 API
  const auth = Buffer.from(`${secret}:`).toString("base64");
  const res = await fetch(
    `${TOSS_API}/v1/payments/${payment.payment_key}/cancel`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cancelReason: params.reason || "관리자 취소" }),
      cache: "no-store",
    },
  );
  const data = (await res.json().catch(() => ({}))) as {
    message?: string;
    [k: string]: unknown;
  };
  if (!res.ok) {
    return { ok: false, message: data.message ?? "토스 결제 취소에 실패했어요." };
  }

  // payments=canceled + 주문 롤백 (웹훅 취소 동기화와 동일)
  await admin
    .from("payments")
    .update({ status: "canceled", raw: data as unknown as Json })
    .eq("id", payment.id);
  await admin
    .from(table)
    .update({ status: "confirmed", paid_at: null })
    .eq("id", params.orderId);

  return { ok: true };
}
