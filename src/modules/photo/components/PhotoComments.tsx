"use client";

// 사진 코멘트 바텀시트 — 목록 + 입력 (usePhotoComments 낙관적 업데이트 연동)
// 뷰어(z-50) 위에 겹쳐 표시 — Sheet 포털이 body 끝에 붙어 자연스럽게 상위 레이어

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUp, Trash2, UserRound } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/modules/shared/components/Skeleton";
import { usePhotoComments } from "@/modules/photo/hooks/usePhotoComments";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { cn, formatRelativeTime } from "@/modules/shared/lib/utils";

interface PhotoCommentsProps {
  /** 대상 사진 id — 시트가 닫혀 있으면 로드하지 않음 */
  photoId: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PhotoComments({ photoId, open, onOpenChange }: PhotoCommentsProps) {
  const { user } = useAuth();
  // 닫힌 동안 불필요한 요청 방지 — open일 때만 photoId 전달
  const { comments, isLoading, add, remove } = usePhotoComments(
    open ? photoId : undefined,
  );
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // 새 코멘트 추가/로드 시 맨 아래로 스크롤 (DOM 조작만 — setState 없음)
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ block: "end" });
  }, [open, comments.length]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;
    setDraft("");
    // 낙관적 추가 — 실패 시 훅이 토스트 + 롤백 처리
    void add(content);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[70dvh] gap-0 rounded-t-3xl p-0 pb-[env(safe-area-inset-bottom)]"
      >
        <SheetHeader className="border-b border-border/50 px-4 py-3">
          <SheetTitle className="text-[15px]">
            코멘트{!isLoading && ` ${comments.length}`}
          </SheetTitle>
        </SheetHeader>

        {/* 코멘트 목록 */}
        <div className="min-h-28 flex-1 overflow-y-auto px-4 py-3">
          {isLoading ? (
            <div className="flex flex-col gap-3" aria-hidden>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <Skeleton className="size-6 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-muted-foreground">
              첫 코멘트를 남겨보세요
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {comments.map((comment) => {
                const isMine = comment.user_id === user?.id;
                // temp- 접두 id = 서버 응답 대기 중 (낙관적 항목)
                const isPending = comment.id.startsWith("temp-");
                return (
                  <li
                    key={comment.id}
                    className={cn(
                      "flex items-start gap-2.5",
                      isPending && "opacity-60",
                    )}
                  >
                    <Avatar size="sm" className="mt-0.5">
                      {comment.authorAvatarUrl ? (
                        <AvatarImage src={comment.authorAvatarUrl} alt="" />
                      ) : null}
                      <AvatarFallback>
                        <UserRound className="size-3.5" aria-hidden />
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-1.5">
                        {/* TODO(photo): 프로필 테이블 조인 후 실제 닉네임 표시 */}
                        <span className="text-[12px] font-semibold">
                          {comment.authorName ?? (isMine ? "나" : "멤버")}
                        </span>
                        <span className="text-[10px] tabular-nums text-muted-foreground/70">
                          {isPending
                            ? "전송 중..."
                            : formatRelativeTime(comment.created_at)}
                        </span>
                      </div>
                      <p className="break-words text-[14px] leading-[1.5]">
                        {comment.content}
                      </p>
                    </div>
                    {isMine && !isPending ? (
                      <button
                        type="button"
                        onClick={() => void remove(comment.id)}
                        aria-label="코멘트 삭제"
                        className="grid size-8 shrink-0 place-items-center text-muted-foreground/60 transition-transform active:scale-90"
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
          <div ref={bottomRef} />
        </div>

        {/* 입력 바 */}
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 border-t border-border/50 px-3 py-2"
        >
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="코멘트 남기기..."
            aria-label="코멘트 입력"
            className="h-11 flex-1 rounded-full bg-muted px-4 text-[15px]"
          />
          <Button
            type="submit"
            disabled={!draft.trim()}
            aria-label="코멘트 전송"
            className="size-11 shrink-0 rounded-full disabled:bg-muted"
          >
            <ArrowUp className="size-5" aria-hidden />
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
