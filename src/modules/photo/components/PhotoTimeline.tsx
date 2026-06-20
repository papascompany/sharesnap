"use client";

// 사진 타임라인 — taken_at(없으면 created_at) 날짜별 그룹 + sticky 날짜 헤더 (design-system.md §5.4)

import { useMemo } from "react";
import { Skeleton } from "@/modules/shared/components/Skeleton";
import { PhotoThumbButton } from "@/modules/photo/components/PhotoGrid";
import { groupPhotosByDate } from "@/modules/photo/utils/photoDate";
import type { Photo } from "@/modules/photo/types";

interface PhotoTimelineProps {
  photos: Photo[];
  isLoading?: boolean;
  /** 썸네일 탭 → 뷰어 오픈 */
  onPhotoClick: (photo: Photo) => void;
}

export function PhotoTimeline({
  photos,
  isLoading = false,
  onPhotoClick,
}: PhotoTimelineProps) {
  const groups = useMemo(() => groupPhotosByDate(photos), [photos]);

  // 로딩 스켈레톤 — 날짜 헤더 + 그리드 골격
  if (isLoading) {
    return (
      <div className="flex flex-col" aria-hidden>
        <div className="px-4 py-2">
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="grid grid-cols-3 gap-0.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-none" />
          ))}
        </div>
        <div className="mt-3 px-4 py-2">
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="grid grid-cols-3 gap-0.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-none" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col pb-24">
      {groups.map((group) => (
        <section key={group.key} aria-label={group.label}>
          {/* sticky 날짜 헤더 — 갤러리 헤더(h-14) 바로 아래에 고정 */}
          <h2 className="sticky top-14 z-10 bg-background/80 px-4 py-2 text-[13px] font-semibold text-muted-foreground backdrop-blur-md">
            {group.label}
          </h2>
          <ul className="grid grid-cols-3 gap-0.5">
            {group.photos.map((photo) => (
              <li key={photo.id}>
                <PhotoThumbButton photo={photo} onClick={onPhotoClick} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
