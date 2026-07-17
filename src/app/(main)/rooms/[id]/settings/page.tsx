import { notFound, redirect } from "next/navigation";
import { createClient } from "@/modules/shared/lib/supabase/server";
import { RoomSettings } from "@/modules/room/components/RoomSettings";

export const metadata = {
  title: "방 설정 — ShareSnap",
};

export default async function RoomSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/rooms/${id}/settings`);

  const { data: room } = await supabase
    .from("rooms")
    .select("id, name, share_code, owner_id")
    .eq("id", id)
    .maybeSingle();
  if (!room) notFound();

  return (
    <RoomSettings
      roomId={room.id}
      roomName={room.name}
      shareCode={room.share_code}
      isOwner={room.owner_id === user.id}
      currentUserId={user.id}
    />
  );
}
