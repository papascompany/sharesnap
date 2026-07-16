"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Plus,
  Minus,
  Loader2,
  Printer,
  ChevronRight,
  ImageOff,
} from "lucide-react";
import { toast } from "sonner";
import { useMyRooms } from "@/modules/room/hooks/useRoom";
import { usePhotos } from "@/modules/photo/hooks/usePhotos";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { Skeleton } from "@/modules/shared/components/Skeleton";
import { createPrintOrder } from "@/modules/print-order/services/printOrderService";
import {
  PRINT_SIZES,
  PRINT_PAPERS,
  DEFAULT_PRINT_SIZE,
  DEFAULT_PRINT_PAPER,
  printUnitPrice,
  calculatePrintTotal,
  PRINT_SHIPPING_FEE,
  type PrintSize,
  type PrintPaper,
} from "@/modules/print-order/utils/pricing";
import { formatKRW } from "@/modules/photobook/utils/pricing";

export function PrintOrderCreator({
  initialRoomId,
}: {
  initialRoomId?: string;
}) {
  const [roomId, setRoomId] = useState<string | null>(initialRoomId ?? null);

  if (!roomId) {
    return <RoomPicker onPick={setRoomId} />;
  }
  return <PhotoSelector roomId={roomId} onBack={() => setRoomId(null)} />;
}

