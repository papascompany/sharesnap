import { notFound } from "next/navigation";
import { createClient } from "@/modules/shared/lib/supabase/server";
import { PhotoGallery } from "@/modules/photo/components/PhotoGallery";

interface RoomPhotosPageProps {
  params: Promise<{ id: string }>;
}

// 방 사진 갤러리 — 서버 컴포넌트 셸
// 멤버 검증은 상위 rooms/[id]/layout.tsx가 담당, 여기서는 표시용 메타만 조회
export default async function RoomPhotosPage({ params }: RoomPhotosPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: room } = await supabase
    .from("rooms")
    .select("id, name, share_code")
    .eq("id", id)
    .maybeSingle();

  if (!room) notFound();

  return (
    <PhotoGallery
      roomId={room.id}
      roomName={room.name}
      shareCode={room.share_code}
    />
  );
}
