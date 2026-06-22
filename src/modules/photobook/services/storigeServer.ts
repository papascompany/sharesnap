// ⚠️ 서버 전용 모듈 — 클라이언트 컴포넌트에서 절대 import 금지
// (STORIGE_API_KEY / SUPABASE_SERVICE_ROLE_KEY가 번들에 노출됨)
// Route Handler(src/app/api/storige/*)에서만 사용할 것.
//
// 근거 문서: HANDOFF_sharesnap_integration_2026-06-12 §3.2(shop-session),
//   §3.5(compose-mixed), §3.6(웹훅 서명), §3.7(/external 다운로드)

import {
  createClient as createSupabaseAdminClient,
  type SupabaseClient,
} from "@supabase/supabase-js";
import type { Database } from "@/modules/shared/types/database";
import type { ExternalPhoto } from "@/modules/photo/types";
import {
  APP_URL,
  STORIGE_DEV_TEMPLATE_SET_ID,
} from "@/modules/shared/lib/constants";

// ============================================================
// 설정
// ============================================================

export interface StorigeConfig {
  /** Storige API 베이스 URL (예: https://api.papascompany.co.kr/api) */
  apiUrl: string;
  /** sharesnap 전용 editorAuthCode — 서버 환경변수로만 보관 */
  apiKey: string;
  /** 편집기 임베드 베이스 URL (예: https://editor.papascompany.co.kr) */
  editorUrl: string;
}

const DEFAULT_API_URL = "https://api.papascompany.co.kr/api";
const DEFAULT_EDITOR_URL = "https://editor.papascompany.co.kr";

/**
 * Storige 연동 설정 조회 — STORIGE_API_KEY 미설정 시 null.
 * 라우트는 null이면 503 { error: "STORIGE_NOT_CONFIGURED" }로 응답해야 한다.
 */
export function getStorigeConfig(): StorigeConfig | null {
  const apiKey = process.env.STORIGE_API_KEY;
  if (!apiKey) return null;

  return {
    // NOTE: ?? 대신 || — Vercel env가 빈 문자열("")이어도 기본값으로 폴백(빈문자열은 nullish가 아니라 ??가 안 먹어 502 유발 이력)
    apiUrl: (process.env.STORIGE_API_URL || DEFAULT_API_URL).replace(/\/+$/, ""),
    apiKey,
    editorUrl: (
      process.env.NEXT_PUBLIC_STORIGE_EDITOR_URL || DEFAULT_EDITOR_URL
    ).replace(/\/+$/, ""),
  };
}

/** 키 미설정 상태에서 어댑터 함수가 호출됐을 때 던지는 에러 코드 */
export const STORIGE_NOT_CONFIGURED = "STORIGE_NOT_CONFIGURED";

const requireConfig = (): StorigeConfig => {
  const config = getStorigeConfig();
  if (!config) throw new Error(STORIGE_NOT_CONFIGURED);
  return config;
};

// ============================================================
// shop-session (§3.2)
// ============================================================

export interface CreateShopSessionParams {
  /** ShareSnap 자체 회원번호 — user_storige_map.member_no (정수 필수, 0/누락 시 400) */
  memberSeqno: number;
  /** 회원 ID (이메일 권장) */
  memberId: string;
  /** 회원 이름 — Storige DTO상 필수라 누락 시 memberId로 대체 전송 */
  memberName?: string;
  /** 주문 컨텍스트 — photobook_orders.order_no (권장, 권한 검증 강화) */
  orderSeqno?: number;
}

export interface ShopSessionResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * POST {STORIGE_API_URL}/auth/shop-session — 편집기용 JWT 발급.
 * 반드시 서버에서만 호출 (X-API-Key 브라우저 노출 금지).
 */
