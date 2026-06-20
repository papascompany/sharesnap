// 공유방 도메인 타입

import type { Database } from "@/modules/shared/types/database";
import type { RoomRole } from "@/modules/shared/types/global";

export type RoomRow = Database["public"]["Tables"]["rooms"]["Row"];
export type RoomInsert = Database["public"]["Tables"]["rooms"]["Insert"];
export type RoomUpdate = Database["public"]["Tables"]["rooms"]["Update"];

export type RoomMemberRow =
  Database["public"]["Tables"]["room_members"]["Row"];
export type RoomMemberInsert =
  Database["public"]["Tables"]["room_members"]["Insert"];

export interface Room extends RoomRow {
  memberCount?: number;
  myRole?: RoomRole;
}

export interface RoomMember extends RoomMemberRow {
  email?: string | null;
  avatarUrl?: string | null;
}

export interface CreateRoomInput {
  name: string;
  description?: string;
}

export interface UpdateRoomInput {
  name?: string;
  description?: string | null;
  coverUrl?: string | null;
}

// 비로그인 미리보기 (get_room_preview RPC 결과 — room id는 의도적으로 미노출)
export interface RoomPreview {
  name: string;
  description: string | null;
  coverUrl: string | null;
  memberCount: number;
  photoCount: number;
}
