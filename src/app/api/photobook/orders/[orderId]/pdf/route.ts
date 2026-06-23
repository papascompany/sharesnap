// GET /api/photobook/orders/[orderId]/pdf
// 본인 소유 + pdf_ready 인 포토북 주문의 합성 PDF에 대한 단기 signed URL로 리다이렉트.
// pdfs는 비공개 버킷이라 service role로 서명한다(소유 검증은 사용자 세션으로 선행).

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/modules/shared/lib/supabase/server";
import { createServiceRoleClient } from "@/modules/photobook/services/storigeServer";
import { STORAGE_BUCKETS } from "@/modules/shared/lib/constants";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;

  // 1) 사용자 세션으로 본인 소유 주문 확인 (RLS 이중 방어)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { data: order, error } = await supabase
    .from("photobook_orders")
    .select("id, user_id, pdf_path")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }
  if (!order) {
    return NextResponse.json({ error: "ORDER_NOT_FOUND" }, { status: 404 });
  }
  if (!order.pdf_path) {
    return NextResponse.json(
      { error: "PDF_NOT_READY", message: "아직 PDF가 준비되지 않았어요." },
      { status: 409 },
    );
  }

  // 2) service role로 단기(60초) signed URL 발급
  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json(
      { error: "NOT_CONFIGURED", message: "PDF 다운로드가 아직 설정되지 않았어요." },
      { status: 503 },
    );
  }
  const { data: signed, error: signError } = await admin.storage
    .from(STORAGE_BUCKETS.PDFS)
    .createSignedUrl(order.pdf_path, 60);
  if (signError || !signed?.signedUrl) {
    return NextResponse.json({ error: "SIGN_FAILED" }, { status: 500 });
  }

  // 3) 서명 URL로 리다이렉트 (브라우저가 PDF 열기/다운로드)
  return NextResponse.redirect(signed.signedUrl);
}
