// POST /api/payments/checkout — 결제 준비.
// 본인 주문 검증 → 배송지 저장 + 금액 서버 산출 + 주문상태 전이 + ready payment 발급.
// 응답으로 토스 위젯에 필요한 CheckoutSession 반환(금액은 서버 권위값).

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/modules/shared/lib/supabase/server";
import { prepareCheckout } from "@/modules/payment/services/paymentServer";
import type { CheckoutInput, OrderKind } from "@/modules/payment/types";

function parseBody(raw: unknown): CheckoutInput | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Record<string, unknown>;
  const kind = b.orderKind;
  if (kind !== "photobook" && kind !== "print") return null;
  if (typeof b.orderId !== "string" || !b.orderId) return null;
  if (typeof b.recipientName !== "string" || !b.recipientName.trim()) return null;
  if (typeof b.recipientPhone !== "string" || !b.recipientPhone.trim()) return null;
  const addr = b.address as Record<string, unknown> | undefined;
  if (
    !addr ||
    typeof addr.zipcode !== "string" ||
    typeof addr.address !== "string" ||
    typeof addr.addressDetail !== "string" ||
    !addr.zipcode ||
    !addr.address
  ) {
    return null;
  }
  return {
    orderKind: kind as OrderKind,
    orderId: b.orderId,
    recipientName: b.recipientName.trim(),
    recipientPhone: b.recipientPhone.trim(),
    address: {
      zipcode: addr.zipcode,
      address: addr.address,
      addressDetail: addr.addressDetail,
    },
    memo: typeof b.memo === "string" ? b.memo : undefined,
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "로그인이 필요합니다." },
        { status: 401 },
      );
    }

    const input = parseBody(await request.json().catch(() => null));
    if (!input) {
      return NextResponse.json(
        { error: "INVALID_REQUEST", message: "배송 정보를 확인해 주세요." },
        { status: 400 },
      );
    }

    const result = await prepareCheckout(user.id, user.email ?? null, input);
    if (!result.ok) {
      const status = result.code === "ORDER_NOT_FOUND" ? 404 : 500;
      return NextResponse.json(
        { error: result.code, message: result.message },
        { status },
      );
    }

    return NextResponse.json({ session: result.session });
  } catch (error) {
    console.error("[payments/checkout] 실패:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "결제 준비에 실패했습니다." },
      { status: 500 },
    );
  }
}
