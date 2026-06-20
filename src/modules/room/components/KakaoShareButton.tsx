"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  buildFeedTemplate,
  shareKakaoFeed,
  type FeedVariant,
} from "@/modules/shared/lib/kakao";
import { useToast } from "@/modules/shared/hooks/useToast";

interface KakaoShareButtonProps {
  shareCode: string;
  roomName: string;
  coverImageUrl?: string;
  /** 공유 시나리오 — 기본은 초대 (ux-flows.md §4.1) */
  variant?: FeedVariant;
  photoCount?: number;
  memberCount?: number;
}

// 시나리오별 트리거 버튼 라벨 (템플릿 버튼 문구는 buildFeedTemplate이 결정)
const BUTTON_LABELS: Record<FeedVariant, string> = {
  invite: "카카오톡으로 초대",
  newPhotos: "카톡방에 알리기",
  photobook: "카카오톡으로 공유",
};

export function KakaoShareButton({
  shareCode,
  roomName,
  coverImageUrl,
  variant = "invite",
  photoCount,
  memberCount,
}: KakaoShareButtonProps) {
  const { error: toastError } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleShare = async () => {
    try {
      setIsLoading(true);
      // 템플릿 빌드는 lib 레이어에 위임 — 기본(invite) 버튼 문구: "사진 보러 가기"
      await shareKakaoFeed(
        buildFeedTemplate(variant, {
          roomName,
          shareCode,
          imageUrl: coverImageUrl,
          photoCount,
          memberCount,
        }),
      );
    } catch (err) {
      toastError(err instanceof Error ? err.message : "카카오 공유 실패");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      type="button"
      onClick={handleShare}
      disabled={isLoading}
      // 카카오 디자인 가이드: 컨테이너 #FEE500 + 라벨 #191919, 다크모드 변형 없음 (토큰으로 강제)
      className="h-12 w-full rounded-xl bg-kakao text-base font-semibold text-kakao-foreground
        transition-transform hover:bg-kakao/90 active:scale-[0.97]
        dark:bg-kakao dark:text-kakao-foreground"
    >
      {isLoading ? "준비 중..." : BUTTON_LABELS[variant]}
    </Button>
  );
}
