import Link from "next/link";
import { Printer } from "lucide-react";
import { MobileLayout } from "@/modules/shared/components/MobileLayout";
import { OrdersTabs } from "@/modules/photobook/components/OrdersTabs";
import { PaymentResultToast } from "@/modules/payment/components/PaymentResultToast";

export const metadata = {
  title: "주문 — ShareSnap",
};

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ paid?: string; payfail?: string; payerror?: string }>;
}) {
  const sp = await searchParams;

  return (
    <MobileLayout
      header={
        <div className="flex h-14 items-center justify-between px-4">
          <h1 className="text-2xl font-bold tracking-[-0.02em]">주문</h1>
          <Link
            href="/print/new"
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary/10 px-3.5 text-[13px] font-semibold text-primary transition active:scale-95"
          >
            <Printer className="size-4" aria-hidden />
            사진 인화
          </Link>
        </div>
      }
    >
      <PaymentResultToast
        paid={sp.paid}
        payfail={sp.payfail}
        payerror={sp.payerror}
      />
      <OrdersTabs />
    </MobileLayout>
  );
}
