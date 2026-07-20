"use client";

// 프로필(닉네임/아바타) 서비스 — 작성자 표시용.
// RLS(마이그015): 본인 + 같은 방 멤버만 조회 가능.

import { createClient } from "@/modules/shared/lib/supabase/client";
import type { Database } from "@/modules/shared/types/database";

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export interface Profile {
  id: string;
  nickname: string | null;
  avatarUrl: string | null;
}

/** select로 가져오는 부분 컬럼만 요구(전역 규칙: select('*') 금지) */
type ProfileSelection = Pick<ProfileRow, "id" | "nickname" | "avatar_url">;

function toProfile(row: ProfileSelection): Profile {
  return {
    id: row.id,
    nickname: row.nickname,
    avatarUrl: row.avatar_url,
  };
}

/** 여러 사용자 프로필 배치 조회 → Map(userId → Profile). 조회 실패는 빈 Map(표시 폴백). */
export async function getProfiles(
  userIds: string[],
): Promise<Map<string, Profile>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return new Map();

  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, nickname, avatar_url")
    .in("id", unique);
  if (error) return new Map(); // 프로필은 부가 정보 — 실패해도 화면은 폴백으로 동작

  return new Map((data ?? []).map((row) => [row.id, toProfile(row)]));
}

/** 내 프로필 수정(닉네임/아바타) */
export async function updateMyProfile(patch: {
  nickname?: string;
  avatarUrl?: string | null;
}): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const { error } = await supabase
    .from("profiles")
    .update({
      ...(patch.nickname !== undefined && { nickname: patch.nickname }),
      ...(patch.avatarUrl !== undefined && { avatar_url: patch.avatarUrl }),
    })
    .eq("id", user.id);
  if (error) throw error;
}

/** 표시용 이름 — 닉네임 없으면 폴백 */
export function displayName(
  profile: Profile | undefined,
  isMine: boolean,
): string {
  if (profile?.nickname) return profile.nickname;
  return isMine ? "나" : "멤버";
}
