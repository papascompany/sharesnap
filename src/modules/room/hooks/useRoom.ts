"use client";

import { useCallback, useEffect, useState } from "react";
import { getRoom, listMyRooms } from "@/modules/room/services/roomService";
import type { Room } from "@/modules/room/types";

export function useMyRooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // 목록 로드 — setState는 모두 promise 콜백에서만 호출 (effect 동기 setState 방지)
  const refresh = useCallback((): Promise<void> => {
    return listMyRooms()
      .then((data) => {
        setRooms(data);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error("방 목록 로드 실패"));
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { rooms, isLoading, error, refresh };
}

export function useRoom(roomId: string | undefined) {
  const [room, setRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // roomId 변경 시 렌더 중 상태 리셋 (React 공식 "adjusting state when props change" 패턴)
  const [prevRoomId, setPrevRoomId] = useState(roomId);
  if (roomId !== prevRoomId) {
    setPrevRoomId(roomId);
    setRoom(null);
    setIsLoading(true);
    setError(null);
  }

  // 방 정보 로드 — setState는 모두 promise 콜백에서만 호출 (effect 동기 setState 방지)
  const refresh = useCallback((): Promise<void> => {
    if (!roomId) {
      // roomId 없음 — 마이크로태스크에서 로딩 종료 (동기 setState 회피)
      return Promise.resolve().then(() => {
        setRoom(null);
        setIsLoading(false);
      });
    }
    return getRoom(roomId)
      .then((data) => {
        setRoom(data);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error("방 정보 로드 실패"));
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [roomId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { room, isLoading, error, refresh };
}
