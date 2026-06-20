import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/modules/shared/lib/supabase/server";

interface RoomDetailLayoutProps {
  children: ReactNode;
  params: Promise<{ id: string }>;
}

export default async function RoomDetailLayout({
  children,
  params,
}: RoomDetailLayoutProps) {
  const { id } = await params;
  const supabase = await createClient();

  // RLS가 멤버 외 접근을 차단하므로 단순 조회로 멤버 검증
  const { data: room } = await supabase
    .from("rooms")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (!room) {
    notFound();
  }

  return <>{children}</>;
}
