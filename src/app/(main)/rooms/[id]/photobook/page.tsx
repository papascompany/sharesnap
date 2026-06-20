import { notFound } from "next/navigation";
import { createClient } from "@/modules/shared/lib/supabase/server";
import { PhotobookEditorLauncher } from "@/modules/photobook/components/PhotobookEditorLauncher";

interface RoomPhotobookPageProps {
  params: Promise<{ id: string }>;
}

// 포토북 편집 진입 — 서버 컴포넌트 셸
// 멤버 검증은 상위 rooms/[id]/layout.tsx + RLS가 담당, 여기서는 방 존재 검증 + 메타 조회
export default async function RoomPhotobookPage({
  params,
}: RoomPhotobookPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: room } = await supabase
    .from("rooms")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();

  if (!room) notFound();

  return <PhotobookEditorLauncher roomId={room.id} roomName={room.name} />;
}
