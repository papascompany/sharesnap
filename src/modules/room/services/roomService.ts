// 공유방 서비스 — 클라이언트 측에서 Supabase에 직접 접근하거나, /api/rooms를 통해 호출
"use client";

import { createClient } from "@/modules/shared/lib/supabase/client";
import { generateShareCode } from "@/modules/shared/lib/utils";
import { SHARE_CODE_LENGTH } from "@/modules/shared/lib/constants";
import type {
  CreateRoomInput,
  Room,
  RoomMember,
  RoomPreview,
  RoomUpdate,
  UpdateRoomInput,
} from "@/modules/room/types";

// 내가 속한 공유방 목록 조회
export async function listMyRooms(): Promise<Room[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  // 1) 내 멤버십 조회 (FK 관계가 Database 타입에 정의돼 있지 않아 분리 쿼리)
  const { data: memberships, error: memErr } = await supabase
    .from("room_members")
    .select("room_id, role, joined_at")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });
  if (memErr) throw memErr;

  const roomIds = (memberships ?? []).map((m) => m.room_id);
  if (roomIds.length === 0) return [];

  const { data: rooms, error: roomsErr } = await supabase
    .from("rooms")
    .select("*")
    .in("id", roomIds);
  if (roomsErr) throw roomsErr;

  const roleMap = new Map<string, Room["myRole"]>(
    (memberships ?? []).map((m) => [m.room_id, m.role as Room["myRole"]]),
  );

  // 멤버십 순서(가입일 desc) 기준으로 정렬
  return roomIds
    .map((id) => {
      const room = rooms?.find((r) => r.id === id);
      if (!room) return null;
      return { ...room, myRole: roleMap.get(id) } as Room;
    })
    .filter((r): r is Room => r !== null);
}

// 단일 공유방 조회 (멤버 자격 필요)
export async function getRoom(roomId: string): Promise<Room | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", roomId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// share_code로 방 미리보기 조회 (비로그인/비멤버 가능 — get_room_preview RPC)
// 주의: RLS rooms_select는 멤버만 통과하므로 rooms 직접 select 금지 (P0-1, ux-flows.md §1.3)
export async function getRoomPreview(
  shareCode: string,
): Promise<RoomPreview | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .rpc("get_room_preview", { p_share_code: shareCode })
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    name: data.name,
    description: data.description,
    coverUrl: data.cover_url,
    memberCount: data.member_count,
    photoCount: data.photo_count,
  };
}

// share_code로 공유방 참여 (멱등 — 이미 멤버여도 성공, room id 반환)
export async function joinRoomViaShareCode(shareCode: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("join_room_via_share_code", {
    p_share_code: shareCode,
  });
  if (error) {
    // RPC의 raise exception 메시지를 사용자 친화 문구로 변환
    if (error.message.includes("INVALID_SHARE_CODE")) {
      throw new Error("존재하지 않는 초대 코드입니다.");
    }
    if (error.message.includes("AUTH_REQUIRED")) {
      throw new Error("로그인이 필요합니다.");
    }
    throw error;
  }
  return data;
}

// 공유방 생성 — share_code 충돌 시 5회까지 재시도
export async function createRoom(input: CreateRoomInput): Promise<Room> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  let lastError: unknown = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const shareCode = generateShareCode(SHARE_CODE_LENGTH);
    const { data, error } = await supabase
      .from("rooms")
      .insert({
        name: input.name,
        description: input.description ?? null,
        share_code: shareCode,
        owner_id: user.id,
      })
      .select("*")
      .single();

    if (!error && data) {
      // owner를 멤버로 등록
      const { error: memberError } = await supabase
        .from("room_members")
        .insert({ room_id: data.id, user_id: user.id, role: "owner" });
      if (memberError) throw memberError;
      return data;
    }

    lastError = error;
    // share_code unique 충돌 → 재시도
    if (error?.code !== "23505") break;
  }
  throw lastError ?? new Error("공유방 생성 실패");
}

export async function updateRoom(
  roomId: string,
  patch: UpdateRoomInput,
): Promise<Room> {
  const supabase = createClient();
  const payload: RoomUpdate = {};
  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.description !== undefined) payload.description = patch.description;
  if (patch.coverUrl !== undefined) payload.cover_url = patch.coverUrl;

  const { data, error } = await supabase
    .from("rooms")
    .update(payload)
    .eq("id", roomId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRoom(roomId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("rooms").delete().eq("id", roomId);
  if (error) throw error;
}

// 공유방 멤버 목록
export async function listRoomMembers(roomId: string): Promise<RoomMember[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("room_members")
    .select("*")
    .eq("room_id", roomId)
    .order("joined_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as RoomMember[];
}

// 멤버 탈퇴
export async function leaveRoom(roomId: string): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const { error } = await supabase
    .from("room_members")
    .delete()
    .eq("room_id", roomId)
    .eq("user_id", user.id);
  if (error) throw error;
}
