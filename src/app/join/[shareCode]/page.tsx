// 초대 참여 페이지 — SSR 미리보기 + 4분기 자동 입장 (docs/ux-flows.md §1.4)
// ① 비로그인 → 미리보기 + 카카오 CTA (next=/join/{code}?auto=1)
// ② 로그인 + auto=1 → 자동 join 후 /rooms/{id}?welcome=1
// ③ 로그인 + 이미 멤버 → 즉시 /rooms/{id} (1탭 재입장)
// ④ 로그인 + 비멤버 → 미리보기 + "참여하기" 버튼

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/modules/shared/lib/supabase/server";
import { RoomPreview } from "@/modules/room/components/RoomPreview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_NAME, APP_URL } from "@/modules/shared/lib/constants";
import type { RoomPreview as RoomPreviewData } from "@/modules/room/types";

interface JoinPageProps {
  params: Promise<{ shareCode: string }>;
  searchParams: Promise<{ auto?: string }>;
}

// 카톡에 URL을 직접 붙여넣는 경로 대응 — 카카오 스크래퍼가 OG 태그를 읽음 (ux-flows.md §4.2)
export async function generateMetadata({
  params,
}: JoinPageProps): Promise<Metadata> {
  const fallback: Metadata = { title: `공유방 초대 — ${APP_NAME}` };
  try {
    const { shareCode } = await params;
    const supabase = await createClient();
    const { data, error } = await supabase
      .rpc("get_room_preview", { p_share_code: shareCode })
      .maybeSingle();

    if (error || !data) return fallback;

    const description = `사진 ${data.photo_count}장 · 멤버 ${data.member_count}명 — 함께 사진을 모아보세요`;
    return {
      title: `${data.name} — ${APP_NAME}`,
      description,
      openGraph: {
        title: data.name,
        description,
        // 커버는 public 버킷 URL만 저장됨 (signed URL 금지) — 없으면 앱 아이콘 PNG 폴백
        images: [data.cover_url ?? `${APP_URL}/icons/icon-512.png`],
        type: "website",
      },
    };
  } catch {
    // RPC 미적용/네트워크 오류 시에도 메타데이터는 폴백으로 안전하게
    return fallback;
  }
}

// 잘못된 초대 링크 / 조회 실패 폴백 UI
function JoinErrorCard({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="flex min-h-dvh items-start justify-center px-4">
      <Card className="mt-12 w-full max-w-md">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {message}
        </CardContent>
      </Card>
    </div>
  );
}

export default async function JoinPage({ params, searchParams }: JoinPageProps) {
  const { shareCode } = await params;
  const { auto } = await searchParams;
  const supabase = await createClient();

  // 1) 방 미리보기 조회 (anon 가능 — get_room_preview RPC)
  //    RPC 미적용/네트워크 오류 시 런타임 크래시 대신 폴백 UI
  let preview: RoomPreviewData | null = null;
  let previewFailed = false;
  try {
    const { data, error } = await supabase
      .rpc("get_room_preview", { p_share_code: shareCode })
      .maybeSingle();
    if (error) {
      previewFailed = true;
    } else if (data) {
      preview = {
        name: data.name,
        description: data.description,
        coverUrl: data.cover_url,
        memberCount: data.member_count,
        photoCount: data.photo_count,
      };
    }
  } catch {
    previewFailed = true;
  }

  if (previewFailed) {
    return (
      <JoinErrorCard
        title="초대 정보를 불러올 수 없어요"
        message="일시적인 오류일 수 있어요. 잠시 후 다시 시도해 주세요."
      />
    );
  }

  if (!preview) {
    return (
      <JoinErrorCard
        title="잘못된 초대 링크"
        message="존재하지 않는 초대 코드입니다. 발신자에게 새 링크를 요청해 주세요."
      />
    );
  }

  // 2) 로그인 상태 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ① 비로그인 → 미리보기 + 카카오 CTA (로그인 후 ?auto=1로 복귀해 자동 입장)
  if (!user) {
    return (
      <RoomPreview
        preview={preview}
        shareCode={shareCode}
        isAuthenticated={false}
      />
    );
  }

  // ② 로그인 + auto=1 → 자동 join (멱등 RPC) 후 환영 redirect
  if (auto === "1") {
    let joinedRoomId: string | null = null;
    try {
      const { data, error } = await supabase.rpc("join_room_via_share_code", {
        p_share_code: shareCode,
      });
      if (!error && data) joinedRoomId = data;
    } catch {
      // join 실패 시 아래 ④ 분기로 폴스루 — 수동 "참여하기" 버튼 제공
    }
    // redirect는 내부적으로 throw하므로 try-catch 밖에서 호출
    if (joinedRoomId) {
      redirect(`/rooms/${joinedRoomId}?welcome=1`);
    }
  }

  // ③ 로그인 + 이미 멤버 → 즉시 방으로 (RLS rooms_select는 멤버에게 통과 — 1탭 재입장)
  const { data: memberRoom } = await supabase
    .from("rooms")
    .select("id")
    .eq("share_code", shareCode)
    .maybeSingle();
  if (memberRoom) {
    redirect(`/rooms/${memberRoom.id}`);
  }

  // ④ 로그인 + 비멤버 (링크 직접 붙여넣기 등) → 미리보기 + "참여하기" 1탭
  return (
    <RoomPreview
      preview={preview}
      shareCode={shareCode}
      isAuthenticated
    />
  );
}
