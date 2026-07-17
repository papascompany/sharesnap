// DELETE /api/rooms/[id] — 방장의 공유방 삭제.
// 방장 검증 → Storage(사진 원본+썸네일 3종) service_role 정리 → rooms 삭제(DB cascade).
// (클라 직접 삭제는 타인 사진의 Storage 폴더에 접근 불가 → 고아 파일이 남으므로 서버에서 일원화)

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/modules/shared/lib/supabase/server";
import { createServiceRoleClient } from "@/modules/photobook/services/storigeServer";
import { STORAGE_BUCKETS } from "@/modules/shared/lib/constants";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  // 방장 검증
  const { data: room } = await supabase
    .from("rooms")
    .select("owner_id")
    .eq("id", id)
    .maybeSingle();
  if (!room) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (room.owner_id !== user.id) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "방장만 삭제할 수 있어요." },
      { status: 403 },
    );
  }

  // Storage 정리(service_role) — 방 전체 사진의 원본 + 썸네일 3종
  const admin = createServiceRoleClient();
  if (admin) {
    const { data: photos } = await admin
      .from("photos")
      .select("storage_path, thumbnail_path, medium_path, print_path")
      .eq("room_id", id);
    const originals = (photos ?? [])
      .map((p) => p.storage_path)
      .filter((p): p is string => Boolean(p));
    const thumbs = (photos ?? [])
      .flatMap((p) => [p.thumbnail_path, p.medium_path, p.print_path])
      .filter((p): p is string => Boolean(p));
    if (originals.length > 0) {
      await admin.storage.from(STORAGE_BUCKETS.PHOTOS).remove(originals);
    }
    if (thumbs.length > 0) {
      await admin.storage.from(STORAGE_BUCKETS.THUMBNAILS).remove(thumbs);
    }
  }

  // DB 삭제 — photos/messages/room_members는 FK ON DELETE CASCADE
  const { error } = await supabase.from("rooms").delete().eq("id", id);
  if (error) {
    return NextResponse.json(
      { error: "DELETE_FAILED", message: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
