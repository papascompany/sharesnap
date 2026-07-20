"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useProfiles } from "@/modules/profile/hooks/useProfiles";
import { displayName } from "@/modules/profile/services/profileService";
import { cn, formatRelativeTime } from "@/modules/shared/lib/utils";
import { SystemMessage } from "@/modules/chat/components/SystemMessage";
import { PhotoMessage } from "@/modules/chat/components/PhotoMessage";
import { LoadingSpinner } from "@/modules/shared/components/LoadingSpinner";
import type { Message } from "@/modules/chat/types";

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
  /** 사진 메시지 탭 → 채팅방 내 뷰어 오픈 */
  onPhotoOpen?: (photoId: string) => void;
}

export function MessageList({
  messages,
  isLoading,
  onPhotoOpen,
}: MessageListProps) {
  const { user } = useAuth();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  // 작성자 표시 — 상대 메시지에만 이름을 노출(내 메시지는 관례상 생략)
  const profiles = useProfiles(messages.map((m) => m.user_id));

  // 새 메시지가 추가되면 자동 스크롤
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <LoadingSpinner size="sm" label="메시지 불러오는 중..." />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-12 text-center">
        <p className="text-sm text-muted-foreground">
          첫 번째 메시지를 남겨보세요.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-1 flex-col gap-2 px-4 py-4">
      {messages.map((msg) => {
        const isMine = msg.user_id === user?.id;
        if (msg.type === "system") {
          return (
            <li key={msg.id}>
              <SystemMessage content={msg.content} />
            </li>
          );
        }
        if (msg.type === "photo") {
          return (
            <li key={msg.id}>
              <PhotoMessage
                photoId={msg.photo_id}
                createdAt={msg.created_at}
                isMine={isMine}
                onOpen={onPhotoOpen}
              />
            </li>
          );
        }
        return (
          <li
            key={msg.id}
            className={cn(
              "flex flex-col gap-1",
              isMine ? "items-end" : "items-start",
            )}
          >
            {/* 상대 메시지 작성자 이름 — 단톡방 UX의 "누가 말했는지" */}
            {!isMine ? (
              <span className="px-1 text-[11px] text-muted-foreground">
                {displayName(profiles.get(msg.user_id), false)}
              </span>
            ) : null}
            {/* 채팅 버블 — 내 메시지는 선셋 그라데이션 + 꼬리쪽 라운드 축소 (design-system.md §4.4) */}
            <div
              className={cn(
                "max-w-[75%] rounded-2xl px-4 py-2.5 text-[15px] leading-[1.5] break-words",
                isMine
                  ? "rounded-br-md bg-sunset text-primary-foreground shadow-sm"
                  : "rounded-bl-md border border-border/60 bg-card text-foreground",
              )}
            >
              {msg.content}
            </div>
            <span className="text-[10px] tabular-nums text-muted-foreground/70">
              {formatRelativeTime(msg.created_at)}
            </span>
          </li>
        );
      })}
      <div ref={bottomRef} />
    </ul>
  );
}
