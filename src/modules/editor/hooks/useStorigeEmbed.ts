"use client";

// Storige 임베드 postMessage 수신 훅 (HANDOFF §3.4 — 정식 엔벨로프 v1 전용)
// 공통 계약: e.origin === 편집기 origin 검증 + source==='storige-editor'만 수신.
// 레거시(`storige:*` 문자열 이벤트)는 무시한다.

import { useCallback, useEffect, useRef } from "react";
import {
  getStorigeEditorOrigin,
  parseEditorResult,
} from "@/modules/editor/services/storigeClient";
import type {
  StorigeEditorResult,
  StorigeEnvelope,
  StorigeHostCommand,
} from "@/modules/editor/types";

export interface UseStorigeEmbedOptions {
  onReady?: () => void;
  onSave?: (payload: unknown) => void;
  onComplete?: (result: StorigeEditorResult) => void;
  onCancel?: () => void;
  onNeedAuth?: () => void;
  onError?: (payload: unknown) => void;
}

export interface UseStorigeEmbedReturn {
  /** 호스트 → 편집기 명령 발신 (source:'storige-host' 엔벨로프) */
  sendCommand: (
    iframe: HTMLIFrameElement | null,
    command: StorigeHostCommand,
    payload?: unknown,
  ) => void;
}

export function useStorigeEmbed(
  options: UseStorigeEmbedOptions,
): UseStorigeEmbedReturn {
  // 콜백을 ref로 보관해 리스너 재구독 없이 최신 콜백 호출
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  useEffect(() => {
    const editorOrigin = getStorigeEditorOrigin();

    const handleMessage = (e: MessageEvent) => {
      // ① origin 검증 (공통 계약 — 위반 메시지는 조용히 무시)
      if (e.origin !== editorOrigin) return;

      // ② 정식 엔벨로프만 수신 (레거시 storige:* / 타 위젯 메시지 무시)
      const msg = e.data as Partial<StorigeEnvelope> | null;
      if (!msg || typeof msg !== "object" || msg.source !== "storige-editor") {
        return;
      }

      const callbacks = optionsRef.current;
      switch (msg.event) {
        case "editor.ready":
          callbacks.onReady?.();
          break;
        case "editor.save":
          callbacks.onSave?.(msg.payload);
          break;
        case "editor.complete": {
          // payload를 안전 파싱 — sessionId가 없으면 에러로 처리
          const result = parseEditorResult(msg.payload);
          if (result) callbacks.onComplete?.(result);
          else callbacks.onError?.(msg.payload);
          break;
        }
        case "editor.cancel":
          callbacks.onCancel?.();
          break;
        case "editor.needAuth":
          callbacks.onNeedAuth?.();
          break;
        case "editor.error":
          callbacks.onError?.(msg.payload);
          break;
        default:
          // 알 수 없는 이벤트는 전방 호환을 위해 무시
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      // 정리 — 언마운트 시 리스너 제거
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  const sendCommand = useCallback(
    (
      iframe: HTMLIFrameElement | null,
      command: StorigeHostCommand,
      payload?: unknown,
    ) => {
      const target = iframe?.contentWindow;
      if (!target) return;

      const envelope: StorigeEnvelope = {
        source: "storige-host",
        version: "1",
        event: command,
        payload,
        timestamp: Date.now(),
      };
      // targetOrigin을 편집기 origin으로 고정 ('*' 발신 금지)
      target.postMessage(envelope, getStorigeEditorOrigin());
    },
    [],
  );

  return { sendCommand };
}
