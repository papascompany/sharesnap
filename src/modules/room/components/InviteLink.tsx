"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/modules/shared/hooks/useToast";
import { APP_URL } from "@/modules/shared/lib/constants";
import { KakaoShareButton } from "@/modules/room/components/KakaoShareButton";

interface InviteLinkProps {
  shareCode: string;
  roomName: string;
  coverImageUrl?: string;
}

export function InviteLink({ shareCode, roomName, coverImageUrl }: InviteLinkProps) {
  const { success, error: toastError } = useToast();
  const [copying, setCopying] = useState(false);

  const inviteUrl = useMemo(
    () => `${APP_URL}/join/${shareCode}`,
    [shareCode],
  );

  const handleCopy = async () => {
    try {
      setCopying(true);
      await navigator.clipboard.writeText(inviteUrl);
      success("초대 링크를 복사했습니다.");
    } catch {
      toastError("복사에 실패했습니다. 직접 선택해 주세요.");
    } finally {
      setCopying(false);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator === "undefined" || !navigator.share) {
      handleCopy();
      return;
    }
    try {
      await navigator.share({
        title: `${roomName} — ShareSnap 공유방 초대`,
        text: `'${roomName}' 공유방에 참여해 사진을 함께 모아보세요.`,
        url: inviteUrl,
      });
    } catch {
      // 사용자가 취소한 경우 무시
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>친구 초대하기</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input value={inviteUrl} readOnly onFocus={(e) => e.target.select()} />
        <div className="flex gap-2">
          <Button onClick={handleCopy} className="flex-1" disabled={copying}>
            {copying ? "복사 중..." : "링크 복사"}
          </Button>
          <Button
            onClick={handleNativeShare}
            variant="outline"
            className="flex-1"
          >
            공유하기
          </Button>
        </div>
        <KakaoShareButton
          shareCode={shareCode}
          roomName={roomName}
          coverImageUrl={coverImageUrl}
        />
        <p className="text-xs text-muted-foreground">
          초대 코드: <span className="font-mono">{shareCode}</span>
        </p>
      </CardContent>
    </Card>
  );
}
