"use client";

// 초대 미리보기 화면 (design-system.md §5.6 — 전환율이 목적인 화면)
// 비로그인: 방 정보로 신뢰 형성 → 카카오 CTA (next=/join/{code}?auto=1)
// 로그인+비멤버: "참여하기" Primary CTA 1탭

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Images, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KakaoLoginButton } from "@/modules/auth/components/KakaoLoginButton";
import { joinRoomViaShareCode } from "@/modules/room/services/roomService";
import { useToast } from "@/modules/shared/hooks/useToast";
import type { RoomPreview as RoomPreviewData } from "@/modules/room/types";

interface RoomPreviewProps {
  preview: RoomPreviewData;
  shareCode: string;
  /** true: 로그인+비멤버 → "참여하기" CTA / false: 비로그인 → 카카오 CTA */
  isAuthenticated: boolean;
}

export function RoomPreview({
  preview,
  shareCode,
  isAuthenticated,
}: RoomPreviewProps) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [isJoining, setIsJoining] = useState(false);

  // 로그인 복귀 경로 — auto=1로 자동 입장 (ux-flows.md §1.4)
  const nextPath = `/join/${shareCode}?auto=1`;

  const handleJoin = async () => {
    try {
      setIsJoining(true);
      const roomId = await joinRoomViaShareCode(shareCode);
      success(`'${preview.name}'에 참여했어요`, {
        description: "사진을 올려보세요!",
      });
      router.replace(`/rooms/${roomId}`);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "참여에 실패했습니다.");
      setIsJoining(false);
    }
  };

  return (
    // min-h-dvh: 카카오 인앱 브라우저 주소창 변동 대응 (100vh 금지 — design-system.md §5.1)
    <div className="flex min-h-dvh flex-col bg-background">
      {/* 상단: 방 커버 미리보기 — 커버 없으면 선셋 그라데이션 + 글리프 */}
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        {preview.coverUrl ? (
          // 커버는 public 버킷 URL (signed URL 금지 — ux-flows.md §1.3)
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview.coverUrl}
            alt={`'${preview.name}' 공유방 커버`}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-sunset">
            <svg
              viewBox="0 0 48 48"
              className="size-16 text-white/80"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <rect x="8" y="6" width="32" height="36" rx="5" />
              <circle cx="20" cy="18" r="3.5" fill="currentColor" stroke="none" />
              <path d="M11 33l9-10 6 6.5 5-5.5 6 9" />
            </svg>
          </div>
        )}
        {/* 하단 스크림 — 본문과의 시각적 연결 */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* 중앙: 방 이름 + 설명 + 멤버/사진 수 */}
      <div className="flex flex-col items-center px-6 pt-2 text-center animate-fade-up">
        <h2 className="text-2xl font-bold leading-snug tracking-[-0.02em]">
          {preview.name}
        </h2>
        {preview.description ? (
          <p className="mt-2 text-sm text-muted-foreground">
            {preview.description}
          </p>
        ) : null}

        <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-4" aria-hidden />
            멤버 {preview.memberCount}명
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Images className="size-4" aria-hidden />
            사진 {preview.photoCount}장
          </span>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          공유방에 참여하면 사진과 코멘트를 함께 남길 수 있어요.
        </p>
      </div>

      {/* 하단 고정 CTA */}
      <div className="mt-auto px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-8">
        {isAuthenticated ? (
          <Button
            type="button"
            onClick={handleJoin}
            disabled={isJoining}
            size="lg"
            className="h-12 w-full rounded-xl text-base font-semibold"
          >
            {isJoining ? "참여 중..." : "참여하기"}
          </Button>
        ) : (
          <KakaoLoginButton next={nextPath} />
        )}
      </div>
    </div>
  );
}
