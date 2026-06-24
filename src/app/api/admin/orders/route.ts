// PATCH /api/admin/orders — 관리자 주문 상태 변경.
// getAdmin() 게이트 → 종류별 유효 상태 검증 → service_role 갱신.

import { NextResponse, type NextRequest } from "next/server";
import { getAdmin } from "@/modules/admin/services/adminAuth";
import { updateOrderStatus } from "@/modules/admin/services/adminOrders";

const PHOTOBOOK_STATUSES = new Set([
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
]);
const PRINT_STATUSES = new Set([
  "draft",
  "confirmed",
  "paid",
  "printing",
  "shipped",
  "delivered",
]);

export async function PATCH(request: NextRequest) {
  const admin = await getAdmin();
  if (!admin) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    orderKind?: string;
    orderId?: string;
    status?: string;
  };

  if (
    (body.orderKind !== "photobook" && body.orderKind !== "print") ||
    typeof body.orderId !== "string" ||
    typeof body.status !== "string"
  ) {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  const valid =
    body.orderKind === "photobook" ? PHOTOBOOK_STATUSES : PRINT_STATUSES;
  if (!valid.has(body.status)) {
    return NextResponse.json(
      { error: "INVALID_STATUS", message: "허용되지 않는 상태입니다." },
      { status: 400 },
    );
  }

  try {
    await updateOrderStatus(body.orderKind, body.orderId, body.status);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: "UPDATE_FAILED", message: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
