import { ShoppingBag } from "lucide-react";
import { MobileLayout } from "@/modules/shared/components/MobileLayout";

export const metadata = {
  title: "주문 — ShareSnap",
};

export default function OrdersPage() {
  return (
    <MobileLayout
      header={
        <div className="flex h-14 items-center px-4">
          <h1 className="text-2xl font-bold tracking-[-0.02em]">주문</h1>
        </div>
      }
    >
      {/* 준비 중 엠티 스테이트 — design-system.md §4.7 */}
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center animate-fade-up">
        <div className="flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShoppingBag className="size-9" strokeWidth={1.5} aria-hidden />
        </div>
        <div className="space-y-1.5">
          <p className="text-[17px] font-semibold">주문 내역 준비 중</p>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            인화와 포토북 주문 기능을 준비하고 있어요.
            <br />
            완성되면 여기에서 주문 내역을 확인할 수 있어요.
          </p>
        </div>
      </div>
    </MobileLayout>
  );
}
