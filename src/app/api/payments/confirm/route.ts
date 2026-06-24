// GET /api/payments/confirm — 토스 successUrl 콜백.
// 토스가 ?paymentKey&orderId&amount 를 붙여 브라우저를 리다이렉트한다.
// ready payment 검증(금액 일치) → 토스 승인 → payments/주문 paid 전이 → 결과 페이지로 리다이렉트.

import { NextResponse, type NextRequest } from "next/server";
import { finalizePayment } from "@/modules/payment/services/paymentServer";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const paymentKey = sp.get("paymentKey");
  const orderId = sp.get("orderId"); // = merchant_order_id
  const amountRaw = sp.get("amount");

  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/orders?payerror=${reason}`, request.url));

  if (!paymentKey || !orderId || !amountRaw) {
    return fail("invalid");
  }
  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0) {
    return fail("invalid");
  }

  try {
    const result = await finalizePayment({
      merchantOrderId: orderId,
      paymentKey,
      amount,
    });
    if (!result.ok) {
      return fail("confirm");
    }
    return NextResponse.redirect(
      new URL(`/orders?paid=${result.orderKind ?? "1"}`, request.url),
    );
  } catch (e) {
    console.error("[payments/confirm] 실패:", e);
    return fail("server");
  }
}
