// 편집기 도메인 타입

import type { BookSize } from "@/modules/shared/types/global";
import type { Json } from "@/modules/shared/types/database";

export type { BookSize };

// Fabric.js 직렬화 결과 (toJSON())
export type FabricJSON = Json;

export type EditorObjectType =
  | "text"
  | "image"
  | "shape"
  | "clipart"
  | "background";

export interface EditorResource {
  id: string;
  category: "font" | "clipart" | "background" | "template";
  name: string;
  storagePath: string;
  previewUrl: string | null;
}

export interface EditorPageState {
  id: string;
  orderId: string;
  pageIndex: number;
  fabricData: FabricJSON;
  previewUrl: string | null;
}

export interface EditorCanvasOptions {
  size: BookSize;
  displayWidth: number;
  displayHeight: number;
  showBleed: boolean;
  showSafeArea: boolean;
}

// ─────────────────────────────────────────────────────────────
// Storige 임베드 연동 타입 (HANDOFF_sharesnap_integration §3.3~3.4)
// 편집기는 iframe /embed 로 호스팅하고 postMessage 정식 엔벨로프(v1)만 사용한다.
// 레거시(`storige:*`) 메시지는 수신하지 않는다.
// ─────────────────────────────────────────────────────────────

// 편집기 → 호스트 이벤트 종류
export type StorigeEditorEvent =
  | "editor.ready"
  | "editor.save"
  | "editor.complete"
  | "editor.cancel"
  | "editor.needAuth"
  | "editor.error";

// 호스트 → 편집기 명령 종류
export type StorigeHostCommand = "getState" | "saveNow" | "setBackGuard";

// postMessage 정식 엔벨로프 — 공통 계약
// 수신 시 e.origin === new URL(NEXT_PUBLIC_STORIGE_EDITOR_URL).origin 검증 필수
export interface StorigeEnvelope<TPayload = unknown> {
  source: "storige-editor" | "storige-host";
  version: "1";
  event: StorigeEditorEvent | StorigeHostCommand;
  payload?: TPayload;
  timestamp: number;
}

// editor.complete payload — 주문에 영속화할 편집 결과
export interface StorigeEditorResult {
  sessionId: string; // 재편집 키 (photobook_orders.storige_session_id)
  orderSeqno?: number;
  status?: string;
  completedAt?: string;
  files?: {
    coverFileId?: string;
    contentFileId?: string;
  };
}

// 임베드 호스트 화면 상태
export type EmbedStatus = "loading" | "ready" | "error" | "completed";
