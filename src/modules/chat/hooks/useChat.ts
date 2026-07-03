"use client";

import { useCallback, useEffect, useState } from "react";
import { listMessages, sendMessage } from "@/modules/chat/services/chatService";
import { useRealtimeMessages } from "@/modules/chat/hooks/useRealtime";
import type { Message, SendMessageInput } from "@/modules/chat/types";

export function useChat(roomId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // roomId 변경 시 렌더 중 상태 리셋 (React 공식 "adjusting state when props change" 패턴)
  const [prevRoomId, setPrevRoomId] = useState(roomId);
  if (roomId !== prevRoomId) {
    setPrevRoomId(roomId);
    setMessages([]);
    setIsLoading(true);
    setError(null);
  }

  // 초기 메시지 로드 — setState는 모두 promise 콜백에서만 호출 (effect 동기 setState 방지)
  useEffect(() => {
    if (!roomId) return;
    listMessages(roomId)
      .then(setMessages)
      .catch((err) =>
        setError(err instanceof Error ? err : new Error("메시지 로드 실패")),
      )
      .finally(() => setIsLoading(false));
  }, [roomId]);

  const handleInsert = useCallback((msg: Message) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  }, []);

  // 사진 삭제(FK SET NULL) 등 row 갱신을 다른 참여자 화면에도 즉시 반영
  const handleUpdate = useCallback((msg: Message) => {
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, ...msg } : m)));
  }, []);

  const handleDelete = useCallback((messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  }, []);

  useRealtimeMessages({
    roomId,
    onInsert: handleInsert,
    onUpdate: handleUpdate,
    onDelete: handleDelete,
  });

  /**
   * 사진 삭제 직후 낙관적 반영 — 해당 사진을 참조하는 말풍선을 즉시 "삭제된 사진"으로.
   * DB는 FK ON DELETE SET NULL로 photo_id를 비우지만, 삭제 실행자 본인 화면은
   * Realtime UPDATE 왕복을 기다리지 않고 바로 갱신한다.
   */
  const markPhotoDeleted = useCallback((photoId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.photo_id === photoId ? { ...m, photo_id: null } : m)),
    );
  }, []);

  const send = useCallback(
    async (input: Omit<SendMessageInput, "roomId">) => {
      if (!roomId) return;
      const msg = await sendMessage({ ...input, roomId });
      // optimistic 추가 — Realtime 인서트가 늦게 와도 즉시 반영
      handleInsert(msg);
    },
    [roomId, handleInsert],
  );

  return { messages, isLoading, error, send, markPhotoDeleted };
}
