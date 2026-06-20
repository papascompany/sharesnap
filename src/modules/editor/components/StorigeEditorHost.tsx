"use client";

// Storige 편집기 전체화면 iframe 호스트 (HANDOFF §3.3~3.4)
// - editor.ready까지 로딩 오버레이(스켈레톤+스피너)
// - editor.error 시 재시도 패널, editor.needAuth 시 안내 배너
// - 상단 닫기 바: 편집 중이면 취소 확인 다이얼로그

import { useRef, useState } from "react";
import { TriangleAlert, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadingSpinner } from "@/modules/shared/components/LoadingSpinner";
import { Skeleton } from "@/modules/shared/components/Skeleton";
import { useStorigeEmbed } from "@/modules/editor/hooks/useStorigeEmbed";
import type { EmbedStatus, StorigeEditorResult } from "@/modules/editor/types";

interface StorigeEditorHostProps {
  /** buildEmbedUrl()로 생성한 /embed URL (parentOrigin 포함) */
  embedUrl: string;
  /** 상단 바 제목 (기본: 포토북 편집) */
  title?: string;
  /** editor.complete 수신 시 — 영속화는 호출 측(런처) 책임 */
  onComplete: (result: StorigeEditorResult) => void;
  /** 닫기 확정 또는 editor.cancel 수신 시 */
  onCancel: () => void;
}

/** 에러 payload에서 사용자 표시용 메시지 추출 */
function extractErrorMessage(payload: unknown): string {
  if (payload && typeof payload === "object") {
    const message = (payload as Record<string, unknown>).message;
    if (typeof message === "string" && message.length > 0) return message;
  }
  return "편집기에서 오류가 발생했습니다.";
}

export function StorigeEditorHost({
  embedUrl,
  title = "포토북 편집",
  onComplete,
  onCancel,
}: StorigeEditorHostProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<EmbedStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [needAuth, setNeedAuth] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // 재시도 시 iframe을 강제 리마운트하기 위한 키
  const [iframeKey, setIframeKey] = useState(0);

  useStorigeEmbed({
    onReady: () => {
      setStatus("ready");
      setErrorMessage(null);
    },
    onComplete: (result) => {
      setStatus("completed");
      onComplete(result);
    },
    onCancel,
    onNeedAuth: () => setNeedAuth(true),
    onError: (payload) => {
      setStatus("error");
      setErrorMessage(extractErrorMessage(payload));
    },
  });

  /** 닫기 버튼 — 편집 중(ready)이면 취소 확인, 그 외엔 즉시 닫기 */
  const handleCloseClick = () => {
    if (status === "ready") {
      setConfirmOpen(true);
    } else {
      onCancel();
    }
  };

  /** 에러 패널의 재시도 — iframe 리마운트 후 다시 로딩 */
  const handleRetry = () => {
    setErrorMessage(null);
    setNeedAuth(false);
    setStatus("loading");
    setIframeKey((key) => key + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* 상단 닫기 바 */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border/50 bg-background/90 pl-4 pr-1 backdrop-blur-xl">
        <span className="truncate text-[15px] font-medium">{title}</span>
        <button
          type="button"
          onClick={handleCloseClick}
          aria-label="편집기 닫기"
          className="grid size-11 shrink-0 place-items-center text-foreground transition-transform active:scale-90"
        >
          <X className="size-5" aria-hidden />
        </button>
      </header>

      <div className="relative flex-1">
        {/* 편집기 iframe — 에러 패널 표시 중에는 언마운트 */}
        {status !== "error" ? (
          <iframe
            key={iframeKey}
            ref={iframeRef}
            src={embedUrl}
            title="Storige 포토북 편집기"
            allow="clipboard-write"
            className="absolute inset-0 size-full border-0"
          />
        ) : null}

        {/* 로딩 오버레이 — editor.ready 수신까지 유지 */}
        {status === "loading" ? (
          <div className="absolute inset-0 flex flex-col gap-3 bg-background p-4">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="flex-1 rounded-2xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <div className="absolute inset-0 flex items-center justify-center">
              <LoadingSpinner size="lg" label="편집기를 불러오고 있어요" />
            </div>
          </div>
        ) : null}

        {/* needAuth 안내 배너 — 게스트 폴백 상태(완료 시 로그인 유도) */}
        {needAuth && status !== "error" ? (
          <div
            role="status"
            className="absolute inset-x-4 top-4 flex items-center gap-2 rounded-xl border border-border/50 bg-background/90 px-4 py-3 backdrop-blur-xl"
          >
            <UserRound className="size-4 shrink-0 text-primary" aria-hidden />
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              로그인 정보가 확인되지 않아 게스트로 열렸어요. 저장하려면 다시
              로그인해 주세요.
            </p>
          </div>
        ) : null}

        {/* 에러 패널 — 재시도 가능 */}
        {status === "error" ? (
          <div className="absolute inset-0 flex animate-fade-up flex-col items-center justify-center gap-4 bg-background px-6 py-16 text-center">
            <div className="flex size-20 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <TriangleAlert className="size-9" strokeWidth={1.5} aria-hidden />
            </div>
            <div className="space-y-1.5">
              <p className="text-[17px] font-semibold">
                편집기를 열지 못했어요
              </p>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                {errorMessage ?? "편집기에서 오류가 발생했습니다."}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="h-11 rounded-xl px-6 font-semibold"
              >
                닫기
              </Button>
              <Button
                type="button"
                onClick={handleRetry}
                className="h-11 rounded-xl px-6 font-semibold"
              >
                다시 시도
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {/* 닫기(취소) 확인 다이얼로그 */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>편집을 그만할까요?</DialogTitle>
            <DialogDescription>
              저장하지 않은 변경 내용은 사라질 수 있어요.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
            >
              계속 편집
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setConfirmOpen(false);
                onCancel();
              }}
            >
              그만하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
