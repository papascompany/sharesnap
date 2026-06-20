"use client";

// 사진 그리드 — 3열 · 2px 간격 · 정사각 썸네일 (design-system.md §5.4 애플 사진 문법)

import { Check, Images } from "lucide-react";
import { Skeleton } from "@/modules/shared/components/Skeleton";
import type { Photo } from "@/modules/photo/types";

interface PhotoThumbButtonProps {
  photo: Photo;
  onClick: (photo: Photo) => void;
}

/**
 * 정사각 썸네일 셀 — 그리드/타임라인 공용.
 * 탭 피드백은 opacity만 사용 (scale 금지 — 그리드 떨림, design-system.md §3.3)
 */
export function PhotoThumbButton({ photo, onClick }: PhotoThumbButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(photo)}
      aria-label={`사진 보기${photo.is_selected_for_book ? " (포토북 선택됨)" : ""}`}
      className="relative block aspect-square w-full overflow-hidden transition-opacity duration-150 active:opacity-80"
    >
      {photo.thumbnailUrl ? (
        // Supabase Storage 원격 이미지 — next/image 원격 패턴 미설정으로 img 사용
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo.thumbnailUrl}
          alt=""
          loading="lazy"
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground">
          <Images className="size-6" strokeWidth={1.5} aria-hidden />
        </span>
      )}
      {/* 포토북 선택 표시 — 우상단 체크 뱃지 */}
      {photo.is_selected_for_book ? (
        <span
          className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"
          aria-hidden
        >
          <Check className="size-3" strokeWidth={3} />
        </span>
      ) : null}
    </button>
  );
}

interface PhotoGridProps {
  photos: Photo[];
  isLoading?: boolean;
  /** 썸네일 탭 → 뷰어 오픈 */
  onPhotoClick: (photo: Photo) => void;
}

export function PhotoGrid({
  photos,
  isLoading = false,
  onPhotoClick,
}: PhotoGridProps) {
  // 로딩 스켈레톤 — 실제 그리드와 동일한 골격 (design-system.md §3.4)
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-0.5" aria-hidden>
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-none" />
        ))}
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-3 gap-0.5 pb-24">
      {photos.map((photo) => (
        <li key={photo.id}>
          <PhotoThumbButton photo={photo} onClick={onPhotoClick} />
        </li>
      ))}
    </ul>
  );
}
