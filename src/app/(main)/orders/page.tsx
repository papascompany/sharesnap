import { MobileLayout } from "@/modules/shared/components/MobileLayout";
import { PhotobookList } from "@/modules/photobook/components/PhotobookList";

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
      {/* 현재는 포토북 주문만 — 인화주문(M7)은 Phase 6에서 추가 */}
      <PhotobookList mode="orders" />
    </MobileLayout>
  );
}
