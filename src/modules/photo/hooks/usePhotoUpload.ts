"use client";

// 다중 사진 업로드 큐 훅 — 동시 2개 제한, 항목별 진행률/재시도, 전체 완료 콜백

import { useCallback, useEffect, useRef, useState } from "react";
import { uploadPhoto } from "@/modules/photo/services/photoService";
import { MAX_PHOTOS_PER_UPLOAD } from "@/modules/shared/lib/constants";
// useToast()는 매 렌더마다 새 객체를 반환해 useCallback 의존성에 부적합 →
// 같은 모듈의 안정적인 toast(sonner 래퍼) export 사용
import { toast } from "@/modules/shared/hooks/useToast";
import type {
  UploadQueueItem,
  PhotoUploadResult,
} from "@/modules/photo/types";

/** 동시 업로드 개수 제한 */
const MAX_CONCURRENT_UPLOADS = 2;

interface UsePhotoUploadOptions {
  /** 항목 1건 완료 시 호출 */
  onItemDone?: (result: PhotoUploadResult) => void;
  /** 큐 전체 종료 시 호출 (성공 결과만 전달, 실패 항목은 큐에 error로 남음) */
  onAllDone?: (results: PhotoUploadResult[]) => void;
}

export function usePhotoUpload(
  roomId: string | undefined,
  options?: UsePhotoUploadOptions,
) {
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // 클로저 stale 방지용 ref — 큐/동시 실행 수/누적 결과/콜백
  const queueRef = useRef<UploadQueueItem[]>([]);
  const activeCountRef = useRef(0);
  const resultsRef = useRef<PhotoUploadResult[]>([]);
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  /** ref → state 동기화 */
  const syncQueue = useCallback(() => {
    setQueue([...queueRef.current]);
  }, []);

  /** 큐 항목 부분 갱신 */
  const patchItem = useCallback(
    (itemId: string, patch: Partial<UploadQueueItem>) => {
      queueRef.current = queueRef.current.map((item) =>
        item.id === itemId ? { ...item, ...patch } : item,
      );
      syncQueue();
    },
    [syncQueue],
  );

  /** pending 항목을 동시 제한 내에서 실행 (재귀 펌프) */
  const pump = useCallback(
    // 명명 함수 표현식 — finally 안에서 자기 자신을 안전하게 재호출
    function pumpQueue(targetRoomId: string) {
      while (activeCountRef.current < MAX_CONCURRENT_UPLOADS) {
        const next = queueRef.current.find((i) => i.status === "pending");
        if (!next) break;

        activeCountRef.current += 1;
        patchItem(next.id, { status: "processing", progress: 0, error: undefined });

        void uploadPhoto(targetRoomId, next.file, (progress) => {
          // ~25%는 클라이언트 리사이즈(processing), 이후 Storage/DB(uploading)
          patchItem(next.id, {
            status: progress < 30 ? "processing" : "uploading",
            progress,
          });
        })
          .then((result) => {
            resultsRef.current.push(result);
            patchItem(next.id, {
              status: "done",
              progress: 100,
              photo: result.photo,
            });
            optionsRef.current?.onItemDone?.(result);
          })
          .catch((err) => {
            patchItem(next.id, {
              status: "error",
              error:
                err instanceof Error ? err.message : "업로드에 실패했습니다.",
            });
            toast.error(`'${next.file.name}' 업로드에 실패했습니다.`);
          })
          .finally(() => {
            activeCountRef.current -= 1;
            const hasPending = queueRef.current.some(
              (i) => i.status === "pending",
            );
            if (hasPending) {
              pumpQueue(targetRoomId);
            } else if (activeCountRef.current === 0) {
              // 전체 종료 — 성공 결과 전달
              setIsUploading(false);
              optionsRef.current?.onAllDone?.([...resultsRef.current]);
              resultsRef.current = [];
            }
          });
      }
    },
    [patchItem],
  );

  /** 파일들을 큐에 추가하고 업로드 시작 */
  const enqueue = useCallback(
    (files: File[]) => {
      if (!roomId || files.length === 0) return;

      // 한 번에 업로드 가능한 개수 제한 (완료/실패 제외 활성 항목 기준)
      const activeItems = queueRef.current.filter(
        (i) => i.status !== "done" && i.status !== "error",
      ).length;
      const available = MAX_PHOTOS_PER_UPLOAD - activeItems;
      if (available <= 0) {
        toast.error(
          `한 번에 최대 ${MAX_PHOTOS_PER_UPLOAD}장까지 업로드할 수 있습니다.`,
        );
        return;
      }
      if (files.length > available) {
        toast.warning(
          `한 번에 최대 ${MAX_PHOTOS_PER_UPLOAD}장까지 가능해 ${available}장만 추가했습니다.`,
        );
      }

      const newItems: UploadQueueItem[] = files
        .slice(0, available)
        .map((file) => ({
          id: crypto.randomUUID(),
          file,
          status: "pending",
          progress: 0,
        }));

      queueRef.current = [...queueRef.current, ...newItems];
      syncQueue();
      setIsUploading(true);
      pump(roomId);
    },
    [roomId, pump, syncQueue],
  );

  /** 실패 항목 재시도 */
  const retry = useCallback(
    (itemId: string) => {
      if (!roomId) return;
      const item = queueRef.current.find((i) => i.id === itemId);
      if (!item || item.status !== "error") return;
      patchItem(itemId, { status: "pending", progress: 0, error: undefined });
      setIsUploading(true);
      pump(roomId);
    },
    [roomId, pump, patchItem],
  );

  /** 항목 제거 (업로드 중인 항목은 제거 불가) */
  const removeItem = useCallback(
    (itemId: string) => {
      const item = queueRef.current.find((i) => i.id === itemId);
      if (!item || item.status === "processing" || item.status === "uploading")
        return;
      queueRef.current = queueRef.current.filter((i) => i.id !== itemId);
      syncQueue();
    },
    [syncQueue],
  );

  /** 완료/실패 항목 일괄 정리 */
  const clearFinished = useCallback(() => {
    queueRef.current = queueRef.current.filter(
      (i) => i.status !== "done" && i.status !== "error",
    );
    syncQueue();
  }, [syncQueue]);

  // 전체 진행률 (0~100) — 큐가 비어 있으면 0
  const totalProgress =
    queue.length === 0
      ? 0
      : Math.round(
          queue.reduce((sum, i) => sum + i.progress, 0) / queue.length,
        );

  return {
    queue,
    isUploading,
    totalProgress,
    enqueue,
    retry,
    removeItem,
    clearFinished,
  };
}