// ---- 1단계: 방 선택 ----
function RoomPicker({ onPick }: { onPick: (id: string) => void }) {
  const { rooms, isLoading } = useMyRooms();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 px-4 py-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <p className="text-[16px] font-semibold">참여 중인 공유방이 없어요</p>
        <p className="text-[13px] text-muted-foreground">
          공유방에서 사진을 모은 뒤 인화 주문을 할 수 있어요.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <p className="mb-3 text-[14px] font-semibold text-muted-foreground">
        어떤 공유방의 사진을 인화할까요?
      </p>
      <ul className="grid grid-cols-2 gap-3">
        {rooms.map((room) => (
          <li key={room.id}>
            <button
              type="button"
              onClick={() => onPick(room.id)}
              className="group flex w-full flex-col items-start gap-2 rounded-2xl border border-border/60 bg-card p-4 text-left transition active:scale-[0.98]"
            >
              <span className="line-clamp-1 text-[15px] font-semibold">
                {room.name}
              </span>
              <span className="inline-flex items-center gap-1 text-[12px] text-primary">
                사진 고르기 <ChevronRight className="size-3.5" aria-hidden />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---- 2단계: 사진 선택 + 옵션 ----
function PhotoSelector({
  roomId,
  onBack,
}: {
  roomId: string;
  onBack: () => void;
}) {
  const router = useRouter();
  const { photos, isLoading } = usePhotos(roomId);
  const { user } = useAuth();
  const [qty, setQty] = useState<Record<string, number>>({});
  const [size, setSize] = useState<PrintSize>(DEFAULT_PRINT_SIZE);
  const [paper, setPaper] = useState<PrintPaper>(DEFAULT_PRINT_PAPER);
  const [creating, setCreating] = useState(false);

  const selectedIds = useMemo(
    () => Object.keys(qty).filter((id) => (qty[id] ?? 0) > 0),
    [qty],
  );
  const totalSheets = selectedIds.reduce((s, id) => s + (qty[id] ?? 0), 0);
  // 선택분 중 '다른 멤버가 올린' 사진 수 — 인화 전 초상권/저작권 인지 (감사 P1)
  const othersSelectedCount = useMemo(() => {
    if (!user) return 0;
    const selected = new Set(selectedIds);
    return photos.filter((p) => selected.has(p.id) && p.user_id !== user.id)
      .length;
  }, [selectedIds, photos, user]);
  const total = calculatePrintTotal(
    selectedIds.map((id) => ({ size, paper, quantity: qty[id] ?? 0 })),
  );

  function toggle(id: string) {
    setQty((prev) => {
      const next = { ...prev };
      if ((next[id] ?? 0) > 0) delete next[id];
      else next[id] = 1;
      return next;
    });
  }
  function bump(id: string, delta: number) {
    setQty((prev) => {
      const v = Math.max(0, (prev[id] ?? 0) + delta);
      const next = { ...prev };
      if (v === 0) delete next[id];
      else next[id] = v;
      return next;
    });
  }

  async function submit() {
    if (selectedIds.length === 0) {
      toast.error("인화할 사진을 선택해 주세요.");
      return;
    }
    setCreating(true);
    try {
      const orderId = await createPrintOrder({
        roomId,
        items: selectedIds.map((photoId) => ({
          photoId,
          size,
          paper,
          quantity: qty[photoId] ?? 1,
        })),
      });
      router.push(`/print/${orderId}/checkout`);
    } catch (e) {
      toast.error(
        "주문서 생성 실패: " + (e instanceof Error ? e.message : String(e)),
      );
      setCreating(false);
    }
  }

  return (
    <div className="pb-40">
      {/* 옵션 바 */}
      <div className="space-y-3 px-4 py-4">
        <Segmented
          label="사이즈"
          options={Object.entries(PRINT_SIZES).map(([k, v]) => ({
            value: k,
            label: v.label,
          }))}
          value={size}
          onChange={(v) => setSize(v as PrintSize)}
        />
        <Segmented
          label="용지"
          options={Object.entries(PRINT_PAPERS).map(([k, v]) => ({
            value: k,
            label: v.label,
          }))}
          value={paper}
          onChange={(v) => setPaper(v as PrintPaper)}
        />
        <p className="text-[12px] text-muted-foreground">
          1매 {formatKRW(printUnitPrice(size, paper))} · 배송비{" "}
          {formatKRW(PRINT_SHIPPING_FEE)}
          <button
            type="button"
            onClick={onBack}
            className="ml-2 font-medium text-primary underline-offset-2 hover:underline"
          >
            방 바꾸기
          </button>
        </p>
      </div>

      {/* 사진 그리드 */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-1.5 px-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-16 text-center text-muted-foreground">
          <ImageOff className="size-8" strokeWidth={1.5} aria-hidden />
          <p className="text-[14px]">이 방에는 아직 사진이 없어요.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-3 gap-1.5 px-4">
          {photos.map((p) => {
            const count = qty[p.id] ?? 0;
            const selected = count > 0;
            return (
              <li key={p.id} className="relative aspect-square">
                <button
                  type="button"
                  onClick={() => toggle(p.id)}
                  className="relative size-full overflow-hidden rounded-lg bg-muted ring-1 ring-border/40"
                  aria-pressed={selected}
                >
                  {p.thumbnailUrl ? (
                    // Supabase Storage 원격 이미지 — next/image 원격 패턴 미설정으로 img 사용
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.thumbnailUrl}
                      alt=""
                      className="absolute inset-0 size-full object-cover"
                    />
                  ) : null}
                  {selected ? (
                    <span className="absolute inset-0 bg-primary/25" />
                  ) : null}
                  <span
                    className={`absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full border-2 transition ${
                      selected
                        ? "border-white bg-primary text-white"
                        : "border-white/80 bg-black/20"
                    }`}
                  >
                    {selected ? <Check className="size-3" aria-hidden /> : null}
                  </span>
                </button>
                {selected ? (
                  <div className="absolute inset-x-1 bottom-1 flex items-center justify-between rounded-full bg-black/60 px-1 py-0.5 backdrop-blur-sm">
                    <button
                      type="button"
                      onClick={() => bump(p.id, -1)}
                      className="flex size-5 items-center justify-center rounded-full text-white active:scale-90"
                      aria-label="수량 줄이기"
                    >
                      <Minus className="size-3" aria-hidden />
                    </button>
                    <span className="text-[12px] font-semibold tabular-nums text-white">
                      {count}
                    </span>
                    <button
                      type="button"
                      onClick={() => bump(p.id, 1)}
                      className="flex size-5 items-center justify-center rounded-full text-white active:scale-90"
                      aria-label="수량 늘리기"
                    >
                      <Plus className="size-3" aria-hidden />
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {/* 하단 고정 주문 바 */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/90 px-4 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] backdrop-blur-xl">
        <div className="mx-auto max-w-md">
          {/* 다른 멤버 사진 포함 고지 (감사 P1) */}
          {othersSelectedCount > 0 ? (
            <p className="mb-2 text-[11.5px] leading-snug text-muted-foreground">
              다른 멤버가 올린 사진 {othersSelectedCount}장이 포함돼 있어요. 인화
              주문은 함께 찍은 사진을 나눠 갖는 용도로만 이용해 주세요.
            </p>
          ) : null}
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-[13px] text-muted-foreground">
              {totalSheets > 0 ? `${totalSheets}매 선택` : "사진을 선택하세요"}
            </span>
            <span className="text-[18px] font-bold tabular-nums text-primary">
              {formatKRW(total)}
            </span>
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={creating || selectedIds.length === 0}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[16px] font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-50"
          >
            {creating ? (
              <Loader2 className="size-[18px] animate-spin" aria-hidden />
            ) : (
              <Printer className="size-[18px]" aria-hidden />
            )}
            {creating ? "주문서 만드는 중…" : "배송 정보 입력하기"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Segmented({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[13px] font-semibold">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition active:scale-95 ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
