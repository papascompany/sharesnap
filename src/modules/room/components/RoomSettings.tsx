"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
  Copy,
  UserMinus,
  LogOut,
  Trash2,
  Crown,
} from "lucide-react";
import { toast } from "sonner";
import { formatRelativeTime } from "@/modules/shared/lib/utils";
import { APP_URL } from "@/modules/shared/lib/constants";
import { useRoomMembers } from "@/modules/room/hooks/useRoomMembers";
import {
  reissueShareCode,
  kickMember,
  leaveRoom,
  deleteRoom,
} from "@/modules/room/services/roomService";

interface RoomSettingsProps {
  roomId: string;
  roomName: string;
  shareCode: string;
  isOwner: boolean;
  currentUserId: string;
}

export function RoomSettings({
  roomId,
  roomName,
  shareCode: initialShareCode,
  isOwner,
  currentUserId,
}: RoomSettingsProps) {
  const router = useRouter();
  const { members, isLoading, refresh } = useRoomMembers(roomId);
  const [shareCode, setShareCode] = useState(initialShareCode);
  const [reissuing, setReissuing] = useState(false);
  const [busy, setBusy] = useState(false);

  const inviteUrl = `${APP_URL}/join/${shareCode}`;

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("초대 링크를 복사했어요.");
    } catch {
      toast.error("복사에 실패했어요.");
    }
  }

  async function handleReissue() {
    if (
      !window.confirm(
        "초대 링크를 새로 만들까요? 기존 링크는 즉시 사용할 수 없게 돼요.",
      )
    )
      return;
    setReissuing(true);
    try {
      const next = await reissueShareCode(roomId);
      setShareCode(next);
      toast.success("새 초대 링크를 만들었어요. 기존 링크는 무효화됐어요.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "재발급 실패");
    } finally {
      setReissuing(false);
    }
  }

  async function handleKick(userId: string) {
    if (!window.confirm("이 멤버를 방에서 내보낼까요?")) return;
    try {
      await kickMember(roomId, userId);
      toast.success("멤버를 내보냈어요.");
      void refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "내보내기 실패");
    }
  }

  async function handleLeave() {
    if (!window.confirm(`'${roomName}'에서 나갈까요?`)) return;
    setBusy(true);
    try {
      await leaveRoom(roomId);
      toast.success("방에서 나왔어요.");
      router.replace("/rooms");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "나가기 실패");
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (
      !window.confirm(
        `'${roomName}'을(를) 삭제할까요? 모든 사진·대화가 영구 삭제되며 되돌릴 수 없어요.`,
      )
    )
      return;
    setBusy(true);
    try {
      await deleteRoom(roomId);
      toast.success("공유방을 삭제했어요.");
      router.replace("/rooms");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "삭제 실패");
      setBusy(false);
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
        <h1 className="text-[17px] font-bold tracking-[-0.01em]">방 설정</h1>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 space-y-5 px-4 py-5 pb-[max(env(safe-area-inset-bottom),2rem)]">
        {/* 초대 링크 */}
        <section className="rounded-2xl border border-border/60 bg-card p-4">
          <h2 className="text-[14px] font-bold">초대 링크</h2>
          <p className="mt-1 text-[12px] text-muted-foreground">
            링크가 외부에 유출됐다면 새로 만들어 기존 링크를 무효화하세요.
          </p>
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2">
            <span className="truncate text-[12px] text-muted-foreground">
              {inviteUrl}
            </span>
            <button
              type="button"
              onClick={copyInvite}
              className="ml-auto grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted active:scale-90"
              aria-label="초대 링크 복사"
            >
              <Copy className="size-4" aria-hidden />
            </button>
          </div>
          {isOwner ? (
            <button
              type="button"
              onClick={handleReissue}
              disabled={reissuing}
              className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-xl border border-border px-4 text-[13px] font-semibold transition hover:bg-muted active:scale-[0.98] disabled:opacity-50"
            >
              <RefreshCw
                className={`size-4 ${reissuing ? "animate-spin" : ""}`}
                aria-hidden
              />
              초대 링크 재발급
            </button>
          ) : null}
        </section>

        {/* 멤버 */}
        <section className="rounded-2xl border border-border/60 bg-card p-4">
          <h2 className="text-[14px] font-bold">
            멤버 {members.length > 0 ? `${members.length}명` : ""}
          </h2>
          {isLoading ? (
            <p className="mt-3 text-[13px] text-muted-foreground">
              불러오는 중…
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {members.map((m) => {
                const isMe = m.user_id === currentUserId;
                const isRoomOwner = m.role === "owner";
                return (
                  <li
                    key={m.user_id}
                    className="flex items-center gap-2.5 rounded-xl bg-muted/40 px-3 py-2"
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                      {m.user_id.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1 text-[13px] font-medium">
                        {isRoomOwner ? (
                          <Crown
                            className="size-3.5 text-amber-500"
                            aria-label="방장"
                          />
                        ) : null}
                        멤버 {m.user_id.slice(0, 6)}
                        {isMe ? " (나)" : ""}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatRelativeTime(m.joined_at)} 참여
                      </p>
                    </div>
                    {/* 방장만, 자기 자신·다른 방장 제외하고 강퇴 */}
                    {isOwner && !isMe && !isRoomOwner ? (
                      <button
                        type="button"
                        onClick={() => handleKick(m.user_id)}
                        className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive active:scale-90"
                        aria-label="내보내기"
                      >
                        <UserMinus className="size-4" aria-hidden />
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* 위험 구역 */}
        <section className="rounded-2xl border border-destructive/25 bg-card p-4">
          <h2 className="text-[14px] font-bold text-destructive">위험 구역</h2>
          {isOwner ? (
            <>
              <p className="mt-1 text-[12px] text-muted-foreground">
                방을 삭제하면 모든 사진과 대화가 영구 삭제돼요.
              </p>
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy}
                className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-xl bg-destructive px-4 text-[13px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
              >
                <Trash2 className="size-4" aria-hidden />
                공유방 삭제
              </button>
            </>
          ) : (
            <>
              <p className="mt-1 text-[12px] text-muted-foreground">
                방에서 나가면 다시 초대 링크로 참여할 수 있어요.
              </p>
              <button
                type="button"
                onClick={handleLeave}
                disabled={busy}
                className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-xl border border-destructive/40 px-4 text-[13px] font-semibold text-destructive transition active:scale-[0.98] disabled:opacity-50"
              >
                <LogOut className="size-4" aria-hidden />
                방 나가기
              </button>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
