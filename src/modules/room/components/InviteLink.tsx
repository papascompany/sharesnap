"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/modules/shared/hooks/useToast";
import { track } from "@/modules/shared/lib/analytics";
import { APP_URL } from "@/modules/shared/lib/constants";
import { KAKAO_SHARE_ENABLED } from "@/modules/shared/lib/featureFlags";
import { KakaoShareButton } from "@/modules/room/components/KakaoShareButton";

interface InviteLinkProps {
  shareCode: string;
  roomName: string;
  coverImageUrl?: string;
  photoCount?: number;
  memberCount?: number;
}

export function InviteLink({
  shareCode,
  roomName,
  coverImageUrl,
  photoCount,
  memberCount,
}: InviteLinkProps) {
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
      track("invite_shared", { via: "copy" });
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
      track("invite_shared", { via: "native" });
    } catch {
      // 사용자가 취소한 경우 무시
    }
  };

  // 카카오 미설정이면 링크 복사가 primary(개발자용 에러 토스트 방지 — 감사 P1)
  const copyIsPrimary = !KAKAO_SHARE_ENABLED;

  return (
    <Card>
      <CardHeader>
        <CardTitle>친구 초대하기</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input value={inviteUrl} readOnly onFocus={(e) => e.target.select()} />
        <div className="flex gap-2">
          <Button
            onClick={handleCopy}
            variant={copyIsPrimary ? "default" : "outline"}
            className="flex-1"
            disabled={copying}
          >
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
        {KAKAO_SHARE_ENABLED ? (
          <KakaoShareButton
            shareCode={shareCode}
            roomName={roomName}
            coverImageUrl={coverImageUrl}
            photoCount={photoCount}
            memberCount={memberCount}
          />
        ) : null}
        <p className="text-xs text-muted-foreground">
          초대 코드: <span className="font-mono">{shareCode}</span>
        </p>
      </CardContent>
    </Card>
  );
}
