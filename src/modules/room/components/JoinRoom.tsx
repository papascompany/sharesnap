"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/modules/shared/components/LoadingSpinner";
import {
  getRoomPreview,
  joinRoomViaShareCode,
} from "@/modules/room/services/roomService";
import { useToast } from "@/modules/shared/hooks/useToast";
import type { RoomPreview } from "@/modules/room/types";

interface JoinRoomProps {
  shareCode: string;
}

export function JoinRoom({ shareCode }: JoinRoomProps) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [room, setRoom] = useState<RoomPreview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const data = await getRoomPreview(shareCode);
        setRoom(data);
      } catch (err) {
        toastError(err instanceof Error ? err.message : "방 정보 조회 실패");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [shareCode, toastError]);

  const handleJoin = async () => {
    try {
      setIsJoining(true);
      // joinRoomViaShareCode는 참여한 방의 id(string)를 반환 (멱등)
      const roomId = await joinRoomViaShareCode(shareCode);
      success(`'${room?.name ?? "공유방"}'에 참여했습니다.`);
      router.replace(`/rooms/${roomId}`);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "참여 실패");
    } finally {
      setIsJoining(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner size="md" label="초대 정보 확인 중..." />
      </div>
    );
  }

  if (!room) {
    return (
      <Card className="mx-auto mt-12 w-full max-w-md">
        <CardHeader>
          <CardTitle>잘못된 초대 링크</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          존재하지 않는 초대 코드입니다. 발신자에게 새 링크를 요청해 주세요.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto mt-12 w-full max-w-md">
      <CardHeader>
        <CardTitle>{room.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {room.description ? (
          <p className="text-sm text-muted-foreground">{room.description}</p>
        ) : null}
        <p className="text-sm">
          이 공유방에 참여하면 사진과 코멘트를 함께 남길 수 있어요.
        </p>
        <Button
          onClick={handleJoin}
          disabled={isJoining}
          className="w-full"
          size="lg"
        >
          {isJoining ? "참여 중..." : "참여하기"}
        </Button>
      </CardContent>
    </Card>
  );
}
