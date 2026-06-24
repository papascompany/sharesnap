"use client";

import { useState } from "react";
import { useChat } from "@/modules/chat/hooks/useChat";
import { usePhotos } from "@/modules/photo/hooks/usePhotos";
import { MessageInput } from "@/modules/chat/components/MessageInput";
import { MessageList } from "@/modules/chat/components/MessageList";
import { PhotoViewer } from "@/modules/photo/components/PhotoViewer";

interface ChatRoomProps {
  roomId: string;
}

export function ChatRoom({ roomId }: ChatRoomProps) {
  const { messages, isLoading, error, send } = useChat(roomId);
  // 채팅방에서 사진 탭 시 그 자리에서 뷰어를 열기 위한 사진 목록(삭제·포토북·코멘트 포함)
  const { photos, remove, toggleSelection } = usePhotos(roomId);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  // 삭제 등으로 인덱스가 범위를 벗어나면 렌더 중 보정(effect 동기 setState 금지 룰 대응)
  if (viewerIndex !== null && viewerIndex >= photos.length) {
    setViewerIndex(photos.length === 0 ? null : photos.length - 1);
  }

  const openPhoto = (photoId: string) => {
    const idx = photos.findIndex((p) => p.id === photoId);
    if (idx >= 0) setViewerIndex(idx);
  };

  return (
    <div className="flex flex-1 flex-col">
      {error ? (
        <div className="px-4 py-2 text-xs text-destructive">{error.message}</div>
      ) : null}
      <div className="flex flex-1 flex-col overflow-y-auto">
        <MessageList
          messages={messages}
          isLoading={isLoading}
          onPhotoOpen={openPhoto}
        />
      </div>
      <MessageInput onSend={(content) => send({ type: "text", content })} />

      {/* 채팅방 내 몰입형 사진 뷰어 — 본인 사진이면 삭제 버튼 노출 */}
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
    </div>
  );
}
