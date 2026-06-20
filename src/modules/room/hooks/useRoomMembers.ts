"use client";

import { useCallback, useEffect, useState } from "react";
import { listRoomMembers } from "@/modules/room/services/roomService";
import type { RoomMember } from "@/modules/room/types";

export function useRoomMembers(roomId: string | undefined) {
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // roomId 변경 시 렌더 중 상태 리셋 (React 공식 "adjusting state when props change" 패턴)
  const [prevRoomId, setPrevRoomId] = useState(roomId);
  if (roomId !== prevRoomId) {
    setPrevRoomId(roomId);
    setMembers([]);
    setIsLoading(true);
    setError(null);
  }

  // 멤버 목록 로드 — setState는 모두 promise 콜백에서만 호출 (effect 동기 setState 방지)
  const refresh = useCallback((): Promise<void> => {
    if (!roomId) return Promise.resolve();
    return listRoomMembers(roomId)
      .then((data) => {
        setMembers(data);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error("멤버 목록 로드 실패"));
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [roomId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { members, isLoading, error, refresh };
}
