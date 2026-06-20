"use client";

// Storige 편집기 클라이언트 어댑터 — 세션 발급 + /embed URL 생성 + 결과 파싱
// 신규 계약: 백엔드가 공유방 사진(externalPhotos)을 주입한 편집세션을 미리 생성하고
// sessionId를 반환 → /embed?sessionId= 로 진입한다. 사진 UI는 편집기(Storige) 측이 노출.
// 주의: STORIGE_API_KEY는 서버 전용 — 브라우저는 /api/storige/session(서버 어댑터)만 호출한다.

import type { StorigeEditorResult } from "@/modules/editor/types";

// 공통 계약: NEXT_PUBLIC_STORIGE_EDITOR_URL 기본값 폴백
const DEFAULT_EDITOR_URL = "https://editor.papascompany.co.kr";

/** 편집기 베이스 URL (환경변수 미설정 시 기본값 폴백) */
export function getStorigeEditorUrl(): string {
  return process.env.NEXT_PUBLIC_STORIGE_EDITOR_URL || DEFAULT_EDITOR_URL;
}

/** postMessage origin 검증에 사용하는 편집기 origin */
export function getStorigeEditorOrigin(): string {
  return new URL(getStorigeEditorUrl()).origin;
}

// POST /api/storige/session 200 응답 (공통 계약 — 라우트는 트랙 A 소유)
// 신규: 백엔드가 externalPhotos를 주입한 편집세션을 미리 생성하고 sessionId를 반환한다.
export interface StorigeSessionResponse {
  /** /embed?sessionId= 진입 키 (방 사진이 주입된 편집세션) */
  sessionId: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Storige 키 미설정(503 { error: "STORIGE_NOT_CONFIGURED" }) 전용 에러.
 * 프론트는 이 에러로 "편집기 연동 준비 중" 화면으로 분기한다.
 */
export class StorigeNotConfiguredError extends Error {
  readonly code = "STORIGE_NOT_CONFIGURED" as const;

  constructor(message?: string) {
    super(message || "Storige 편집기 연동이 아직 설정되지 않았습니다.");
    this.name = "StorigeNotConfiguredError";
  }
}

/** 그 외 세션 발급 실패 (401 미인증 등) */
export class StorigeSessionError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "StorigeSessionError";
  }
}

/**
 * POST /api/storige/session 계열 호출 공통 래퍼.
 * 성공 시 세션 응답을 반환하고, 실패 시 상태코드에 맞는 에러를 던진다.
 */
async function postSession(
  path: string,
  orderId: string,
): Promise<StorigeSessionResponse> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId }),
  });

  if (res.ok) {
    return (await res.json()) as StorigeSessionResponse;
  }

  // 에러 본문은 JSON이 아닐 수 있으므로 방어적으로 파싱
  const body = (await res.json().catch(() => null)) as {
    error?: string;
    message?: string;
  } | null;

  if (res.status === 503 && body?.error === "STORIGE_NOT_CONFIGURED") {
    throw new StorigeNotConfiguredError(body.message);
  }
  if (res.status === 401) {
    throw new StorigeSessionError(401, "로그인이 필요합니다.");
  }
  throw new StorigeSessionError(
    res.status,
    body?.message ?? "편집기 세션 발급에 실패했습니다.",
  );
}

/**
 * 편집기 세션 시작 — POST /api/storige/session 래퍼.
 * 백엔드가 공유방 사진(externalPhotos)을 주입한 편집세션을 생성/재사용하고
 * { sessionId, accessToken, refreshToken, expiresIn }을 반환한다.
 * @param orderId 주문 컨텍스트(본인 소유 검증 + 방 사진 주입 기준)
 * @throws StorigeNotConfiguredError 503 STORIGE_NOT_CONFIGURED 시
 * @throws StorigeSessionError 그 외 실패 시(401 미인증 등)
 */
export async function startEditorSession(
  orderId: string,
): Promise<StorigeSessionResponse> {
  return postSession("/api/storige/session", orderId);
}

