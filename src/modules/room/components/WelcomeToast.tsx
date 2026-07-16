"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/modules/shared/hooks/useToast";
import { track } from "@/modules/shared/lib/analytics";

interface WelcomeToastProps {
  /** 참여한 방 이름 — 환영 메시지에 노출 */
  roomName: string;
}

// 초대 링크(/join) 경유로 방에 입장한 직후 ?welcome=1 수신 시 환영 토스트를 1회만 표시한다.
// 서버 컴포넌트(방 페이지) 안에 얇은 클라이언트 자식으로 마운트한다.
export function WelcomeToast({ roomName }: WelcomeToastProps) {
  const { success } = useToast();
  // StrictMode/리렌더로 인한 중복 표시 방지
  const shownRef = useRef(false);

  useEffect(() => {
    if (shownRef.current) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get("welcome") !== "1") return;

    shownRef.current = true;
    success(`'${roomName}'에 참여했어요!`);
    // 참여 완료 — 퍼널 전환 계측 (auto=1 경로, ux-flows.md §5.4)
    track("join_completed", { via: "auto" });

    // URL에서 welcome 파라미터 제거 — 새로고침/뒤로가기 시 재표시 방지
    params.delete("welcome");
    const query = params.toString();
    const cleanUrl = `${window.location.pathname}${query ? `?${query}` : ""}`;
    window.history.replaceState(null, "", cleanUrl);
  }, [roomName, success]);

  return null;
}
