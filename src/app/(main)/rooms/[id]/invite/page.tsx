import { notFound } from "next/navigation";
import { createClient } from "@/modules/shared/lib/supabase/server";
import { MobileLayout } from "@/modules/shared/components/MobileLayout";
import { InviteLink } from "@/modules/room/components/InviteLink";

interface InvitePageProps {
  params: Promise<{ id: string }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: room } = await supabase
    .from("rooms")
    .select("id, name, share_code")
    .eq("id", id)
    .maybeSingle();

  if (!room) notFound();

  return (
    <MobileLayout
      hideNav
      header={
        <div className="flex h-14 items-center px-4">
          <a
            href={`/rooms/${room.id}`}
            className="text-sm text-muted-foreground hover:text-foreground"
            aria-label="뒤로"
          >
            ←
          </a>
          <h1 className="ml-2 text-base font-semibold">초대하기</h1>
        </div>
      }
    >
      <div className="px-4 py-4">
        <InviteLink shareCode={room.share_code} roomName={room.name} />
      </div>
    </MobileLayout>
  );
}
