"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2, Check, ImageOff } from "lucide-react";
import { formatRelativeTime } from "@/modules/shared/lib/utils";
import { REPORT_REASON_LABEL, type ReportReason } from "@/modules/report/services/reportService";
import type { AdminReport } from "@/modules/admin/services/adminReports";

const STATUS_LABEL: Record<string, string> = {
  pending: "검토 대기",
  resolved: "조치 완료",
  dismissed: "반려",
};

function reasonLabel(reason: string): string {
  return REPORT_REASON_LABEL[reason as ReportReason] ?? reason;
}

export function AdminReportsClient({ reports }: { reports: AdminReport[] }) {
  const pendingCount = reports.filter((r) => r.status === "pending").length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-5 grid grid-cols-2 gap-3">
        <SummaryCard label="전체 신고" value={`${reports.length}건`} />
        <SummaryCard label="검토 대기" value={`${pendingCount}건`} accent />
      </div>

      {reports.length === 0 ? (
        <p className="py-16 text-center text-[14px] text-muted-foreground">
          접수된 신고가 없어요.
        </p>
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => (
            <ReportRow key={r.id} report={r} />
          ))}
        </ul>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`mt-1 text-[16px] font-bold tabular-nums ${accent ? "text-primary" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function ReportRow({ report }: { report: AdminReport }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const isPending = report.status === "pending";

  async function act(action: "delete_photo" | "dismiss") {
    if (action === "delete_photo") {
      if (!report.photoId) {
        toast.error("이미 삭제된 사진이에요.");
        return;
      }
      if (
        !window.confirm(
          "신고된 사진을 삭제할까요? 원본과 썸네일이 영구 삭제되며 되돌릴 수 없어요.",
        )
      )
        return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: report.id,
          action,
          photoId: report.photoId ?? undefined,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.message || j.error || "처리 실패");
      toast.success(action === "delete_photo" ? "사진을 삭제했어요." : "신고를 반려했어요.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "처리 실패");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="flex gap-3">
        {/* 신고된 사진 썸네일 */}
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted text-muted-foreground">
          {report.photoThumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={report.photoThumbnailUrl}
              alt="신고된 사진"
              className="size-full object-cover"
            />
          ) : (
            <ImageOff className="size-6" strokeWidth={1.5} aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[14px] font-semibold">{reasonLabel(report.reason)}</p>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                isPending
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {STATUS_LABEL[report.status] ?? report.status}
            </span>
          </div>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {report.roomName ? `${report.roomName} · ` : ""}
            {formatRelativeTime(report.createdAt)}
          </p>
          {report.detail ? (
            <p className="mt-1 text-[12px] text-foreground/80">{report.detail}</p>
          ) : null}

          {isPending ? (
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => act("delete_photo")}
                disabled={busy || !report.photoId}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-destructive px-3 text-[13px] font-semibold text-white transition active:scale-95 disabled:opacity-40"
              >
                {busy ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <Trash2 className="size-3.5" aria-hidden />
                )}
                사진 삭제
              </button>
              <button
                type="button"
                onClick={() => act("dismiss")}
                disabled={busy}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-[13px] font-semibold transition hover:bg-muted active:scale-95 disabled:opacity-40"
              >
                <Check className="size-3.5" aria-hidden />
                반려
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}
