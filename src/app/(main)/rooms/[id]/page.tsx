import { notFound } from "next/navigation";
import { createClient } from "@/modules/shared/lib/supabase/server";
import { MobileLayout } from "@/modules/shared/components/MobileLayout";
import { RoomHeader } from "@/modules/room/components/RoomHeader";
import { ChatRoom } from "@/modules/chat/components/ChatRoom";

interface RoomPageProps {
  params: Promise<{ id: string }>;
}

export default async function RoomPage({ params }: RoomPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: room } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!room) {
    notFound();
  }

  return (
    <MobileLayout hideNav header={<RoomHeader room={room} />}>
      <ChatRoom roomId={room.id} />
    </MobileLayout>
  );
}
