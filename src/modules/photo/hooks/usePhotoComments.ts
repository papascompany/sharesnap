"use client";

// 사진 코멘트 훅 — 목록 + 추가/삭제 (낙관적 업데이트)

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/modules/shared/lib/supabase/client";
import {
  listComments,
  addComment,
  deleteComment,
} from "@/modules/photo/services/photoService";
// useToast()는 매 렌더마다 새 객체를 반환해 useCallback 의존성에 부적합 →
// 같은 모듈의 안정적인 toast(sonner 래퍼) export 사용
import { toast } from "@/modules/shared/hooks/useToast";
import type { PhotoComment } from "@/modules/photo/types";

export function usePhotoComments(photoId: string | undefined) {
  const [comments, setComments] = useState<PhotoComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // 롤백 스냅샷용 최신 상태 ref
  const commentsRef = useRef<PhotoComment[]>([]);
  useEffect(() => {
    commentsRef.current = comments;
  }, [comments]);

  // photoId 변경 시(뷰어 스와이프 등) 렌더 중 상태 리셋
  const [prevPhotoId, setPrevPhotoId] = useState(photoId);
  if (photoId !== prevPhotoId) {
    setPrevPhotoId(photoId);
    setComments([]);
    setIsLoading(true);
    setError(null);
  }

  // 목록 로드 (오래된 순) — setState는 모두 promise 콜백에서만 호출 (effect 동기 setState 방지)
  const refresh = useCallback((): Promise<void> => {
    if (!photoId) return Promise.resolve();
    return listComments(photoId)
      .then((list) => {
        setComments(list);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error("코멘트 로드 실패"));
        toast.error("코멘트를 불러오지 못했습니다.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [photoId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** 코멘트 추가 — 임시 항목 즉시 표시 후 서버 응답으로 교체, 실패 시 제거 */
  const add = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!photoId || !trimmed) return;

      // 낙관적 임시 코멘트 (user_id는 로컬 세션에서 — 네트워크 호출 없음)
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const tempId = `temp-${crypto.randomUUID()}`;
      const temp: PhotoComment = {
        id: tempId,
        photo_id: photoId,
        user_id: session?.user?.id ?? "",
        content: trimmed,
        created_at: new Date().toISOString(),
      };
      setComments((prev) => [...prev, temp]);

      try {
        const saved = await addComment(photoId, trimmed);
        setComments((prev) =>
          prev.map((c) => (c.id === tempId ? saved : c)),
        );
      } catch {
        setComments((prev) => prev.filter((c) => c.id !== tempId));
        toast.error("코멘트 등록에 실패했습니다.");
      }
    },
    [photoId],
  );

  /** 코멘트 삭제 — 즉시 제거, 실패 시 복원 */
  const remove = useCallback(async (commentId: string) => {
    const snapshot = commentsRef.current;
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    try {
      await deleteComment(commentId);
    } catch {
      setComments(snapshot);
      toast.error("코멘트 삭제에 실패했습니다.");
    }
  }, []);

  return { comments, isLoading, error, refresh, add, remove };
}
