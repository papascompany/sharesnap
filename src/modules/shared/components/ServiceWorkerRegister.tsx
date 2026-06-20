"use client";

import { useEffect } from "react";

/**
 * Service Worker 등록 컴포넌트 — 루트 레이아웃(body)에 마운트
 * - production에서만 등록 (개발 중 SW 캐시가 HMR/디버깅을 방해하므로)
 * - 등록 실패는 치명적이지 않음 → 콘솔 로그만 남기고 조용히 무시 (PWA 미지원 브라우저 등)
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch((error) => {
        // 등록 실패 시 토스트 없이 콘솔만 — 사용자 흐름을 방해하지 않음
        console.error("[ShareSnap] Service Worker 등록 실패:", error);
      });
  }, []);

  return null;
}
