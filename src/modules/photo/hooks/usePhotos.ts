"use client";

// 방 사진 목록 + Realtime(INSERT/DELETE) 동기화 훅

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/modules/shared/lib/supabase/client";
import {
  listPhotos,
  deletePhoto,
  toggleBookSelection,
  toPhoto,
} from "@/modules/photo/services/photoService";
// useToast()는 매 렌더마다 새 객체를 반환해 useCallback 의존성에 부적합 →
// 같은 모듈의 안정적인 toast(sonner 래퍼) export 사용
import { toast } from "@/modules/shared/hooks/useToast";
import type { Photo, PhotoRow } from "@/modules/photo/types";

export function usePhotos(roomId: string | undefined) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // roomId 변경 시 렌더 중 상태 리셋 (React 공식 "adjusting state when props change" 패턴)
  const [prevRoomId, setPrevRoomId] = useState(roomId);
  if (roomId !== prevRoomId) {
    setPrevRoomId(roomId);
    setPhotos([]);
    setIsLoading(true);
    setError(null);
  }

  // 목록 로드 (최신순) — setState는 모두 promise 콜백에서만 호출 (effect 동기 setState 방지)
  const refresh = useCallback((): Promise<void> => {
    if (!roomId) return Promise.resolve();
    return listPhotos(roomId)
      .then((list) => {
        setPhotos(list);
        setError(null);
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err : new Error("사진 목록 로드 실패"),
        );
        toast.error("사진 목록을 불러오지 못했습니다.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [roomId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Realtime 구독 — photos 테이블 INSERT/DELETE (채널: room:{roomId}:photos)
  useEffect(() => {
    if (!roomId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`room:${roomId}:photos`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "photos",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const photo = toPhoto(payload.new as PhotoRow);
          setPhotos((prev) => {
            if (prev.some((p) => p.id === photo.id)) return prev;
            return [photo, ...prev]; // 최신순 유지 — 앞에 추가
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "photos",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const id = (payload.old as { id?: string })?.id;
          if (id) setPhotos((prev) => prev.filter((p) => p.id !== id));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [roomId]);

  /** 사진 삭제 — 낙관적 제거, 실패 시 복원. 성공 여부 반환(호출측 후속 갱신용) */
  const remove = useCallback(async (photoId: string): Promise<boolean> => {
    let snapshot: Photo[] = [];
    setPhotos((prev) => {
      snapshot = prev;
      return prev.filter((p) => p.id !== photoId);
    });
    try {
      await deletePhoto(photoId);
      toast.success("사진을 삭제했어요.");
      return true;
    } catch {
      setPhotos(snapshot);
      toast.error("사진 삭제에 실패했습니다.");
      return false;
    }
  }, []);

  /** 포토북 선택 토글 — 낙관적 반영, 실패 시 롤백 */
  const toggleSelection = useCallback(
    async (photoId: string, value: boolean) => {
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === photoId ? { ...p, is_selected_for_book: value } : p,
        ),
      );
      try {
        await toggleBookSelection(photoId, value);
      } catch {
        setPhotos((prev) =>
          prev.map((p) =>
            p.id === photoId ? { ...p, is_selected_for_book: !value } : p,
          ),
        );
        toast.error("포토북 선택 변경에 실패했습니다.");
      }
    },
    [],
  );

  return { photos, isLoading, error, refresh, remove, toggleSelection };
}
