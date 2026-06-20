"use client";

import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * 오프라인 폴백 페이지 — Service Worker(public/sw.js)가 내비게이션 실패 시 보여줌
 * 재시도 버튼(location.reload)이 필요해 페이지 전체를 클라이언트 컴포넌트로 구성
 */
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      {/* 오프라인 상태 아이콘 */}
      <div className="flex size-20 items-center justify-center rounded-full bg-muted">
        <WifiOff className="size-10 text-muted-foreground" aria-hidden="true" />
      </div>

      <div className="space-y-2">
        <h1 className="text-xl font-semibold">인터넷 연결을 확인해 주세요</h1>
        <p className="text-sm text-muted-foreground">
          네트워크에 다시 연결되면 이어서 사용할 수 있어요.
        </p>
      </div>

      {/* 재시도 — 현재 페이지 새로고침으로 네트워크 재시도 */}
      <Button onClick={() => location.reload()}>다시 시도</Button>
    </main>
  );
}
