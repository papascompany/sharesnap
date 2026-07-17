"use client";

// 방 사진 갤러리 컨테이너 — 헤더(뒤로+방이름+사진 수) + 그리드/타임라인 탭 + FAB + 뷰어
// 서버 셸(page.tsx)이 방 메타만 내려주고, 데이터는 usePhotos(Realtime 포함)가 담당

import { useRef, useState } from "react";
import Link from "next/link";
import {
  BookHeart,
  ChevronLeft,
  ChevronRight,
  Images,
  LayoutGrid,
  Printer,
  Rows3,
} from "lucide-react";
import { PHOTOBOOK_NUDGE_THRESHOLD } from "@/modules/shared/lib/constants";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { MobileLayout } from "@/modules/shared/components/MobileLayout";
import { usePhotos } from "@/modules/photo/hooks/usePhotos";
import { PhotoGrid } from "@/modules/photo/components/PhotoGrid";
import { PhotoTimeline } from "@/modules/photo/components/PhotoTimeline";
import { PhotoViewer } from "@/modules/photo/components/PhotoViewer";
import {
  PhotoUploader,
  type PhotoUploaderHandle,
} from "@/modules/photo/components/PhotoUploader";
import type { Photo } from "@/modules/photo/types";

interface PhotoGalleryProps {
  roomId: string;
  roomName: string;
  shareCode: string;
}

export function PhotoGallery({ roomId, roomName, shareCode }: PhotoGalleryProps) {
  const { photos, isLoading, refresh, remove, toggleSelection } =
    usePhotos(roomId);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const uploaderRef = useRef<PhotoUploaderHandle>(null);

  // 삭제 등으로 인덱스가 범위를 벗어나면 렌더 중 보정 (effect 동기 setState 금지 룰 대응)
  if (viewerIndex !== null && viewerIndex >= photos.length) {
    setViewerIndex(photos.length === 0 ? null : photos.length - 1);
  }

  const isEmpty = !isLoading && photos.length === 0;

  /** 썸네일 탭 → 해당 사진 인덱스로 뷰어 오픈 */
  const openViewer = (photo: Photo) => {
    const idx = photos.findIndex((p) => p.id === photo.id);
    if (idx >= 0) setViewerIndex(idx);
  };

  return (
    <MobileLayout>
      <Tabs defaultValue="grid" className="flex flex-1 flex-col gap-0">
        {/* 갤러리 헤더 — TabsList(세그먼트 토글)가 Tabs 루트 안에 있어야 해서 자체 sticky 헤더 사용 */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/50 bg-background/80 px-2 backdrop-blur-xl">
          <div className="flex min-w-0 items-center">
            <Link
              href={`/rooms/${roomId}`}
              aria-label="채팅방으로 돌아가기"
              className="grid size-11 shrink-0 place-items-center text-foreground transition-transform active:scale-90"
            >
              <ChevronLeft className="size-6" aria-hidden />
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-[17px] font-semibold">{roomName}</h1>
              <p className="text-[11px] text-muted-foreground">
                {isLoading ? "불러오는 중..." : `사진 ${photos.length}장`}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            {/* 인화 주문 진입 — 이 방 사진으로 바로 시작 (/print/new?room=) */}
            {photos.length > 0 ? (
              <Link
                href={`/print/new?room=${roomId}`}
                aria-label="이 방 사진으로 인화 주문"
                className="grid size-11 place-items-center text-foreground transition-transform active:scale-90"
              >
                <Printer className="size-5" strokeWidth={1.8} aria-hidden />
              </Link>
            ) : null}
            {/* 그리드/타임라인 토글 (design-system.md §5.4) */}
            <TabsList className="mr-2 shrink-0">
              <TabsTrigger value="grid" aria-label="그리드 보기">
                <LayoutGrid className="size-4" aria-hidden />
              </TabsTrigger>
              <TabsTrigger value="timeline" aria-label="타임라인 보기">
                <Rows3 className="size-4" aria-hidden />
              </TabsTrigger>
            </TabsList>
          </div>
        </header>

        {isEmpty ? (
          /* 엠티 스테이트 — 사진 0장 (design-system.md §4.7) */
          <div className="flex flex-1 animate-fade-up flex-col items-center justify-center gap-4 px-6 py-16 text-center">
            <div className="flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Images className="size-9" strokeWidth={1.5} aria-hidden />
            </div>
            <div className="space-y-1.5">
              <p className="text-[17px] font-semibold">첫 사진을 올려보세요</p>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                함께한 순간을 올리면
                <br />
                채팅방에도 자동으로 공유돼요
              </p>
            </div>
            <Button
              type="button"
              onClick={() => uploaderRef.current?.openPicker()}
              className="h-11 rounded-xl px-6 font-semibold"
            >
              사진 올리기
            </Button>
          </div>
        ) : (
          <>
            {/* 포토북 넛지 — 사진이 충분히 모이면 제작 유도 (감사 전환 레버) */}
            {photos.length >= PHOTOBOOK_NUDGE_THRESHOLD ? (
              <Link
                href={`/rooms/${roomId}/photobook`}
                className="mx-4 mt-3 flex items-center gap-3 rounded-2xl bg-sunset p-4 text-white shadow-sm transition active:scale-[0.99]"
              >
                <BookHeart className="size-7 shrink-0" strokeWidth={1.7} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-bold">
                    사진 {photos.length}장이 모였어요
                  </p>
                  <p className="text-[12px] text-white/85">
                    이 사진들로 포토북을 만들어 보세요
                  </p>
                </div>
                <ChevronRight className="size-5 shrink-0" aria-hidden />
              </Link>
            ) : null}
            <TabsContent value="grid">
              <PhotoGrid
                photos={photos}
                isLoading={isLoading}
                onPhotoClick={openViewer}
              />
            </TabsContent>
            <TabsContent value="timeline">
              <PhotoTimeline
                photos={photos}
                isLoading={isLoading}
                onPhotoClick={openViewer}
              />
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* 업로드 FAB + 진행 시트 — Realtime 누락 대비로 완료 시 refresh */}
      <PhotoUploader
        ref={uploaderRef}
        roomId={roomId}
        roomName={roomName}
        shareCode={shareCode}
        onUploaded={() => void refresh()}
      />

      {/* 몰입형 뷰어 */}
      {viewerIndex !== null && photos[viewerIndex] ? (
        <PhotoViewer
          photos={photos}
          index={viewerIndex}
          onIndexChange={setViewerIndex}
          onClose={() => setViewerIndex(null)}
          onToggleSelection={toggleSelection}
          onDelete={remove}
        />
      ) : null}
    </MobileLayout>
  );
}
