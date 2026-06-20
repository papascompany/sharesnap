"use client";

// 포토북 주문 서비스 — Storige 임베드 결과 영속화 (HANDOFF §3.4 sessionId 저장 계약)
// 마이그레이션 009 컬럼(storige_session_id 등)은 에이전트 A 소유 —
// database.ts 갱신 전에도 컴파일되도록 보강 타입(PhotobookOrderStorigeColumns)으로 접근한다.

import { createClient } from "@/modules/shared/lib/supabase/client";
import type { Database } from "@/modules/shared/types/database";
import type { StorigeEditorResult } from "@/modules/editor/types";
import type {
  BookSize,
  PhotobookOrder,
  PhotobookOrderRow,
  PhotobookOrderStorigeColumns,
} from "@/modules/photobook/types";

type PhotobookOrderUpdate =
  Database["public"]["Tables"]["photobook_orders"]["Update"];

// DB Row → 클라이언트 도메인 모델 변환
function mapOrder(
  row: PhotobookOrderRow & PhotobookOrderStorigeColumns,
): PhotobookOrder {
  return {
    id: row.id,
    roomId: row.room_id,
    userId: row.user_id,
    bookSize: row.book_size,
    pageCount: row.page_count,
    status: row.status,
    orderNo: row.order_no ?? null,
    storigeSessionId: row.storige_session_id ?? null,
    coverFileId: row.cover_file_id ?? null,
    contentFileId: row.content_file_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 내 작성 중(draft/editing) 포토북 주문 조회 — 없으면 새 draft 생성.
 * 방+사용자 단위로 최근 1건을 재사용해 중복 draft 생성을 막는다.
 */
export async function getOrCreateDraftOrder(
  roomId: string,
  bookSize: BookSize = "A4",
): Promise<PhotobookOrder> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  // 1) 기존 draft/editing 주문 재사용 (재편집 시 storige_session_id 보존)
  const { data: existing, error: selectError } = await supabase
    .from("photobook_orders")
    .select("*")
    .eq("room_id", roomId)
    .eq("user_id", user.id)
    .in("status", ["draft", "editing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) return mapOrder(existing);

  // 2) 없으면 새 draft 생성
  const { data: created, error: insertError } = await supabase
    .from("photobook_orders")
    .insert({
      room_id: roomId,
      user_id: user.id,
      book_size: bookSize,
      status: "draft",
    })
    .select("*")
    .single();
  if (insertError) throw insertError;
  return mapOrder(created);
}

/**
 * editor.complete 결과 저장 — storige_session_id·cover_file_id·content_file_id
 * 영속화 + status 'editing'→'confirmed' 전환.
 */
export async function saveEditorResult(
  orderId: string,
  result: StorigeEditorResult,
): Promise<PhotobookOrder> {
  const supabase = createClient();

  const patch: PhotobookOrderStorigeColumns & PhotobookOrderUpdate = {
    storige_session_id: result.sessionId,
    status: "confirmed",
  };
  // 파일 ID는 payload에 있을 때만 갱신 (없을 때 기존 값을 null로 덮지 않음)
  if (result.files?.coverFileId) patch.cover_file_id = result.files.coverFileId;
  if (result.files?.contentFileId) {
    patch.content_file_id = result.files.contentFileId;
  }

  const { data, error } = await supabase
    .from("photobook_orders")
    .update(patch as PhotobookOrderUpdate)
    .eq("id", orderId)
    .select("*")
    .single();
  if (error) throw error;
  return mapOrder(data);
}
