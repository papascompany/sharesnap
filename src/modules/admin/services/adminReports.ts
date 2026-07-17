// ⚠️ 서버 전용 — 콘텐츠 신고 조회/처리(service_role로 RLS 우회).
// 호출부(라우트/페이지)에서 반드시 getAdmin() 게이트 후에만 사용할 것.

import { createServiceRoleClient } from "@/modules/photobook/services/storigeServer";
import { STORAGE_BUCKETS } from "@/modules/shared/lib/constants";

export interface AdminReport {
  id: string;
  photoId: string | null;
  roomId: string | null;
  roomName: string | null;
  reason: string;
  detail: string | null;
  status: string;
  createdAt: string;
  /** 신고된 사진 썸네일(public URL) — 삭제된 사진이면 null */
  photoThumbnailUrl: string | null;
}

/** 미처리(pending) 우선, 최신순으로 신고 목록 조회. */
export async function listReports(): Promise<AdminReport[]> {
  const admin = createServiceRoleClient();
  if (!admin) return [];

  const { data: reports } = await admin
    .from("reports")
    .select("id, photo_id, room_id, reason, detail, status, created_at")
    .order("created_at", { ascending: false });
  const rows = reports ?? [];
  if (rows.length === 0) return [];

  // 신고된 사진 썸네일
  const photoIds = [
    ...new Set(rows.map((r) => r.photo_id).filter((x): x is string => Boolean(x))),
  ];
  const { data: photos } = photoIds.length
    ? await admin
        .from("photos")
        .select("id, thumbnail_path")
        .in("id", photoIds)
    : { data: [] };
  const thumbById = new Map(
    (photos ?? []).map((p) => [
      p.id,
      p.thumbnail_path
        ? admin.storage
            .from(STORAGE_BUCKETS.THUMBNAILS)
            .getPublicUrl(p.thumbnail_path).data.publicUrl
        : null,
    ]),
  );

  // 방 이름
  const roomIds = [
    ...new Set(rows.map((r) => r.room_id).filter((x): x is string => Boolean(x))),
  ];
  const { data: rooms } = roomIds.length
    ? await admin.from("rooms").select("id, name").in("id", roomIds)
    : { data: [] };
  const nameById = new Map((rooms ?? []).map((r) => [r.id, r.name]));

  const items: AdminReport[] = rows.map((r) => ({
    id: r.id,
    photoId: r.photo_id,
    roomId: r.room_id,
    roomName: r.room_id ? (nameById.get(r.room_id) ?? null) : null,
    reason: r.reason,
    detail: r.detail,
    status: r.status,
    createdAt: r.created_at,
    photoThumbnailUrl: r.photo_id ? (thumbById.get(r.photo_id) ?? null) : null,
  }));

  // pending 우선 정렬
  return items.sort((a, b) => {
    if (a.status === "pending" && b.status !== "pending") return -1;
    if (a.status !== "pending" && b.status === "pending") return 1;
    return a.createdAt < b.createdAt ? 1 : -1;
  });
}

/** 신고된 사진 삭제(Storage 원본+썸네일 3종 + DB) + 신고 resolved 처리. */
export async function deleteReportedPhoto(
  reportId: string,
  photoId: string,
): Promise<void> {
  const admin = createServiceRoleClient();
  if (!admin) throw new Error("SERVICE_ROLE_NOT_CONFIGURED");

  const { data: photo } = await admin
    .from("photos")
    .select("storage_path, thumbnail_path, medium_path, print_path")
    .eq("id", photoId)
    .maybeSingle();

  if (photo) {
    if (photo.storage_path) {
      await admin.storage
        .from(STORAGE_BUCKETS.PHOTOS)
        .remove([photo.storage_path]);
    }
    const thumbs = [
      photo.thumbnail_path,
      photo.medium_path,
      photo.print_path,
    ].filter((p): p is string => Boolean(p));
    if (thumbs.length > 0) {
      await admin.storage.from(STORAGE_BUCKETS.THUMBNAILS).remove(thumbs);
    }
    await admin.from("photos").delete().eq("id", photoId);
  }

  await admin.from("reports").update({ status: "resolved" }).eq("id", reportId);
}

/** 신고 반려(무조치) 처리. */
export async function dismissReport(reportId: string): Promise<void> {
  const admin = createServiceRoleClient();
  if (!admin) throw new Error("SERVICE_ROLE_NOT_CONFIGURED");
  await admin
    .from("reports")
    .update({ status: "dismissed" })
    .eq("id", reportId);
}
