"use client";

// 포토북 편집기 런처 — 마운트 시 draft 주문 확보 → 세션 발급 → Storige 임베드 오픈
// 흐름: getOrCreateDraftOrder → startEditorSession(orderId) → buildEmbedUrl → StorigeEditorHost
// 신규 계약: 백엔드가 공유방 사진(externalPhotos)을 주입한 편집세션을 만들고 sessionId를 반환한다.
// STORIGE_NOT_CONFIGURED(503) 시 "편집기 연동 준비 중" 엠티 스테이트(§4.7)로 분기.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookHeart, ChevronLeft, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileLayout } from "@/modules/shared/components/MobileLayout";
import { LoadingSpinner } from "@/modules/shared/components/LoadingSpinner";
import { useToast } from "@/modules/shared/hooks/useToast";
import {
  buildEmbedUrl,
  getStorigeEditorUrl,
  startEditorSession,
  triggerComposePhotobook,
  StorigeNotConfiguredError,
} from "@/modules/editor/services/storigeClient";
import { StorigeEditorHost } from "@/modules/editor/components/StorigeEditorHost";
import {
  getOrCreateDraftOrder,
  saveEditorResult,
} from "@/modules/photobook/services/photobookService";
import type { StorigeEditorResult } from "@/modules/editor/types";
import type { PhotobookOrder } from "@/modules/photobook/types";

interface PhotobookEditorLauncherProps {
  roomId: string;
  roomName: string;
}

// 런처 화면 단계
type LauncherPhase =
  | "preparing" // 주문 확보 + 토큰 발급 중
  | "editor" // 임베드 호스트 표시
  | "not_configured" // STORIGE_NOT_CONFIGURED — 연동 준비 중 안내
  | "error" // 준비 실패
  | "completed"; // editor.complete 저장 후 완료 화면

