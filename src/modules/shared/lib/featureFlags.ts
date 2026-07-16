// featureFlags.ts — 빌드타임 기능 플래그 (NEXT_PUBLIC_* → 서버/클라 공용 인라인)
//
// 감사(docs/service-flow-audit.md P0-A) 대응: "인앱 여부"와 "카카오 Provider 설정 여부"라는
// 서로 독립적인 두 조건이 서로를 모른 채 조합되어 "실동작 로그인 수단 0개" 화면이 만들어졌다.
// 클라이언트는 Supabase Provider 설정 여부를 런타임 API로 알 수 없으므로, 명시적 env 플래그로
// "어떤 조합에서도 실동작 로그인 수단 ≥ 1개"를 코드 불변식으로 강제한다.

/**
 * 카카오 로그인(Supabase Kakao Provider) 가동 여부.
 * - 로그인은 Supabase OAuth 경로라 공유용 NEXT_PUBLIC_KAKAO_JS_KEY와는 **독립**이다.
 * - Provider를 켠 뒤 이 플래그를 "true"로 설정해야 카카오 로그인 버튼이 노출된다.
 * - 미설정(false)이면 로그인 화면·초대 미리보기가 카카오 버튼 대신 매직링크 경로를 노출한다.
 */
export const KAKAO_LOGIN_ENABLED =
  process.env.NEXT_PUBLIC_KAKAO_LOGIN_ENABLED === "true";

/**
 * 카카오톡 공유(JS SDK) 가동 여부 — JS 키 존재로 감지.
 * 미설정이면 공유 버튼을 숨기고 링크 복사를 기본 동선으로 승격한다(개발자용 에러 토스트 방지).
 */
export const KAKAO_SHARE_ENABLED = Boolean(
  process.env.NEXT_PUBLIC_KAKAO_JS_KEY,
);
