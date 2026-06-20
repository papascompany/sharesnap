"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

// 채팅방 단독 경로(/rooms/{uuid})만 매칭 — /rooms/create, /rooms/{id}/invite 등은 제외
const CHAT_ROOM_PATTERN =
  /^\/rooms\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * (main) 그룹 페이지 전환 모션 — 네비게이션마다 재마운트되어 진입 fade-up 적용.
 * 채팅방은 스크롤 위치 유지가 중요하므로 모션 제외 (design-system.md §3.2).
 */
export default function Template({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isChatRoom = CHAT_ROOM_PATTERN.test(pathname);

  return (
    <div
      className={
        isChatRoom ? "flex flex-1 flex-col" : "flex flex-1 flex-col animate-fade-up"
      }
    >
      {children}
    </div>
  );
}