export async function createShopSession(
  params: CreateShopSessionParams,
): Promise<ShopSessionResult> {
  const config = requireConfig();

  const res = await fetch(`${config.apiUrl}/auth/shop-session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": config.apiKey,
    },
    body: JSON.stringify({
      memberSeqno: params.memberSeqno,
      memberId: params.memberId,
      // Storige CreateShopSessionDto에서 memberName은 필수 string
      memberName: params.memberName ?? params.memberId,
      ...(params.orderSeqno !== undefined && { orderSeqno: params.orderSeqno }),
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`STORIGE_SHOP_SESSION_FAILED: ${res.status} ${await safeText(res)}`);
  }

  const data = (await res.json()) as {
    success: boolean;
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
  };

  if (!data.accessToken) {
    throw new Error("STORIGE_SHOP_SESSION_FAILED: accessToken 누락");
  }

  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken ?? "",
    expiresIn: data.expiresIn ?? 3600,
  };
}

// ============================================================
// edit-sessions — 편집세션 생성 + 사진 주입 (신규 핸드오프 §3.1)
// ============================================================

export interface CreateEditSessionParams {
  /** 편집 모드 — both(표지+내지) | cover | content */
  mode: "both" | "cover" | "content";
  /** 포토북 템플릿셋 ID (getTemplateSetId() 권장) */
  templateSetId: string;
  /** photobook_orders.order_no (정수) */
  orderSeqno: number;
  /** 합성 완료 웹훅 콜백 URL (getWebhookUrl() 권장) */
  callbackUrl?: string;
  /** 공유방 사진 주입 — 편집기 좌측 "공유방 사진" 탭에 노출됨 */
  externalPhotos: ExternalPhoto[];
  /**
   * 자동배치 canvasData — 페이지별 Fabric JSON 배열 [표지, 내지1, ...].
   * buildAutoLayoutCanvasData() 산출물. 지정 시에만 body에 포함(있을 때만).
   * (index 0 = null이면 표지 템플릿 유지)
   */
  canvasData?: unknown[];
}

/**
 * POST {STORIGE_API_URL}/edit-sessions — 편집세션 생성 + externalPhotos 주입.
 * 응답 {id}를 sessionId로 반환 → 프론트는 /embed?sessionId 로 편집기를 연다.
 * Authorization: Bearer accessToken (shop-session에서 발급) 으로만 호출.
 */
export async function createEditSession(
  accessToken: string,
  params: CreateEditSessionParams,
): Promise<{ sessionId: string }> {
  const config = requireConfig();

  const res = await fetch(`${config.apiUrl}/edit-sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      mode: params.mode,
      templateSetId: params.templateSetId,
      orderSeqno: params.orderSeqno,
      ...(params.callbackUrl !== undefined && { callbackUrl: params.callbackUrl }),
      // 자동배치 canvasData는 지정됐을 때만 주입 (기존 시그니처 호환)
      ...(params.canvasData !== undefined && { canvasData: params.canvasData }),
      metadata: { externalPhotos: params.externalPhotos },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(
      `STORIGE_EDIT_SESSION_FAILED: ${res.status} ${await safeText(res)}`,
    );
  }

  const data = (await res.json()) as { id?: string };
  if (!data.id) {
    throw new Error("STORIGE_EDIT_SESSION_FAILED: sessionId(id) 누락");
  }

  return { sessionId: data.id };
}

/**
 * PATCH {STORIGE_API_URL}/edit-sessions/{sessionId} — externalPhotos 재주입(idempotent).
 * 재편집 전 공유방 사진을 최신 상태로 다시 주입할 때 사용. Bearer accessToken 필요.
 */
