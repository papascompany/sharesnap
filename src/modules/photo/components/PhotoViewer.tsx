"use client";

// 사진 뷰어 — 몰입형 시네마 모드 (design-system.md §5.5)
// 테마 무관 순수 블랙 강제 (bg-background 아님 — 의도된 하드코딩)
// 좌우 스와이프/버튼 내비, 탭하면 UI 토글, ESC/뒤로가기로 닫기

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type TouchEvent as ReactTouchEvent,
} from "react";
import {
  BookHeart,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Trash2,
  X,
} from "lucide-react";
import { PhotoComments } from "@/modules/photo/components/PhotoComments";
import {
  formatPhotoDateLabel,
  getPhotoDate,
} from "@/modules/photo/utils/photoDate";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { cn, formatRelativeTime } from "@/modules/shared/lib/utils";
import type { Photo } from "@/modules/photo/types";

/** 스와이프로 판정할 최소 가로 이동 거리 (px) */
const SWIPE_THRESHOLD_PX = 48;

interface PhotoViewerProps {
  photos: Photo[];
  /** 현재 사진 인덱스 — 범위 보정은 호출측(컨테이너) 책임 */
  index: number;
  onIndexChange: (next: number) => void;
  onClose: () => void;
  /** 포토북 선택 토글 (낙관적 — usePhotos.toggleSelection) */
  onToggleSelection: (photoId: string, value: boolean) => void | Promise<void>;
  /** 사진 삭제 (낙관적 — usePhotos.remove, 성공 여부 반환 가능). 본인 사진에만 노출 */
  onDelete: (photoId: string) => void | Promise<unknown>;
}

