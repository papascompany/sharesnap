// ⚠️ 서버 전용 모듈 — 클라이언트 컴포넌트에서 절대 import 금지
// ('use client' 없음. 쿠키 세션 기반 서버 Supabase 클라이언트만 받아 사용한다)
// Route Handler(src/app/api/storige/*)에서만 사용할 것.
//
// 근거: 신규 핸드오프 §3.1 externalPhotos 규약 — 편집세션 생성/재편집 시
//   공유방 사진을 metadata.externalPhotos로 주입하기 위한 빌더.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/modules/shared/types/database";
import { STORAGE_BUCKETS } from "@/modules/shared/lib/constants";
import type { ExternalPhoto } from "@/modules/photo/types";

/**
 * 해당 방의 사진을 Storige externalPhotos 형식으로 빌드 (생성순 asc).
 *
 * - 서버 supabase(쿠키 세션) — RLS 멤버 통과로 본인이 속한 방 사진만 조회됨.
 * - url      = 인쇄용 리사이즈본(print_path, 없으면 medium_path 폴백)의 thumbnails 공개 버킷 public URL.
 *              (만료 없는 public URL — signed URL 금지, 핸드오프 §3.1/§7)
 * - thumbnailUrl = ~300px 썸네일(thumbnail_path) public URL.
 * - name        = original_filename.
 * - uploadedAt  = taken_at ?? created_at.
 *   (uploaderName은 프로필 조인 부재로 생략)
 *
 * public URL을 만들 경로가 없는 사진(print_path/medium_path 모두 null)은 제외한다.
 */
export async function buildExternalPhotosForRoom(
  supabase: SupabaseClient<Database>,
  roomId: string,
): Promise<ExternalPhoto[]> {
  const { data, error } = await supabase
    .from("photos")
    .select(
      "print_path, medium_path, thumbnail_path, original_filename, width, height, taken_at, created_at",
    )
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  // thumbnails 버킷(공개) 경로 → public URL 헬퍼
  const publicUrl = (path: string | null): string | null => {
    if (!path) return null;
    return supabase.storage.from(STORAGE_BUCKETS.THUMBNAILS).getPublicUrl(path)
      .data.publicUrl;
  };

  const photos: ExternalPhoto[] = [];
  for (const row of data ?? []) {
    // 인쇄용 우선, 과거 사진(print_path 없음)은 medium_path 폴백
    const url = publicUrl(row.print_path) ?? publicUrl(row.medium_path);
    if (!url) continue; // public URL 못 만들면 주입 제외

    const thumbnailUrl = publicUrl(row.thumbnail_path) ?? undefined;

    photos.push({
      url,
      name: row.original_filename ?? "photo.jpg",
      ...(thumbnailUrl && { thumbnailUrl }),
      // 원본 px — 자동배치 cover-fit scale 계산용 (null이면 생략 → 정사각 폴백)
      ...(row.width != null && { width: row.width }),
      ...(row.height != null && { height: row.height }),
      uploadedAt: row.taken_at ?? row.created_at,
    });
  }

  return photos;
}
