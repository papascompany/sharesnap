// PATCH /api/admin/reports — 신고 처리(사진 삭제 / 반려).
// getAdmin() 게이트 → service_role 처리.

import { NextResponse, type NextRequest } from "next/server";
import { getAdmin } from "@/modules/admin/services/adminAuth";
import {
  deleteReportedPhoto,
  dismissReport,
} from "@/modules/admin/services/adminReports";

export async function PATCH(request: NextRequest) {
  const admin = await getAdmin();
  if (!admin) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    reportId?: string;
    action?: string;
    photoId?: string;
  };

  if (typeof body.reportId !== "string" || !body.reportId) {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  try {
    if (body.action === "delete_photo") {
      if (typeof body.photoId !== "string" || !body.photoId) {
        return NextResponse.json(
          { error: "INVALID_REQUEST", message: "사진 정보가 없어요." },
          { status: 400 },
        );
      }
      await deleteReportedPhoto(body.reportId, body.photoId);
      return NextResponse.json({ ok: true });
    }
    if (body.action === "dismiss") {
      await dismissReport(body.reportId);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "INVALID_ACTION" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: "PROCESS_FAILED", message: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
