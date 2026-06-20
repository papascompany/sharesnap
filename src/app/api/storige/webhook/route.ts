// POST /api/storige/webhook — Storige 합성 완료/실패 웹훅 수신
// 핸드오프 §3.6: 서명 검증 → 2xx 빠른 응답 원칙 (10s 타임아웃, 실패 시 1회 재시도)
// - synthesis.completed: synthesis_job_id 매칭 주문 → status 'pdf_ready'
//   + 결과 파일 다운로드 → Supabase pdfs 버킷 저장은 best-effort (실패해도 200)
// - 합성 결과는 분리 2파일(cover+content) 가능성 항상 처리 (§3.5 — 스프레드 책 강제 분리)
// - 인증 사용자 컨텍스트 없음 → service role 클라이언트 필요 (미설정 시 로그만 남기고 200)

import { NextResponse, type NextRequest } from "next/server";
import {
  verifyWebhookSignature,
  createServiceRoleClient,
  downloadStorigeFileByUrl,
  getStorigeConfig,
  type StorigeWebhookPayload,
} from "@/modules/photobook/services/storigeServer";

export async function POST(request: NextRequest) {
  let payload: StorigeWebhookPayload;
  try {
    payload = (await request.json()) as StorigeWebhookPayload;
  } catch {
    return NextResponse.json(
      { error: "INVALID_PAYLOAD", message: "JSON 본문이 필요합니다." },
      { status: 400 },
    );
  }

  // 1) 서명 검증 (Base64 — X-Storige-Retry: 1 재시도 요청은 서명 누락 허용)
  if (!verifyWebhookSignature(request.headers, payload)) {
    return NextResponse.json(
      { error: "INVALID_SIGNATURE", message: "서명 검증에 실패했습니다." },
      { status: 401 },
    );
  }

  // 2) synthesis 이벤트만 처리 — 그 외는 무시하고 빠르게 200
  if (
    payload.event !== "synthesis.completed" &&
    payload.event !== "synthesis.failed"
  ) {
    return NextResponse.json({ received: true });
  }

  if (!payload.jobId) {
    console.warn("[storige/webhook] jobId 누락 — 매칭 불가:", payload.event);
    return NextResponse.json({ received: true });
  }

  // 3) service role 클라이언트 — 미설정이면 DB 갱신 스킵하고 로그만 (그래도 200)
  const admin = createServiceRoleClient();
  if (!admin) {
    console.error(
      "[storige/webhook] SUPABASE_SERVICE_ROLE_KEY 미설정 — DB 갱신 스킵:",
      payload.jobId,
    );
    return NextResponse.json({ received: true });
  }

  try {
    // 4) synthesis_job_id로 주문 매칭
    const { data: order, error: findError } = await admin
      .from("photobook_orders")
      .select("id, user_id")
      .eq("synthesis_job_id", payload.jobId)
      .maybeSingle();
    if (findError) throw findError;

    if (!order) {
      console.warn("[storige/webhook] 매칭 주문 없음 — jobId:", payload.jobId);
      return NextResponse.json({ received: true });
    }

    if (payload.event === "synthesis.failed") {
      // 실패 → 재시도 가능하도록 상태 되돌림
      console.error(
        `[storige/webhook] 합성 실패 — order ${order.id}:`,
        payload.errorMessage ?? "(원인 미상)",
      );
      await admin
        .from("photobook_orders")
        .update({ status: "confirmed" })
        .eq("id", order.id);
      return NextResponse.json({ received: true });
    }

    // 5) 합성 완료 — 상태 먼저 갱신 (파일 회수와 무관하게 확정)
    const { error: statusError } = await admin
      .from("photobook_orders")
      .update({ status: "pdf_ready" })
      .eq("id", order.id);
    if (statusError) throw statusError;

    // 6) 결과 PDF 회수 → pdfs 버킷 저장 (best-effort — 실패해도 200, pdf_path는 성공 시만)
    try {
      if (getStorigeConfig()) {
        const pdfPath = await archiveResultFiles(admin, order, payload);
        if (pdfPath) {
          await admin
            .from("photobook_orders")
            .update({ pdf_path: pdfPath })
            .eq("id", order.id);
        }
      } else {
        console.warn("[storige/webhook] STORIGE_API_KEY 미설정 — PDF 회수 스킵");
      }
    } catch (archiveError) {
      // 회수 실패는 재처리 가능(파일은 Storige에 보존) — 웹훅 자체는 성공 처리
      console.error(
        `[storige/webhook] PDF 회수 실패 (order ${order.id}, 추후 수동 회수 가능):`,
        archiveError,
      );
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    // 2xx 빠른 응답 원칙 — DB 오류여도 재시도 폭주 방지 위해 200 (로그로 추적)
    console.error("[storige/webhook] 처리 중 오류:", error);
    return NextResponse.json({ received: true });
  }
}

/**
 * 합성 결과 파일들을 Supabase pdfs 버킷에 저장.
 * - separate 모드: outputFiles = [cover, content] (cover → content 순서 보장) → 각각 저장
 * - merged 모드: outputFileUrl 단일 파일 저장
 * @returns 대표 pdf_path (merged 우선, 없으면 content) — 저장 성공한 경우만
 */
async function archiveResultFiles(
  admin: NonNullable<ReturnType<typeof createServiceRoleClient>>,
  order: { id: string; user_id: string },
  payload: StorigeWebhookPayload,
): Promise<string | null> {
  const baseDir = `${order.user_id}/${order.id}`;

  // 저장 대상 수집 — 분리 2파일(cover+content) 가능성 우선 처리
  const targets: { name: string; url: string }[] = [];
  if (payload.outputFiles && payload.outputFiles.length > 0) {
    for (const file of payload.outputFiles) {
      if (!file.url) continue;
      const name =
        file.type === "set" && file.setIndex !== undefined
          ? `set-${file.setIndex}.pdf`
          : `${file.type}.pdf`;
      targets.push({ name, url: file.url });
    }
  } else if (payload.outputFileUrl) {
    targets.push({ name: "merged.pdf", url: payload.outputFileUrl });
  }

  if (targets.length === 0) {
    console.warn("[storige/webhook] 결과 파일 URL 없음 — jobId:", payload.jobId);
    return null;
  }

  const savedPaths = new Map<string, string>();
  for (const target of targets) {
    const buffer = await downloadStorigeFileByUrl(target.url);
    const storagePath = `${baseDir}/${target.name}`;

    const { error: uploadError } = await admin.storage
      .from("pdfs")
      .upload(storagePath, buffer, {
        contentType: "application/pdf",
        upsert: true,
      });
    if (uploadError) throw uploadError;

    savedPaths.set(target.name, storagePath);
  }

  // 대표 경로: merged > content > 첫 파일
  return (
    savedPaths.get("merged.pdf") ??
    savedPaths.get("content.pdf") ??
    savedPaths.values().next().value ??
    null
  );
}
