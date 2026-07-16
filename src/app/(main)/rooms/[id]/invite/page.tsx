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

  // 초대 카드 강화(감사 P2) — 커버·사진수·멤버수를 카카오 Feed/OG에 실어 클릭률↑.
  // get_room_preview는 share_code 기반 security definer라 통계 3종을 한 번에 반환한다.
  const { data: preview } = await supabase
    .rpc("get_room_preview", { p_share_code: room.share_code })
    .maybeSingle();

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
        <InviteLink
          shareCode={room.share_code}
          roomName={room.name}
          coverImageUrl={preview?.cover_url ?? undefined}
          photoCount={preview?.photo_count ?? undefined}
          memberCount={preview?.member_count ?? undefined}
        />
      </div>
    </MobileLayout>
  );
}
