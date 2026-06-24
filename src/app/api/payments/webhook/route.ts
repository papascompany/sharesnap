// POST /api/payments/webhook — 토스페이먼츠 웹훅(결제 상태 변경).
// confirm 콜백이 1차 처리하므로 이건 보조 동기화(취소/만료 등 사후 상태). best-effort + 빠른 200.
// ⚠️ 토스 v2 웹훅은 본문 서명이 없으므로(IP allowlist 권장) 신뢰 경계가 약하다 —
//    여기서는 merchant_order_id로 매칭되는 결제의 상태만 보수적으로 갱신하고, 금액 변경은 하지 않는다.

import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/modules/photobook/services/storigeServer";
import type { Json } from "@/modules/shared/types/database";

interface TossWebhookBody {
  eventType?: string;
  data?: {
    orderId?: string;
    status?: string;
    paymentKey?: string;
    method?: string;
    approvedAt?: string;
    [k: string]: unknown;
  };
}

// 토스 결제상태 → payments.status 매핑
function mapStatus(tossStatus: string | undefined): "paid" | "canceled" | "failed" | null {
  switch (tossStatus) {
    case "DONE":
      return "paid";
    case "CANCELED":
    case "PARTIAL_CANCELED":
      return "canceled";
    case "ABORTED":
    case "EXPIRED":
      return "failed";
    default:
      return null;
  }
}

export async function POST(request: NextRequest) {
  let body: TossWebhookBody;
  try {
    body = (await request.json()) as TossWebhookBody;
  } catch {
    return NextResponse.json({ received: true });
  }

  const merchantOrderId = body.data?.orderId;
  const mapped = mapStatus(body.data?.status);
  if (!merchantOrderId || !mapped) {
    return NextResponse.json({ received: true });
  }

  const admin = createServiceRoleClient();
  if (!admin) return NextResponse.json({ received: true });

  try {
    const { data: payment } = await admin
      .from("payments")
      .select("id, order_kind, order_id, status")
      .eq("merchant_order_id", merchantOrderId)
      .maybeSingle();
    if (!payment) return NextResponse.json({ received: true });

    // 이미 confirm으로 paid 처리된 결제를 webhook 'paid'가 덮어쓸 필요 없음(멱등)
    if (payment.status === mapped) return NextResponse.json({ received: true });

    // 취소/실패만 사후 반영(paid 전이는 confirm 콜백이 권위) — 단 confirm 누락 시 paid도 보강
    await admin
      .from("payments")
      .update({ status: mapped, raw: body as unknown as Json })
      .eq("id", payment.id);

    if (mapped === "canceled" || mapped === "failed") {
      const table = payment.order_kind === "photobook" ? "photobook_orders" : "print_orders";
      // 결제 취소 시 주문은 결제 전 단계로 되돌림(포토북=pdf_ready 회수 불가하니 confirmed, 인화=confirmed)
      await admin
        .from(table)
        .update({ status: "confirmed" })
        .eq("id", payment.order_id);
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("[payments/webhook] 처리 오류:", e);
    return NextResponse.json({ received: true });
  }
}
