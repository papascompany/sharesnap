// POST /api/admin/landing/upload — 랜딩 이미지 업로드(어드민 전용).
// multipart(file) → resources/landing/* 에 service_role 업로드 → 공개 URL 반환.

import { NextResponse, type NextRequest } from "next/server";
import { getAdmin } from "@/modules/admin/services/adminAuth";
import { createServiceRoleClient } from "@/modules/photobook/services/storigeServer";
import { STORAGE_BUCKETS } from "@/modules/shared/lib/constants";

const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export async function POST(request: NextRequest) {
  const admin = await getAdmin();
  if (!admin) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "NO_FILE" }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json(
      { error: "BAD_TYPE", message: "JPG·PNG·WEBP·AVIF만 업로드할 수 있어요." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "TOO_LARGE", message: "8MB 이하 이미지만 업로드할 수 있어요." },
      { status: 400 },
    );
  }

  const svc = createServiceRoleClient();
  if (!svc) {
    return NextResponse.json({ error: "NOT_CONFIGURED" }, { status: 503 });
  }

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `landing/${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await svc.storage
    .from(STORAGE_BUCKETS.RESOURCES)
    .upload(path, buffer, { contentType: file.type, upsert: true });
  if (error) {
    return NextResponse.json(
      { error: "UPLOAD_FAILED", message: error.message },
      { status: 500 },
    );
  }

  const {
    data: { publicUrl },
  } = svc.storage.from(STORAGE_BUCKETS.RESOURCES).getPublicUrl(path);

  return NextResponse.json({ ok: true, url: publicUrl });
}
