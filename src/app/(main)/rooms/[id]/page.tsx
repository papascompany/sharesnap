import { notFound } from "next/navigation";
import { createClient } from "@/modules/shared/lib/supabase/server";
import { MobileLayout } from "@/modules/shared/components/MobileLayout";
import { RoomHeader } from "@/modules/room/components/RoomHeader";
import { ChatRoom } from "@/modules/chat/components/ChatRoom";
import { WelcomeToast } from "@/modules/room/components/WelcomeToast";
import { InstallPrompt } from "@/modules/shared/components/InstallPrompt";

interface RoomPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ welcome?: string }>;
}

export default async function RoomPage({
  params,
  searchParams,
}: RoomPageProps) {
  const { id } = await params;
  const { welcome } = await searchParams;
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
      {/* 초대 링크 경유 입장 시 환영 토스트 1회 (?welcome=1) */}
      {welcome === "1" ? <WelcomeToast roomName={room.name} /> : null}
      <ChatRoom roomId={room.id} />
      {/* 홈 화면 추가 / 인앱→외부 브라우저 유도 — 세션 지속성(ux-flows.md §5.3) */}
      <InstallPrompt />
    </MobileLayout>
  );
}
