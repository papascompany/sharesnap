"use client";

// 콘텐츠 신고 — 사용자측(생성). 조회/처리는 관리자(service_role).

import { createClient } from "@/modules/shared/lib/supabase/client";

export type ReportReason =
  | "inappropriate" // 부적절/불법 콘텐츠
  | "rights" // 초상권·저작권 침해
  | "spam" // 스팸/광고
  | "other";

export const REPORT_REASON_LABEL: Record<ReportReason, string> = {
  inappropriate: "부적절하거나 불쾌한 콘텐츠",
  rights: "초상권·저작권 침해",
  spam: "스팸/광고",
  other: "기타",
};

export async function submitReport(input: {
  photoId: string;
  roomId: string;
  reason: ReportReason;
  detail?: string;
}): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    photo_id: input.photoId,
    room_id: input.roomId,
    reason: input.reason,
    detail: input.detail ?? null,
  });
  if (error) throw error;
}