export async function patchEditSessionPhotos(
  accessToken: string,
  sessionId: string,
  externalPhotos: ExternalPhoto[],
): Promise<void> {
  const config = requireConfig();

  const res = await fetch(
    `${config.apiUrl}/edit-sessions/${encodeURIComponent(sessionId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ metadata: { externalPhotos } }),
      cache: "no-store",
    },
  );

  if (!res.ok) {
    throw new Error(
      `STORIGE_EDIT_SESSION_PATCH_FAILED: ${res.status} ${await safeText(res)}`,
    );
  }
}

/**
 * 편집세션 생성용 templateSet ID 결정.
 * 운영에서는 env STORIGE_TEMPLATE_SET_ID로 오버라이드, 미설정 시 dev 기본값.
 */
export function getTemplateSetId(): string {
  // || — 빈 문자열 env도 dev 기본값으로 폴백(빈 templateSetId 전송 방지)
  return process.env.STORIGE_TEMPLATE_SET_ID || STORIGE_DEV_TEMPLATE_SET_ID;
}

/**
 * 합성 완료 웹훅 콜백 URL — edit-sessions.callbackUrl 용.
 * 우선순위: 인자 origin > NEXT_PUBLIC_APP_URL(APP_URL).
 */
export function getWebhookUrl(origin?: string): string {
  const base = (origin ?? APP_URL).replace(/\/+$/, "");
  return `${base}/api/storige/webhook`;
}

// ============================================================
// compose-mixed 합성 트리거 (§3.5)
// ============================================================

export interface TriggerComposeMixedParams {
  /** editor.complete에서 저장해 둔 Storige 편집 세션 ID */
  editSessionId: string;
  /** photobook_orders.order_no (정수) */
  orderSeqno: number;
}

export interface ComposeMixedResult {
  /** worker_jobs.id — 웹훅 synthesis_job_id 매칭 키 */
  jobId: string;
}

/**
 * POST {STORIGE_API_URL}/worker-jobs/compose-mixed — PDF 합성 잡 생성.
 * 주의: Storige ValidationPipe가 forbidNonWhitelisted라 DTO 외 필드 전송 시 400.
 *   주문번호는 DTO 명세상 `orderId?: string` 필드로 전달한다.
 */
export async function triggerComposeMixed(
  params: TriggerComposeMixedParams,
): Promise<ComposeMixedResult> {
  const config = requireConfig();

  const res = await fetch(`${config.apiUrl}/worker-jobs/compose-mixed`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": config.apiKey,
    },
    body: JSON.stringify({
      editSessionId: params.editSessionId,
      orderId: String(params.orderSeqno),
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`STORIGE_COMPOSE_FAILED: ${res.status} ${await safeText(res)}`);
  }

  const job = (await res.json()) as { id?: string };
  if (!job.id) {
    throw new Error("STORIGE_COMPOSE_FAILED: 잡 ID 누락");
  }

  return { jobId: job.id };
}

// ============================================================
// 결과 PDF 다운로드 (§3.7)
// ============================================================

/**
 * GET {STORIGE_API_URL}/files/{fileId}/download/external — 결과 파일 다운로드.
 * ⚠️ 구 Public 경로(/files/:id/download)는 2026-05-03 보안 패치로 폐기 — 사용 금지.
 */
export async function downloadStorigeFile(fileId: string): Promise<ArrayBuffer> {
  const config = requireConfig();

  const res = await fetch(
    `${config.apiUrl}/files/${encodeURIComponent(fileId)}/download/external`,
    {
      headers: { "X-API-Key": config.apiKey },
      cache: "no-store",
    },
  );

  if (!res.ok) {
    throw new Error(`STORIGE_DOWNLOAD_FAILED: ${res.status} ${await safeText(res)}`);
  }

  return res.arrayBuffer();
}

/**
 * 웹훅 outputFileUrl/outputFiles[].url 다운로드 헬퍼.
 * - URL에 /files/{id}/ 패턴이 있으면 정식 /external 경로로 재요청
 * - 상대 경로(/storage/... 등)는 API 오리진 기준으로 절대화 후 fetch
 */
export async function downloadStorigeFileByUrl(url: string): Promise<ArrayBuffer> {
  const config = requireConfig();

  // fileId 추출 가능하면 정식 외부 다운로드 경로 사용
  const fileIdMatch = url.match(/\/files\/([0-9a-fA-F-]{36})(?:\/|$)/);
  if (fileIdMatch) {
    return downloadStorigeFile(fileIdMatch[1]);
  }

  const absoluteUrl = new URL(url, new URL(config.apiUrl).origin).toString();
  const res = await fetch(absoluteUrl, {
    headers: { "X-API-Key": config.apiKey },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`STORIGE_DOWNLOAD_FAILED: ${res.status} ${absoluteUrl}`);
  }

  return res.arrayBuffer();
}

// ============================================================
// 웹훅 서명 검증 (§3.6)
// ============================================================

/** 합성 결과 파일 (separate 모드 — cover → content 순서 보장) */
export interface StorigeOutputFile {
  type: "cover" | "content" | "pages" | "set";
  url: string;
  pageCount?: number;
  setIndex?: number;
}

/** Storige 웹훅 페이로드 (synthesis.* 기준 — 다른 이벤트는 sessionId 기반) */
export interface StorigeWebhookPayload {
  event: string;
  jobId?: string;
  sessionId?: string;
  orderId?: string;
  status?: string;
  outputFileUrl?: string | null;
  outputFiles?: StorigeOutputFile[];
  outputFormat?: "merged" | "separate";
  errorMessage?: string;
  timestamp?: string;
}

/**
 * X-Storige-Signature 검증.
 * 서명 = Base64(`${identifier}:${event}:${timestamp}`)
 *   - identifier: payload.jobId 우선, 없으면 payload.sessionId (Storige 발신부와 동일 규칙)
 * 예외: 재시도 요청(X-Storige-Retry: 1)은 발신부가 서명을 생략 → 서명 누락 허용.
 * (Base64 서명은 위조 가능 — HTTPS + Storige 측 SSRF allowlist로 보완되는 약한 검증임을 유의)
 */
export function verifyWebhookSignature(
  headers: Headers,
  body: StorigeWebhookPayload,
): boolean {
  const signature = headers.get("x-storige-signature");
  const isRetry = headers.get("x-storige-retry") === "1";

  // 재시도 요청은 서명 없이 도착 — 누락 허용
  if (!signature) return isRetry;

  const identifier = body.jobId ?? body.sessionId;
  if (!identifier || !body.event || !body.timestamp) return false;

  const expected = Buffer.from(
    `${identifier}:${body.event}:${body.timestamp}`,
  ).toString("base64");

  return signature === expected;
}

// ============================================================
// Supabase service role 클라이언트 (웹훅 전용)
// ============================================================

/**
 * 웹훅은 인증 사용자 컨텍스트가 없으므로 RLS를 우회하는 service role 클라이언트 필요.
 * SUPABASE_SERVICE_ROLE_KEY 미설정 시 null — 호출부는 DB 갱신을 스킵하고 로그만 남길 것.
 * (쿠키 세션 불필요 — @supabase/supabase-js로 직접 생성)
 */
export function createServiceRoleClient(): SupabaseClient<Database> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;

  return createSupabaseAdminClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ============================================================
// 내부 유틸
// ============================================================

/** 에러 메시지용 응답 본문 추출 (실패해도 안전) */
async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 300);
  } catch {
    return "";
  }
}
