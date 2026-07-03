"use client";

// 채팅 사진 메시지 — 실제 썸네일 표시 + 탭하면 그 자리에서 사진 뷰어 오픈(삭제·포토북·코멘트)

import { useEffect, useState } from "react";
import { Images } from "lucide-react";
import { cn, formatRelativeTime } from "@/modules/shared/lib/utils";
import { Skeleton } from "@/modules/shared/components/Skeleton";
import { getPhotoById } from "@/modules/photo/services/photoService";
import type { Photo } from "@/modules/photo/types";

interface PhotoMessageProps {
  photoId: string | null;
  createdAt: string;
  isMine: boolean;
  /** 썸네일 탭 → 채팅방 내 사진 뷰어 오픈 (ChatRoom이 사진 목록에서 해당 사진을 찾아 연다) */
  onOpen?: (photoId: string) => void;
}

export function PhotoMessage({
  photoId,
  createdAt,
  isMine,
  onOpen,
}: PhotoMessageProps) {
  const [photo, setPhoto] = useState<Photo | null>(null);
  // photoId가 없으면(원본 삭제로 FK가 NULL) 로드할 것이 없음
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(photoId));

  // photoId 변경(특히 삭제로 NULL화) 시 이미 로드된 썸네일을 버리고 리셋
  // — React 공식 "adjusting state when props change" 렌더 중 prev 비교 패턴
  const [prevPhotoId, setPrevPhotoId] = useState(photoId);
  if (photoId !== prevPhotoId) {
    setPrevPhotoId(photoId);
    setPhoto(null);
    setIsLoading(Boolean(photoId));
  }

  useEffect(() => {
    if (!photoId) return;
    let cancelled = false;
    // setState는 promise 콜백에서만 호출 (react-hooks/set-state-in-effect 룰 대응)
    getPhotoById(photoId)
      .then((found) => {
        if (!cancelled) setPhoto(found);
      })
      .catch(() => {
        // 삭제되었거나 접근 불가 — placeholder 유지 (메시지 단위 토스트는 과도)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [photoId]);

  // 채팅 버블과 같은 꼬리쪽 라운드 축소 문법 (design-system.md §4.4)
  const thumbClass = cn(
    "relative block size-40 overflow-hidden rounded-2xl",
    isMine ? "rounded-br-md" : "rounded-bl-md",
  );

  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        isMine ? "items-end" : "items-start",
      )}
    >
      {isLoading ? (
        <Skeleton className={thumbClass} />
      ) : photo?.thumbnailUrl ? (
        <button
          type="button"
          onClick={() => photoId && onOpen?.(photoId)}
          aria-label="사진 크게 보기"
          className={cn(thumbClass, "transition-opacity active:opacity-80")}
        >
          {/* Supabase Storage 원격 이미지 — next/image 원격 패턴 미설정으로 img 사용 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.thumbnailUrl}
            alt="공유된 사진"
            loading="lazy"
            className="absolute inset-0 size-full object-cover"
          />
        </button>
      ) : (
        <div
          className={cn(
            thumbClass,
            "flex items-center justify-center bg-muted text-muted-foreground",
          )}
        >
          <span className="flex flex-col items-center gap-1 text-[11px]">
            <Images className="size-5" strokeWidth={1.5} aria-hidden />
            삭제된 사진
          </span>
        </div>
      )}
      <span className="text-[10px] tabular-nums text-muted-foreground/70">
        {formatRelativeTime(createdAt)}
      </span>
    </div>
  );
}
