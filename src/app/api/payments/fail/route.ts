// GET /api/payments/fail — 토스 failUrl 콜백(결제 취소/실패).
// ready payment는 보존(재시도 가능). 결과만 안내 페이지로 리다이렉트.

import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const code = sp.get("code") ?? "";
  // 사용자가 직접 취소한 경우는 별도 표시
  const reason = /USER_CANCEL|취소/i.test(code) ? "canceled" : "failed";
  return NextResponse.redirect(new URL(`/orders?payfail=${reason}`, request.url));
}
