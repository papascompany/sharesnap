"use client";

// 브라우저 환경 감지 유틸 (docs/ux-flows.md §2.2)
// 카카오톡 인앱 브라우저(WebView) 분기 + 외부 브라우저 강제 오픈

/** 카카오톡 인앱 브라우저 여부 (UA에 KAKAOTALK 포함) */
export function isKakaoInApp(): boolean {
  if (typeof navigator === "undefined") return false;
  return /KAKAOTALK/i.test(navigator.userAgent);
}

/** iOS 기기 여부 */
export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/**
 * 현재 페이지(또는 지정 URL)를 기기 기본 브라우저로 강제 오픈
 * — 카카오톡 공식 지원 스킴 (iOS: Safari, Android: 기본 브라우저)
 * 주의: 실행 후 인앱 브라우저 탭은 그대로 남으므로 호출 측에서 안내 화면으로 교체할 것
 */
export function openExternalBrowser(url: string = window.location.href): void {
  window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`;
}
