"use client";

import Link from "next/link";
import { BookHeart, Images, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Room } from "@/modules/room/types";

interface RoomHeaderProps {
  room: Room;
}

export function RoomHeader({ room }: RoomHeaderProps) {
  return (
    <div className="flex h-14 items-center justify-between px-4">
      <div className="flex min-w-0 items-center gap-2">
        <Link
          href="/rooms"
          className="text-sm text-muted-foreground hover:text-foreground"
          aria-label="뒤로"
        >
          ←
        </Link>
        <h1 className="truncate text-base font-semibold">{room.name}</h1>
      </div>
      <div className="flex items-center gap-1">
        {/* 사진 갤러리 진입 (아이콘 어휘 §6.3: 갤러리 = Images, 터치영역 size-11) */}
        <Link
          href={`/rooms/${room.id}/photos`}
          aria-label="사진 갤러리"
          className="grid size-11 place-items-center text-foreground transition-transform active:scale-90"
        >
          <Images className="size-5" aria-hidden />
        </Link>
        {/* 포토북 허브 진입 — 이 방의 완성본(공동주문) + 만들기 (아이콘 어휘 §6.2: BookHeart) */}
        <Link
          href={`/rooms/${room.id}/photobooks`}
          aria-label="포토북"
          className="grid size-11 place-items-center text-foreground transition-transform active:scale-90"
        >
          <BookHeart className="size-5" aria-hidden />
        </Link>
        <Link href={`/rooms/${room.id}/invite`}>
          <Button variant="ghost" size="sm">
            초대
          </Button>
        </Link>
        {/* 방 설정 — 링크 재발급·강퇴·나가기/삭제 (페이지에서 방장 액션 게이트) */}
        <Link
          href={`/rooms/${room.id}/settings`}
          aria-label="방 설정"
          className="grid size-11 place-items-center text-foreground transition-transform active:scale-90"
        >
          <Settings2 className="size-5" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
