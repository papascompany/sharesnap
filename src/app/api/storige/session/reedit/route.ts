// POST /api/storige/session/reedit — 기존 편집세션 재편집 진입
// 신규 핸드오프 §3.1: 재편집 시 공유방 사진을 최신 상태로 다시 주입(idempotent)한 뒤
//   새 Bearer 토큰을 발급한다. 편집세션은 새로 만들지 않고 기존 sessionId를 재사용.
// 응답 계약:
//   200 { sessionId, accessToken, refreshToken, expiresIn }
//   400 INVALID_REQUEST | 400 NO_SESSION (storige_session_id 없음)
//   401 UNAUTHORIZED | 404 ORDER_NOT_FOUND
//   503 STORIGE_NOT_CONFIGURED | 502 STORIGE_UPSTREAM_FAILED | 500 INTERNAL_ERROR

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/modules/shared/lib/supabase/server";
import {
  getStorigeConfig,
  createShopSession,
  patchEditSessionPhotos,
  STORIGE_NOT_CONFIGURED,
} from "@/modules/photobook/services/storigeServer";
import { buildExternalPhotosForRoom } from "@/modules/photobook/services/photobookServer";

/** Storige upstream 호출 실패 식별용 마커 — 502로 분기 */
class StorigeUpstreamError extends Error {}

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

    // 3) UUID ↔ memberNo 매핑 조회 — 없으면 발급 후 회수 (UUID당 1회, 영구 고정)
    let memberNo: number | null = null;

    const { data: existing, error: selectError } = await supabase
      .from("user_storige_map")
      .select("member_no")
      .eq("user_id", user.id)
      .maybeSingle();
    if (selectError) throw selectError;

    if (existing) {
      memberNo = existing.member_no;
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from("user_storige_map")
        .insert({ user_id: user.id })
        .select("member_no")
        .single();

      if (insertError) {
        const { data: retried, error: retryError } = await supabase
          .from("user_storige_map")
          .select("member_no")
          .eq("user_id", user.id)
          .maybeSingle();
        if (retryError || !retried) throw insertError;
        memberNo = retried.member_no;
      } else {
        memberNo = inserted.member_no;
      }
    }

    // 4) 본인 소유 주문 조회 (404)
    const body = (await request.json().catch(() => ({}))) as {
      orderId?: string;
    };
    if (!body.orderId) {
      return NextResponse.json(
        { error: "INVALID_REQUEST", message: "orderId가 필요합니다." },
        { status: 400 },
      );
    }

    const { data: order, error: orderError } = await supabase
      .from("photobook_orders")
      .select("id, order_no, room_id, storige_session_id")
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

    // 5) 재편집은 기존 세션 필수 — 없으면 400 (먼저 /session으로 생성해야 함)
    if (!order.storige_session_id) {
      return NextResponse.json(
        {
          error: "NO_SESSION",
          message: "편집세션이 없습니다. 먼저 편집을 시작해주세요.",
        },
        { status: 400 },
      );
    }

    // 6) 공유방 사진 → externalPhotos 빌드 (public URL, 생성순 asc)
    const externalPhotos = await buildExternalPhotosForRoom(
      supabase,
      order.room_id,
    );

    // 7) Storige 호출 구간 — 실패는 502로 분기
    try {
      // 7-1) shop-session 발급 (편집세션 호출용 Bearer 토큰)
      const session = await createShopSession({
        memberSeqno: memberNo,
        memberId: user.email ?? user.id,
        memberName:
          (user.user_metadata?.name as string | undefined) ??
          (user.user_metadata?.nickname as string | undefined) ??
          undefined,
        orderSeqno: order.order_no,
      });

      // 7-2) 기존 세션에 사진 재주입(idempotent)
      await patchEditSessionPhotos(
        session.accessToken,
        order.storige_session_id,
        externalPhotos,
      );

      return NextResponse.json({
        sessionId: order.storige_session_id,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        expiresIn: session.expiresIn,
      });
    } catch (upstreamError) {
      throw new StorigeUpstreamError(
        upstreamError instanceof Error
          ? upstreamError.message
          : String(upstreamError),
      );
    }
  } catch (error) {
    if (error instanceof StorigeUpstreamError) {
      console.error("[storige/session/reedit] Storige 호출 실패:", error.message);
      return NextResponse.json(
        {
          error: "STORIGE_UPSTREAM_FAILED",
          message: "편집 서버 연동에 실패했습니다.",
        },
        { status: 502 },
      );
    }
    console.error("[storige/session/reedit] 재편집 진입 실패:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "편집기 재진입에 실패했습니다." },
      { status: 500 },
    );
  }
}