/**
 * 재편집 세션 — POST /api/storige/session/reedit 래퍼.
 * 기존 storige_session_id에 방 사진을 재주입(PATCH)한 뒤 새 토큰을 발급한다.
 * order.storige_session_id가 없으면 백엔드가 400 NO_SESSION으로 응답한다.
 */
export async function reeditSession(
  orderId: string,
): Promise<StorigeSessionResponse> {
  return postSession("/api/storige/session/reedit", orderId);
}

/**
 * @deprecated startEditorSession(orderId)을 사용하세요.
 * 신규 계약은 orderId가 필수이며 sessionId를 함께 반환합니다.
 */
export async function requestEditorToken(
  orderId: string,
): Promise<StorigeSessionResponse> {
  return startEditorSession(orderId);
}

/**
 * 포토북 합성(compose-mixed) 트리거 — POST /api/storige/compose 래퍼.
 * editor.complete 직후 fire-and-forget으로 호출한다(응답을 기다리지 않음).
 * 실패는 호출 측에서 조용히 무시해도 되도록 예외를 던지지 않고 결과만 반환한다.
 */
export async function triggerComposePhotobook(
  orderId: string,
): Promise<{ ok: boolean }> {
  try {
    const res = await fetch("/api/storige/compose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    return { ok: res.ok };
  } catch {
    // 네트워크 실패 등 — fire-and-forget이므로 조용히 실패 처리
    return { ok: false };
  }
}

// /embed URL 생성 파라미터 (신규 계약 — sessionId 기반 진입)
export interface BuildEmbedUrlParams {
  /** 편집기 베이스 URL — 생략 시 NEXT_PUBLIC_STORIGE_EDITOR_URL(기본값 폴백) */
  editorUrl?: string;
  /** 사진이 주입된 편집세션 키 (필수) — /embed?sessionId= 진입 */
  sessionId: string;
  token: string;
  refreshToken?: string;
}

/**
 * Storige /embed iframe URL 생성 — sessionId 기반.
 * /embed?sessionId=&token=&refreshToken=&parentOrigin= 형태로 생성한다.
 * parentOrigin은 반드시 부착한다 — 미전달 시 편집기가 postMessage를 '*'로 발신(보안상 금지).
 */
export function buildEmbedUrl(params: BuildEmbedUrlParams): string {
  const base = params.editorUrl || getStorigeEditorUrl();
  const url = new URL("/embed", base);

  const query: Record<string, string | undefined> = {
    sessionId: params.sessionId,
    token: params.token,
    refreshToken: params.refreshToken,
  };

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, value);
    }
  }

  // 공통 계약: parentOrigin 필수 부착 (URLSearchParams가 encodeURIComponent 수행)
  url.searchParams.set("parentOrigin", window.location.origin);

  return url.toString();
}

/**
 * editor.complete payload → StorigeEditorResult 안전 파싱.
 * sessionId가 없으면 유효하지 않은 결과로 간주하고 null 반환.
 */
export function parseEditorResult(
  payload: unknown,
): StorigeEditorResult | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  if (typeof p.sessionId !== "string" || p.sessionId.length === 0) return null;

  const rawFiles =
    p.files && typeof p.files === "object"
      ? (p.files as Record<string, unknown>)
      : null;

  return {
    sessionId: p.sessionId,
    orderSeqno: typeof p.orderSeqno === "number" ? p.orderSeqno : undefined,
    status: typeof p.status === "string" ? p.status : undefined,
    completedAt: typeof p.completedAt === "string" ? p.completedAt : undefined,
    files: rawFiles
      ? {
          coverFileId:
            typeof rawFiles.coverFileId === "string"
              ? rawFiles.coverFileId
              : undefined,
          contentFileId:
            typeof rawFiles.contentFileId === "string"
              ? rawFiles.contentFileId
              : undefined,
        }
      : undefined,
  };
}
