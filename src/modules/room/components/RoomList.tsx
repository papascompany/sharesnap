"use client";

import Link from "next/link";
import { Images } from "lucide-react";
import { useMyRooms } from "@/modules/room/hooks/useRoom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/modules/shared/components/Skeleton";
import { formatRelativeTime } from "@/modules/shared/lib/utils";

export function RoomList() {
  const { rooms, isLoading, error } = useMyRooms();

  // 로딩 — 실제 커버 카드와 동일한 골격의 스켈레톤 (design-system.md §3.4)
  if (isLoading) {
    return (
      <ul className="flex flex-col gap-3 px-4 py-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <li key={i}>
            <Skeleton className="aspect-[2/1] w-full rounded-2xl" />
          </li>
        ))}
      </ul>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-12 text-center text-sm text-destructive">
        {error.message}
      </div>
    );
  }

  // 엠티 스테이트 — 공통 패턴 (design-system.md §4.7)
  if (rooms.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center animate-fade-up">
        <div className="flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Images className="size-9" strokeWidth={1.5} />
        </div>
        <div className="space-y-1.5">
          <p className="text-[17px] font-semibold">아직 공유방이 없어요</p>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            새 공유방을 만들고
            <br />
            친구들을 카카오톡으로 초대해 보세요
          </p>
        </div>
        <Link href="/rooms/create">
          <Button className="h-11 rounded-xl px-6 font-semibold">
            공유방 만들기
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3 px-4 py-4">
      {rooms.map((room, i) => (
        // 스태거 진입 — 최대 6개까지만 지연, 이후 동시 (design-system.md §3.1)
        <li
          key={room.id}
          className="animate-fade-up"
          style={{ animationDelay: `${Math.min(i, 6) * 50}ms` }}
        >
          <Link href={`/rooms/${room.id}`} className="block">
            <Card className="gap-0 overflow-hidden rounded-2xl py-0 ring-border/60 transition-transform duration-150 active:scale-[0.98]">
              {/* 커버: 방 커버 사진 or 선셋 그라데이션 폴백 (빈 회색 박스 금지) */}
              <div className="relative aspect-[2/1] bg-sunset">
                {room.cover_url ? (
                  // Supabase Storage 원격 이미지 — next/image 원격 패턴 미설정으로 img 사용
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={room.cover_url}
                    alt={`${room.name} 커버 사진`}
                    loading="lazy"
                    className="absolute inset-0 size-full object-cover"
                  />
                ) : (
                  <span
                    className="absolute inset-0 flex items-center justify-center text-4xl font-bold text-white/90"
                    aria-hidden
                  >
                    {room.name.trim().charAt(0)}
                  </span>
                )}
                {/* 사진 위 텍스트는 반드시 스크림 위에 (§7.1) */}
                <div className="absolute inset-0 bg-scrim-photo" />
                <div className="absolute bottom-3 left-4 right-4 text-white">
                  <h3 className="line-clamp-1 break-keep text-[17px] font-semibold tracking-[-0.01em]">
                    {room.name}
                  </h3>
                  <p className="text-[12px] text-white/80">
                    {typeof room.memberCount === "number" ? (
                      <>
                        멤버{" "}
                        <span className="tabular-nums">{room.memberCount}</span>
                        명 ·{" "}
                      </>
                    ) : null}
                    {formatRelativeTime(room.created_at)} 생성
                  </p>
                </div>
                {room.myRole === "owner" ? (
                  <Badge className="absolute right-3 top-3 border-0 bg-white/20 text-white backdrop-blur-sm">
                    방장
                  </Badge>
                ) : null}
              </div>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