export function PhotoViewer({
  photos,
  index,
  onIndexChange,
  onClose,
  onToggleSelection,
  onDelete,
}: PhotoViewerProps) {
  const { user } = useAuth();
  const [uiVisible, setUiVisible] = useState(true);
  const [commentsOpen, setCommentsOpen] = useState(false);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  // 스와이프 직후 발생하는 합성 click으로 UI가 토글되는 것 방지
  const suppressClickRef = useRef(false);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const photo = photos[index];

  const goTo = useCallback(
    (next: number) => {
      if (next < 0 || next >= photos.length) return;
      onIndexChange(next);
    },
    [photos.length, onIndexChange],
  );

  // 닫기는 항상 history.back() 경유로 일원화 → popstate 리스너가 실제 onClose 수행.
  // (X/ESC가 onClose를 직접 호출하면 더미 히스토리 엔트리가 잔류해 뒤로가기 한 번이 씹힘)
  const requestClose = useCallback(() => {
    window.history.back();
  }, []);

  // ESC/방향키 — 닫기/이동
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
      else if (e.key === "ArrowLeft") goTo(index - 1);
      else if (e.key === "ArrowRight") goTo(index + 1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [index, goTo, requestClose]);

  // 뒤로가기로 닫기 — 진입 시 더미 히스토리 엔트리 push, popstate 시 onClose.
  // cleanup에서는 back()을 호출하지 않는다: React StrictMode(dev)의 이중 마운트 시
  // cleanup의 back()이 비동기 popstate로 두 번째 마운트의 리스너를 때려 뷰어가
  // 열리자마자 닫히는 버그를 유발한다. 엔트리 정리는 requestClose(back) 경로가 담당.
  useEffect(() => {
    window.history.pushState({ photoViewer: true }, "");
    const onPop = () => onCloseRef.current();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // 뷰어 열린 동안 배경 스크롤 잠금
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const handleTouchStart = (e: ReactTouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchEnd = (e: ReactTouchEvent) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    // 가로 이동이 충분하고 세로보다 클 때만 스와이프로 판정
    if (Math.abs(dx) > SWIPE_THRESHOLD_PX && Math.abs(dx) > Math.abs(dy)) {
      suppressClickRef.current = true;
      goTo(index + (dx < 0 ? 1 : -1));
    }
  };

  /** 이미지 영역 탭 → UI 표시 토글 */
  const handleBackdropClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    setUiVisible((v) => !v);
  };

  if (!photo) return null;

  const isMine = photo.user_id === user?.id;
  const imageUrl = photo.mediumUrl ?? photo.thumbnailUrl;
  const neighbors = [photos[index - 1], photos[index + 1]];

  const handleDelete = () => {
    // 파괴적 동작 확인 — 전용 confirm 다이얼로그 도입은 후속 과제
    if (!window.confirm("이 사진을 삭제할까요?")) return;
    setCommentsOpen(false);
    void onDelete(photo.id);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black"
      role="dialog"
      aria-modal="true"
      aria-label="사진 뷰어"
    >
      {/* 이미지 영역 — 탭하면 UI 토글, 좌우 스와이프로 이동 */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        onClick={handleBackdropClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {imageUrl ? (
          // Supabase Storage 원격 이미지 — next/image 원격 패턴 미설정으로 img 사용
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={photo.original_filename ?? "공유된 사진"}
            draggable={false}
            className="size-full select-none object-contain"
          />
        ) : (
          <p className="text-[13px] text-white/60">이미지를 불러올 수 없어요</p>
        )}
      </div>

      {/* 이웃 사진 프리로드 — 스와이프 시 깜빡임 감소 */}
      <div className="hidden" aria-hidden>
        {neighbors.map((p) =>
          p?.mediumUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={p.id} src={p.mediumUrl} alt="" />
          ) : null,
        )}
      </div>

      {/* 상단 스크림 바 — 닫기 / 날짜·촬영자 / 카운터 */}
      <div
        data-hidden={!uiVisible}
        className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 bg-gradient-to-b from-black/60 to-transparent px-2 pb-6 pt-safe text-white transition-opacity duration-200 data-[hidden=true]:pointer-events-none data-[hidden=true]:opacity-0"
      >
        <button
          type="button"
          onClick={requestClose}
          aria-label="닫기"
          className="grid size-11 shrink-0 place-items-center transition-transform active:scale-90"
        >
          <X className="size-6" aria-hidden />
        </button>
        <div className="min-w-0 text-center">
          <p className="truncate text-[13px] font-medium">
            {formatPhotoDateLabel(getPhotoDate(photo))}
          </p>
          {/* TODO(photo): 프로필 테이블 조인 후 업로더 닉네임 표시 */}
          <p className="text-[11px] text-white/70">
            {isMine ? "내가 올린 사진" : "멤버가 올린 사진"}
          </p>
        </div>
        <span className="grid h-11 min-w-11 shrink-0 place-items-center px-1 text-[13px] tabular-nums text-white/80">
          {index + 1} / {photos.length}
        </span>
      </div>

      {/* 좌우 내비 버튼 (데스크톱/접근성 보조 — 모바일은 스와이프) */}
      {index > 0 ? (
        <button
          type="button"
          data-hidden={!uiVisible}
          onClick={() => goTo(index - 1)}
          aria-label="이전 사진"
          className="absolute left-1 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/30 text-white/90 transition-opacity duration-200 active:scale-90 data-[hidden=true]:pointer-events-none data-[hidden=true]:opacity-0"
        >
          <ChevronLeft className="size-6" aria-hidden />
        </button>
      ) : null}
      {index < photos.length - 1 ? (
        <button
          type="button"
          data-hidden={!uiVisible}
          onClick={() => goTo(index + 1)}
          aria-label="다음 사진"
          className="absolute right-1 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/30 text-white/90 transition-opacity duration-200 active:scale-90 data-[hidden=true]:pointer-events-none data-[hidden=true]:opacity-0"
        >
          <ChevronRight className="size-6" aria-hidden />
        </button>
      ) : null}

      {/* 하단 스크림 바 — 공유 시각 + 액션 (포토북 토글/코멘트/삭제) */}
      <div
        data-hidden={!uiVisible}
        className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/70 to-transparent px-4 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-10 text-white transition-opacity duration-200 data-[hidden=true]:pointer-events-none data-[hidden=true]:opacity-0"
      >
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-white/70">
            {formatRelativeTime(photo.created_at)} 공유됨
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() =>
                void onToggleSelection(photo.id, !photo.is_selected_for_book)
              }
              aria-label={
                photo.is_selected_for_book
                  ? "포토북 선택 해제"
                  : "포토북에 선택"
              }
              aria-pressed={photo.is_selected_for_book}
              className={cn(
                "grid size-11 place-items-center transition-transform active:scale-90",
                photo.is_selected_for_book ? "text-primary" : "text-white",
              )}
            >
              <BookHeart
                className={cn(
                  "size-6",
                  photo.is_selected_for_book && "fill-current",
                )}
                aria-hidden
              />
            </button>
            <button
              type="button"
              onClick={() => setCommentsOpen(true)}
              aria-label="코멘트 보기"
              className="grid size-11 place-items-center text-white transition-transform active:scale-90"
            >
              <MessageCircle className="size-6" aria-hidden />
            </button>
            {isMine ? (
              <button
                type="button"
                onClick={handleDelete}
                aria-label="사진 삭제"
                className="grid size-11 place-items-center text-white transition-transform active:scale-90"
              >
                <Trash2 className="size-6" aria-hidden />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* 코멘트 바텀시트 — 뷰어 위에 겹쳐서 (design-system.md §5.5) */}
      <PhotoComments
        photoId={photo.id}
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
      />
    </div>
  );
}
