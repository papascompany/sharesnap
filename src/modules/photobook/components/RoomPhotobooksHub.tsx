"use client";

// 방 포토북 허브 — "이 방의 포토북"(멤버가 만든 완성본) 공동주문 + 내 포토북 만들기.
// 한 명이 편집한 결과물을 방 멤버가 각자 주문할 수 있게 해 편집 노동을 N개의 주문으로 잇는다.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookHeart, Loader2, ShoppingBag, Plus } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/modules/shared/components/Skeleton";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useProfiles } from "@/modules/profile/hooks/useProfiles";
import { displayName } from "@/modules/profile/services/profileService";
import { formatRelativeTime } from "@/modules/shared/lib/utils";
import { BOOK_SIZES } from "@/modules/shared/lib/constants";
import {
  listRoomPhotobooks,
  clonePhotobookOrder,
  type RoomPhotobook,
} from "@/modules/photobook/services/photobookService";
import {
  calculatePhotobookPrice,
  formatKRW,
} from "@/modules/photobook/utils/pricing";

interface RoomPhotobooksHubProps {
  roomId: string;
  roomName: string;
}

export function RoomPhotobooksHub({ roomId, roomName }: RoomPhotobooksHubProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [books, setBooks] = useState<RoomPhotobook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cloningId, setCloningId] = useState<string | null>(null);
  const profiles = useProfiles(books.map((b) => b.userId));

  useEffect(() => {
    let cancelled = false;
    // setState는 promise 콜백에서만 (effect 동기 setState 금지 룰)
    listRoomPhotobooks(roomId)
      .then((list) => {
        if (!cancelled) setBooks(list);
      })
      .catch(() => {
        // RPC 미적용(마이그015 전) 등 — 빈 목록으로 폴백, 만들기 CTA는 계속 동작
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  async function handleClone(book: RoomPhotobook) {
    setCloningId(book.id);
    try {
      const newOrderId = await clonePhotobookOrder(book.id);
      toast.success("주문서를 만들었어요. 배송 정보를 입력해 주세요.");
      router.push(`/photobooks/${newOrderId}/checkout`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "주문서 생성에 실패했어요.");
      setCloningId(null);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border/50 bg-background/85 px-2 backdrop-blur-xl">
        <Link
          href={`/rooms/${roomId}`}
          className="flex size-10 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted active:scale-95"
          aria-label="뒤로"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-[17px] font-bold tracking-[-0.01em]">
            포토북
          </h1>
          <p className="truncate text-[11px] text-muted-foreground">{roomName}</p>
        </div>
      </header>

      <main className="flex flex-1 flex-col px-4 py-5">
        {/* 새로 만들기 */}
        <Link
          href={`/rooms/${roomId}/photobook`}
          className="flex items-center gap-3 rounded-2xl bg-sunset p-4 text-white shadow-sm transition active:scale-[0.99]"
        >
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/20">
            <Plus className="size-6" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold">포토북 만들기</p>
            <p className="text-[12px] text-white/85">
              이 방 사진으로 나만의 포토북을 편집해요
            </p>
          </div>
        </Link>

        {/* 이 방의 완성 포토북 — 공동주문 */}
        <section className="mt-6">
          <h2 className="text-[14px] font-bold">이 방의 포토북</h2>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            멤버가 완성한 포토북을 그대로 주문할 수 있어요.
          </p>

          {isLoading ? (
            <ul className="mt-3 space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <li key={i}>
                  <Skeleton className="h-24 w-full rounded-2xl" />
                </li>
              ))}
            </ul>
          ) : books.length === 0 ? (
            <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-6 py-10 text-center">
              <BookHeart
                className="size-8 text-muted-foreground"
                strokeWidth={1.5}
                aria-hidden
              />
              <p className="text-[13px] text-muted-foreground">
                아직 완성된 포토북이 없어요.
                <br />첫 포토북을 만들어 멤버들과 나눠 보세요.
              </p>
            </div>
          ) : (
            <ul className="mt-3 space-y-3">
              {books.map((book) => {
                const isMine = book.userId === user?.id;
                const sizeLabel = BOOK_SIZES[book.bookSize]?.label ?? book.bookSize;
                const price = calculatePhotobookPrice(
                  book.bookSize,
                  book.pageCount,
                  1,
                );
                return (
                  <li
                    key={book.id}
                    className="rounded-2xl border border-border/60 bg-card p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <BookHeart
                          className="size-6"
                          strokeWidth={1.7}
                          aria-hidden
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-semibold">
                          {isMine
                            ? "내가 만든 포토북"
                            : `${displayName(profiles.get(book.userId), false)}님의 포토북`}
                        </p>
                        <p className="mt-0.5 text-[12px] text-muted-foreground">
                          {sizeLabel}
                          {book.pageCount > 0 ? ` · ${book.pageCount}면` : ""} ·{" "}
                          {formatRelativeTime(book.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className="text-[14px] font-semibold tabular-nums">
                        <span className="text-muted-foreground">예상 </span>
                        {formatKRW(price)}
                      </p>
                      {isMine ? (
                        <Link
                          href={`/photobooks/${book.id}`}
                          className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-[13px] font-semibold transition hover:bg-muted"
                        >
                          내 주문 보기
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void handleClone(book)}
                          disabled={cloningId !== null}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-[13px] font-semibold text-primary-foreground transition active:scale-95 disabled:opacity-50"
                        >
                          {cloningId === book.id ? (
                            <Loader2 className="size-3.5 animate-spin" aria-hidden />
                          ) : (
                            <ShoppingBag className="size-3.5" aria-hidden />
                          )}
                          나도 주문하기
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
