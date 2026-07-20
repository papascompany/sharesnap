import { notFound } from "next/navigation";
import { createClient } from "@/modules/shared/lib/supabase/server";
import { RoomPhotobooksHub } from "@/modules/photobook/components/RoomPhotobooksHub";

export const metadata = {
  title: "이 방의 포토북 — ShareSnap",
};

// 방 포토북 허브 — 완성본 공동주문("나도 주문하기") + 내 포토북 만들기 진입
export default async function RoomPhotobooksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: room } = await supabase
    .from("rooms")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();

  if (!room) notFound();

  return <RoomPhotobooksHub roomId={room.id} roomName={room.name} />;
}
