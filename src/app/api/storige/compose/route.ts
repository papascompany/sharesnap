// POST /api/storige/compose — 주문 확정 시 PDF 합성(compose-mixed) 트리거
// 핸드오프 §3.5: editSessionId + 정수 주문번호로 워커 잡 생성
// 성공 시 synthesis_job_id 저장 + status 'generating_pdf' (완료는 웹훅 §3.6에서 갱신)

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/modules/shared/lib/supabase/server";
import {
  getStorigeConfig,
  triggerComposeMixed,
  STORIGE_NOT_CONFIGURED,
} from "@/modules/photobook/services/storigeServer";

export async function POST(request: NextRequest) {
  try {
    // 1) 키 미설정 시 503
    const config = getStorigeConfig();
    if (!config) {
      return NextResponse.json(
        {
          error: STORIGE_NOT_CONFIGURED,
          message: "Storige 연동이 구성되지 않았습니다. (STORIGE_API_KEY 미설정)",
        },
        { status: 503 },
      );
    }

    // 2) 인증 사용자 확인
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

    // 3) 요청 본문 검증
    const body = (await request.json().catch(() => ({}))) as {
      orderId?: string;
    };
    if (!body.orderId) {
      return NextResponse.json(
        { error: "INVALID_REQUEST", message: "orderId가 필요합니다." },
        { status: 400 },
      );
    }

    // 4) 본인 소유 주문 + storige_session_id 존재 검증
    const { data: order, error: orderError } = await supabase
      .from("photobook_orders")
      .select("id, order_no, storige_session_id")
      .eq("id", body.orderId)
      .eq("user_id", user.id) // 본인 소유 검증 (RLS와 이중 방어)
      .maybeSingle();
    if (orderError) throw orderError;

    if (!order) {
      return NextResponse.json(
        { error: "ORDER_NOT_FOUND", message: "주문을 찾을 수 없습니다." },
        { status: 404 },
      );
    }
    if (!order.storige_session_id) {
      return NextResponse.json(
        {
          error: "NO_STORIGE_SESSION",
          message: "편집 완료(editor.complete) 후에 합성을 요청할 수 있습니다.",
        },
        { status: 400 },
      );
    }

    // 5) 합성 잡 생성 (orderSeqno = 정수 order_no)
    const { jobId } = await triggerComposeMixed({
      editSessionId: order.storige_session_id,
      orderSeqno: order.order_no,
    });

    // 6) 잡 ID 저장 + 상태 전이 — 완료/실패는 웹훅이 갱신
    const { error: updateError } = await supabase
      .from("photobook_orders")
      .update({ synthesis_job_id: jobId, status: "generating_pdf" })
      .eq("id", order.id);
    if (updateError) throw updateError;

    return NextResponse.json({ jobId, status: "generating_pdf" });
  } catch (error) {
    console.error("[storige/compose] 합성 트리거 실패:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "PDF 합성 요청에 실패했습니다." },
      { status: 500 },
    );
  }
}
