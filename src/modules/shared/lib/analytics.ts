// analytics.ts — 퍼널 계측 얇은 래퍼 (@vercel/analytics)
//
// ux-flows.md §5.4 퍼널 이벤트 정본. 카카오 로그인 활성화(D1) 전에 심어야
// "활성화 전후 전환율 비교" 기준선이 생긴다(감사 스프린트1). 계측 실패는 UX에 영향 없음.

import { track as vercelTrack } from "@vercel/analytics";

/** ux-flows.md §5.4 정본 5종 — 문자열 오타 방지를 위해 유니온으로 고정 */
export type FunnelEvent =
  | "invite_shared" // 방장이 초대 공유(카카오/복사/OS공유) 성공
  | "join_viewed" // 초대 미리보기(/join) 노출
  | "login_started" // 로그인 시도(카카오/매직링크)
  | "join_completed" // 방 참여 완료(welcome)
  | "first_photo_uploaded"; // 첫 사진 업로드 성공

type TrackProps = Record<string, string | number | boolean | null>;

/**
 * 퍼널 이벤트 전송. 브라우저에서만 실제 발화하며, 어떤 실패도 삼켜 UX를 막지 않는다.
 * (Vercel Analytics 미연동 환경에서도 no-op으로 안전)
 */
export function track(event: FunnelEvent, props?: TrackProps): void {
  try {
    vercelTrack(event, props);
  } catch {
    // 계측 실패는 무시 — 서비스 흐름과 무관
  }
}
