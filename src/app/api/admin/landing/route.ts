// POST /api/admin/landing — 랜딩 콘텐츠 저장(어드민 전용).
// 서버 측 어드민 재검증 → mergeLandingContent로 형태 정규화 → service_role 저장.

import { NextResponse, type NextRequest } from "next/server";
import { getAdmin } from "@/modules/admin/services/adminAuth";
import { saveLandingContent } from "@/modules/landing/services/landingContentServer";
import { mergeLandingContent } from "@/modules/landing/content";

export async function POST(request: NextRequest) {
  const admin = await getAdmin();
  if (!admin) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  // 미지정 필드는 기본값으로 채우고 알 수 없는 필드는 버린다(형태 보장).
  const content = mergeLandingContent(body);

  try {
    await saveLandingContent(content);
  } catch (e) {
    return NextResponse.json(
      { error: "SAVE_FAILED", message: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, content });
}
