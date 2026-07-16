"use client";

// 사진 업로드 FAB + 진행 바텀시트
// - FAB: 우하단 고정, 선셋 그라데이션 (design-system.md §4.6, 아이콘 어휘 §6.3 "사진 추가/업로드" = ImagePlus)
// - 시트: 항목별 진행률/실패 재시도, 전체 완료 시 카카오 "카톡방에 알리기" 제공

import {
  useCallback,
  useImperativeHandle,
  useState,
  type Ref,
} from "react";
import {
  Check,
  ImagePlus,
  LoaderCircle,
  RotateCcw,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { pickPhotos } from "@/modules/photo/services/photoPickerService";
import { usePhotoUpload } from "@/modules/photo/hooks/usePhotoUpload";
import { buildFeedTemplate, shareKakaoFeed } from "@/modules/shared/lib/kakao";
// useToast()는 매 렌더마다 새 객체 반환 — photo 모듈 공통 패턴대로 안정적 toast export 사용
import { toast } from "@/modules/shared/hooks/useToast";
import { track } from "@/modules/shared/lib/analytics";
import { cn, formatBytes } from "@/modules/shared/lib/utils";
import type { PhotoUploadResult, UploadStatus } from "@/modules/photo/types";

/** 외부(엠티 스테이트 CTA 등)에서 사진 선택을 트리거하기 위한 핸들 */
export interface PhotoUploaderHandle {
  openPicker: () => void;
}

interface PhotoUploaderProps {
  roomId: string;
  /** 카카오 Feed 템플릿용 방 이름 */
  roomName: string;
  /** 카카오 Feed 템플릿용 공유 코드 */
  shareCode: string;
  /** 업로드 전체 완료 시 성공 결과 전달 (Realtime 미수신 대비 refresh 용도) */
  onUploaded?: (results: PhotoUploadResult[]) => void;
  ref?: Ref<PhotoUploaderHandle>;
}

/** 큐 상태별 표시 라벨 */
const STATUS_LABELS: Record<UploadStatus, string> = {
  pending: "대기 중",
  processing: "변환 중",
  uploading: "올리는 중",
  done: "완료",
  error: "실패",
};

export function PhotoUploader({
  roomId,
  roomName,
  shareCode,
  onUploaded,
  ref,
}: PhotoUploaderProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const {
    queue,
    isUploading,
    totalProgress,
    enqueue,
    retry,
    removeItem,
    clearFinished,
  } = usePhotoUpload(roomId, {
    onAllDone: (results) => {
      if (results.length > 0) {
        toast.success(`사진 ${results.length}장을 올렸어요!`);
        // 퍼널 하단 계측 — 참여 후 첫 기여(ux-flows.md §5.4)
        track("first_photo_uploaded", { count: results.length });
        onUploaded?.(results);
      }
    },
  });

  /** 사진 선택 다이얼로그 열기 → 선택분 큐 추가 + 시트 표시 */
  const openPicker = useCallback(async () => {
    try {
      const files = await pickPhotos();
      if (files.length === 0) return; // 사용자 취소
      setSheetOpen(true);
      enqueue(files);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "사진을 선택하지 못했습니다.",
      );
    }
  }, [enqueue]);

  // 엠티 스테이트 CTA 등 외부 트리거 노출 (React 19 ref-as-prop)
  useImperativeHandle(ref, () => ({ openPicker: () => void openPicker() }), [
    openPicker,
  ]);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    clearFinished();
  }, [clearFinished]);

  const doneItems = queue.filter((item) => item.status === "done");
  const allSettled =
    queue.length > 0 &&
    !isUploading &&
    queue.every((item) => item.status === "done" || item.status === "error");

  /** 업로드 완료 후 카카오 새 사진 알림 — 실패 시 링크 복사로 유도(침묵 실패 금지, 감사 P1) */
  const handleShareToKakao = async () => {
    try {
      await shareKakaoFeed(
        buildFeedTemplate("newPhotos", {
          roomName,
          shareCode,
          photoCount: doneItems.length,
          imageUrl: doneItems[0]?.photo?.thumbnailUrl ?? undefined,
        }),
      );
      closeSheet();
    } catch {
      // 재초대 루프가 조용히 죽지 않도록 — 링크 복사 폴백 안내
      try {
        await navigator.clipboard.writeText(
          `${window.location.origin}/join/${shareCode}`,
        );
        toast.success("초대 링크를 복사했어요. 카톡방에 붙여넣어 알려주세요!");
      } catch {
        toast.error("카톡 공유에 실패했어요. 초대 화면에서 링크를 복사해 주세요.");
      }
      closeSheet();
    }
  };

  return (
    <>
      {/* FAB — 사진 올리기 (design-system.md §4.6) */}
      <button
        type="button"
        onClick={() => void openPicker()}
        aria-label="사진 올리기"
        className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom)+1rem)] right-4
          z-40 flex size-14 items-center justify-center rounded-full
          bg-sunset text-white shadow-xl shadow-primary/30
          transition-transform duration-150 active:scale-90"
      >
        <ImagePlus className="size-6" aria-hidden />
      </button>

      {/* 업로드 진행 바텀시트 */}
      <Sheet
        open={sheetOpen && queue.length > 0}
        onOpenChange={(open) => {
          if (!open) closeSheet();
          else setSheetOpen(true);
        }}
      >
        <SheetContent
          side="bottom"
          className="max-h-[70dvh] gap-0 rounded-t-3xl p-0 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
        >
          <SheetHeader className="px-4 pb-2 pt-4">
            <SheetTitle className="text-[15px]">
              {allSettled ? "업로드 완료" : "사진 올리는 중..."}
            </SheetTitle>
            <SheetDescription className="text-[12px] tabular-nums">
              {doneItems.length}/{queue.length}장 완료 · 전체 {totalProgress}%
            </SheetDescription>
          </SheetHeader>

          {/* 사진 이용 고지 (감사 P1 — 멤버 간 제작 이용 라이선스 인지) */}
          <p className="px-4 pb-1 text-[11px] leading-relaxed text-muted-foreground">
            올린 사진은 이 공유방 멤버가 포토북·인화 제작에 사용할 수 있어요.
          </p>

          {/* 항목별 진행률 목록 */}
          <ul className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {queue.map((item) => (
              <li key={item.id} className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted",
                    item.status === "done"
                      ? "text-primary"
                      : item.status === "error"
                        ? "text-destructive"
                        : "text-muted-foreground",
                  )}
                  aria-hidden
                >
                  {item.status === "done" ? (
                    <Check className="size-4" />
                  ) : item.status === "error" ? (
                    <X className="size-4" />
                  ) : (
                    <LoaderCircle
                      className={cn(
                        "size-4",
                        item.status !== "pending" && "animate-spin",
                      )}
                    />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[13px] font-medium">
                      {item.file.name}
                    </p>
                    <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                      {item.status === "uploading"
                        ? `${item.progress}%`
                        : STATUS_LABELS[item.status]}
                    </span>
                  </div>
                  {item.status === "error" ? (
                    <p className="truncate text-[11px] text-destructive">
                      {item.error ?? "업로드에 실패했습니다."}
                    </p>
                  ) : (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-sunset transition-[width] duration-300"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground/70">
                        {formatBytes(item.file.size)}
                      </span>
                    </div>
                  )}
                </div>
                {item.status === "error" ? (
                  <span className="flex shrink-0 items-center">
                    <button
                      type="button"
                      onClick={() => retry(item.id)}
                      aria-label={`${item.file.name} 재시도`}
                      className="grid size-9 place-items-center text-muted-foreground transition-transform active:scale-90"
                    >
                      <RotateCcw className="size-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      aria-label={`${item.file.name} 목록에서 제거`}
                      className="grid size-9 place-items-center text-muted-foreground transition-transform active:scale-90"
                    >
                      <X className="size-4" aria-hidden />
                    </button>
                  </span>
                ) : null}
              </li>
            ))}
          </ul>

          {/* 전체 완료(성공 1건 이상) 시 — 카톡방에 알리기 */}
          {allSettled && doneItems.length > 0 ? (
            <SheetFooter className="gap-2 px-4 pb-0 pt-2">
              <Button
                type="button"
                onClick={() => void handleShareToKakao()}
                className="h-12 w-full rounded-xl bg-kakao text-base font-semibold text-kakao-foreground
                  transition-transform hover:bg-kakao/90 active:scale-[0.97]
                  dark:bg-kakao dark:text-kakao-foreground"
              >
                카톡방에 알리기
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={closeSheet}
                className="h-11 w-full rounded-xl text-muted-foreground"
              >
                닫기
              </Button>
            </SheetFooter>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
