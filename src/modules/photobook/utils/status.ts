// 포토북 주문 상태 → 한국어 라벨 + 배지 톤 매핑 (design-system.md 톤 사용)

import type { PhotobookStatus } from "@/modules/shared/types/global";

type StatusTone = "neutral" | "progress" | "ready" | "done";

export const PHOTOBOOK_STATUS_META: Record<
  PhotobookStatus,
  { label: string; tone: StatusTone }
> = {
  draft: { label: "작성 중", tone: "neutral" },
  editing: { label: "편집 중", tone: "progress" },
  confirmed: { label: "편집 완료", tone: "progress" },
  generating_pdf: { label: "PDF 생성 중", tone: "progress" },
  pdf_ready: { label: "제작 준비 완료", tone: "ready" },
  ordered: { label: "주문 접수", tone: "ready" },
  paid: { label: "결제 완료", tone: "ready" },
  printing: { label: "인쇄 중", tone: "progress" },
  shipped: { label: "배송 중", tone: "progress" },
  delivered: { label: "배송 완료", tone: "done" },
};

/** 톤 → Badge className (Tailwind v4 토큰 + amber/emerald 보조색) */
export const STATUS_TONE_CLASS: Record<StatusTone, string> = {
  neutral: "bg-muted text-muted-foreground",
  progress: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  ready: "bg-primary/15 text-primary",
  done: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
};

export function statusBadgeClass(status: PhotobookStatus): string {
  return STATUS_TONE_CLASS[PHOTOBOOK_STATUS_META[status].tone];
}