export function PhotobookEditorLauncher({
  roomId,
  roomName,
}: PhotobookEditorLauncherProps) {
  const router = useRouter();
  const { error: toastError, success: toastSuccess } = useToast();

  const [phase, setPhase] = useState<LauncherPhase>("preparing");
  const [order, setOrder] = useState<PhotobookOrder | null>(null);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // 재시도 — 준비 이펙트를 다시 실행시키는 키
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const prepare = async () => {
      try {
        // ① 내 draft/editing 주문 확보 (재편집이면 storigeSessionId 보유)
        const draft = await getOrCreateDraftOrder(roomId);
        if (cancelled) return;
        setOrder(draft);

        try {
          // ② 서버 어댑터에서 편집세션 발급 (공통 계약 — 트랙 A 라우트)
          //    백엔드가 방 사진을 주입한 편집세션을 만들고 sessionId를 반환한다.
          const session = await startEditorSession(draft.id);
          if (cancelled) return;

          // ③ /embed URL 생성 — sessionId 기반 진입 (사진이 주입된 세션)
          setEmbedUrl(
            buildEmbedUrl({
              editorUrl: getStorigeEditorUrl(),
              sessionId: session.sessionId,
              token: session.accessToken,
              refreshToken: session.refreshToken,
            }),
          );
          setPhase("editor");
        } catch (err) {
          if (cancelled) return;
          if (err instanceof StorigeNotConfiguredError) {
            // 키 미설정 — 연동 준비 중 안내로 분기 (에러 아님)
            setPhase("not_configured");
            return;
          }
          throw err;
        }
      } catch (err) {
        if (cancelled) return;
        console.error("포토북 편집기 준비 실패:", err);
        const message =
          err instanceof Error
            ? err.message
            : "포토북 편집기를 여는 데 실패했습니다.";
        setErrorMessage(message);
        setPhase("error");
        toastError("편집기를 열 수 없어요", { description: message });
      }
    };

    void prepare();
    return () => {
      cancelled = true;
    };
    // toastError는 매 렌더 새 참조 — 의존성에서 제외 (마운트/재시도 시에만 실행)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, roomName, retryKey]);

  /**
   * editor.complete — 결과 영속화 후 합성(compose) 트리거 → 완료 화면.
   * saveEditorResult로 storige_session_id를 먼저 저장해야 compose가 세션을 찾는다.
   */
  const handleComplete = useCallback(
    async (result: StorigeEditorResult) => {
      try {
        if (order) {
          await saveEditorResult(order.id, result);
          // 저장 직후 PDF 합성 트리거 (fire-and-forget — 완료는 웹훅이 갱신)
          void triggerComposePhotobook(order.id);
          toastSuccess("포토북 제작을 시작했어요", {
            description: "편집한 포토북으로 PDF를 만들고 있어요",
          });
        } else {
          toastSuccess("포토북 편집이 완료됐어요");
        }
      } catch (err) {
        console.error("편집 결과 저장 실패:", err);
        toastError("편집 결과 저장에 실패했어요", {
          description: "편집 내용은 편집기에 보관돼 있어요. 다시 시도해 주세요.",
        });
      } finally {
        setPhase("completed");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [order],
  );

  /** 편집 취소 — 채팅방으로 복귀 */
  const handleCancel = useCallback(() => {
    router.push(`/rooms/${roomId}`);
  }, [router, roomId]);

  // ── 편집기 표시 (전체화면 호스트) ──────────────────────────
  if (phase === "editor" && embedUrl) {
    return (
      <StorigeEditorHost
        embedUrl={embedUrl}
        title={`${roomName} 포토북`}
        onComplete={handleComplete}
        onCancel={handleCancel}
      />
    );
  }

  // ── 준비/안내/완료 화면 (공통 셸) ─────────────────────────
  return (
    <MobileLayout
      hideNav
      header={
        <div className="flex h-14 items-center px-2">
          <Link
            href={`/rooms/${roomId}`}
            aria-label="채팅방으로 돌아가기"
            className="grid size-11 shrink-0 place-items-center text-foreground transition-transform active:scale-90"
          >
            <ChevronLeft className="size-6" aria-hidden />
          </Link>
          <h1 className="truncate text-[17px] font-semibold">포토북 만들기</h1>
        </div>
      }
    >
      {phase === "preparing" ? (
        <div className="flex flex-1 items-center justify-center px-6 py-16">
          <LoadingSpinner size="lg" label="편집기를 준비하고 있어요" />
        </div>
      ) : null}

      {phase === "not_configured" ? (
        /* 엠티 스테이트 — 연동 준비 중 (design-system.md §4.7) */
        <div className="flex flex-1 animate-fade-up flex-col items-center justify-center gap-4 px-6 py-16 text-center">
          <div className="flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary">
            <BookHeart className="size-9" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="space-y-1.5">
            <p className="text-[17px] font-semibold">편집기 연동 준비 중이에요</p>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              포토북 편집기를 연결하고 있어요
              <br />
              준비가 끝나면 바로 만들 수 있어요
            </p>
          </div>
          <Link href={`/rooms/${roomId}/photos`}>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl px-6 font-semibold"
            >
              갤러리로 돌아가기
            </Button>
          </Link>
          {/* 개발자용 안내 (의도적으로 작게) */}
          <p className="text-[11px] tracking-normal text-muted-foreground/60">
            dev: 서버에 STORIGE_API_KEY 환경변수를 설정하세요
          </p>
        </div>
      ) : null}

      {phase === "error" ? (
        <div className="flex flex-1 animate-fade-up flex-col items-center justify-center gap-4 px-6 py-16 text-center">
          <div className="flex size-20 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <BookHeart className="size-9" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="space-y-1.5">
            <p className="text-[17px] font-semibold">편집기를 열지 못했어요</p>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              {errorMessage ?? "잠시 후 다시 시도해 주세요."}
            </p>
          </div>
          <Button
            type="button"
            onClick={() => {
              // 준비 화면으로 되돌리고 이펙트 재실행 (retryKey 의존성)
              setErrorMessage(null);
              setPhase("preparing");
              setRetryKey((key) => key + 1);
            }}
            className="h-11 rounded-xl px-6 font-semibold"
          >
            다시 시도
          </Button>
        </div>
      ) : null}

      {phase === "completed" ? (
        <div className="flex flex-1 animate-fade-up flex-col items-center justify-center gap-4 px-6 py-16 text-center">
          <div className="flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary">
            <PartyPopper className="size-9" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="space-y-1.5">
            <p className="text-[17px] font-semibold">포토북 편집 완료</p>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              편집한 포토북은 주문 단계에서
              <br />
              이어서 진행할 수 있어요
            </p>
          </div>
          <Link href={`/rooms/${roomId}/photos`}>
            <Button className="h-11 rounded-xl px-6 font-semibold">
              갤러리로 돌아가기
            </Button>
          </Link>
        </div>
      ) : null}
    </MobileLayout>
  );
}
