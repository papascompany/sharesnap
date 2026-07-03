"use client";

import { useEffect } from "react";
import { createClient } from "@/modules/shared/lib/supabase/client";
import { realtimeChannel } from "@/modules/shared/lib/constants";
import type { Message } from "@/modules/chat/types";

interface UseRealtimeMessagesParams {
  roomId: string | undefined;
  onInsert: (message: Message) => void;
  /** 사진 삭제 시 FK ON DELETE SET NULL로 photo_id가 바뀌는 등 row 갱신 반영 */
  onUpdate?: (message: Message) => void;
  onDelete?: (messageId: string) => void;
}

export function useRealtimeMessages({
  roomId,
  onInsert,
  onUpdate,
  onDelete,
}: UseRealtimeMessagesParams) {
  useEffect(() => {
    if (!roomId) return;

    const supabase = createClient();
    const channelName = realtimeChannel(roomId);
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          onInsert(payload.new as Message);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          if (onUpdate) onUpdate(payload.new as Message);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const id = (payload.old as { id?: string })?.id;
          if (id && onDelete) onDelete(id);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [roomId, onInsert, onUpdate, onDelete]);
}
