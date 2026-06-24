"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

/** 결제 콜백 리다이렉트(?paid / ?payfail / ?payerror)를 토스트로 안내하고 쿼리를 정리. */
export function PaymentResultToast({
  paid,
  payfail,
  payerror,
}: {
  paid?: string;
  payfail?: string;
  payerror?: string;
}) {
  const router = useRouter();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    if (!paid && !payfail && !payerror) return;
    fired.current = true;

    if (paid) {
      toast.success("결제가 완료됐어요! 주문이 정상 접수되었습니다.");
    } else if (payfail) {
      if (payfail === "canceled") {
        toast("결제를 취소했어요. 언제든 다시 진행할 수 있어요.");
      } else {
        toast.error("결제가 완료되지 않았어요. 다시 시도해 주세요.");
      }
    } else if (payerror) {
      toast.error("결제 처리 중 문제가 생겼어요. 다시 시도해 주세요.");
    }
    // 쿼리 정리(뒤로가기/새로고침 시 토스트 재발 방지)
    router.replace("/orders");
  }, [paid, payfail, payerror, router]);

  return null;
}
