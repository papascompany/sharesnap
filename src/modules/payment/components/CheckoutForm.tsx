"use client";

import { useEffect, useRef, useState } from "react";
import { CreditCard, Loader2, ShieldCheck, Lock } from "lucide-react";
import { toast } from "sonner";
import { initTossWidgets, type TossWidgets } from "@/modules/payment/services/tossWidget";
import {
  ShippingAddressForm,
  EMPTY_SHIPPING,
  isShippingValid,
  type ShippingFormState,
} from "@/modules/payment/components/ShippingAddressForm";
import type { CheckoutSession, OrderKind } from "@/modules/payment/types";
import { formatKRW } from "@/modules/photobook/utils/pricing";

interface CheckoutFormProps {
  orderKind: OrderKind;
  orderId: string;
  orderName: string;
  /** 서버 산출 예상가(원). 결제 직전 서버가 재확정한다. */
  amount: number;
  clientKey: string;
  customerKey: string;
  customerEmail: string | null;
  defaultRecipientName?: string;
}

export function CheckoutForm(props: CheckoutFormProps) {
  const [shipping, setShipping] = useState<ShippingFormState>({
    ...EMPTY_SHIPPING,
    recipientName: props.defaultRecipientName ?? "",
  });
  const [widgetsReady, setWidgetsReady] = useState(false);
  const [busy, setBusy] = useState(false);
  // 전자상거래법 §17② — 주문제작 상품 청약철회 제한 사전 고지·동의 (감사 P0-C)
  const [agreedWithdrawal, setAgreedWithdrawal] = useState(false);
  const widgetsRef = useRef<TossWidgets | null>(null);
  const initedRef = useRef(false);

  const tossConfigured = Boolean(props.clientKey && props.customerKey);

  // 결제위젯 초기화(1회) — 동기 setState 금지(promise 콜백에서만 setWidgetsReady)
  useEffect(() => {
    if (!tossConfigured || initedRef.current) return;
    initedRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const widgets = await initTossWidgets(props.clientKey, props.customerKey);
        if (cancelled) return;
        widgetsRef.current = widgets;
        await widgets.setAmount({ currency: "KRW", value: props.amount });
        await Promise.all([
          widgets.renderPaymentMethods({
            selector: "#toss-payment-method",
            variantKey: "DEFAULT",
          }),
          widgets.renderAgreement({
            selector: "#toss-agreement",
            variantKey: "AGREEMENT",
          }),
        ]);
        if (!cancelled) setWidgetsReady(true);
      } catch (e) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : "결제 모듈을 불러오지 못했어요.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tossConfigured, props.clientKey, props.customerKey, props.amount]);

  const patch = (p: Partial<ShippingFormState>) =>
    setShipping((s) => ({ ...s, ...p }));

  const canPay =
    tossConfigured &&
    widgetsReady &&
    isShippingValid(shipping) &&
    agreedWithdrawal &&
    !busy;

  async function pay() {
    if (!isShippingValid(shipping)) {
      toast.error("받는 분·연락처·배송지를 모두 입력해 주세요.");
      return;
    }
    if (!agreedWithdrawal) {
      toast.error("주문 제작 및 청약철회 제한 안내에 동의해 주세요.");
      return;
    }
    const widgets = widgetsRef.current;
    if (!widgets) {
      toast.error("결제 모듈이 아직 준비되지 않았어요.");
      return;
    }
    setBusy(true);
    try {
      // 1) 서버에 배송지 저장 + 금액 재확정 + ready payment 발급
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderKind: props.orderKind,
          orderId: props.orderId,
          recipientName: shipping.recipientName.trim(),
          recipientPhone: shipping.recipientPhone.trim(),
          address: {
            zipcode: shipping.zipcode,
            address: shipping.address,
            addressDetail: shipping.addressDetail.trim(),
          },
          memo: shipping.memo.trim() || undefined,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        session?: CheckoutSession;
        message?: string;
        error?: string;
      };
      if (!res.ok || !j.session) {
        throw new Error(j.message || j.error || "결제 준비에 실패했어요.");
      }
      const s = j.session;

      // 2) 금액이 갱신됐으면 위젯에 반영
      if (s.amount !== props.amount) {
        await widgets.setAmount({ currency: "KRW", value: s.amount });
      }

      // 3) 토스 결제 요청 — successUrl로 redirect됨
      await widgets.requestPayment({
        orderId: s.merchantOrderId,
        orderName: s.orderName,
        successUrl: s.successUrl,
        failUrl: s.failUrl,
        customerEmail: s.customerEmail ?? undefined,
        customerName: s.customerName,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // 사용자가 결제창을 닫은 경우(USER_CANCEL 등)는 조용히 처리
      if (!/cancel|취소|popup|닫/i.test(msg)) {
        toast.error("결제 실패: " + msg);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 px-4 py-5 pb-32">
      {/* 배송지 */}
      <section className="rounded-2xl border border-border/60 bg-card p-5">
        <h2 className="text-[15px] font-bold tracking-[-0.01em]">배송 정보</h2>
        <div className="mt-4">
          <ShippingAddressForm value={shipping} onChange={patch} />
        </div>
      </section>

      {/* 결제 수단 */}
      <section className="rounded-2xl border border-border/60 bg-card p-5">
        <h2 className="text-[15px] font-bold tracking-[-0.01em]">결제 수단</h2>
        {tossConfigured ? (
          <div className="mt-2">
            <div id="toss-payment-method" />
            <div id="toss-agreement" />
            {!widgetsReady ? (
              <div className="flex items-center justify-center gap-2 py-8 text-[14px] text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                결제 수단을 불러오는 중…
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-muted/50 p-4 text-[13px] leading-relaxed text-muted-foreground">
            <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              결제 연동을 준비 중이에요. (토스페이먼츠 키 설정 후 활성화됩니다)
              <br />
              배송 정보는 미리 입력해 두실 수 있어요.
            </span>
          </div>
        )}
      </section>

      {/* 주문 제작·청약철회 제한 고지 + 동의 (전자상거래법 §17②, 감사 P0-C) */}
      {tossConfigured ? (
        <section className="rounded-2xl border border-border/60 bg-card p-5">
          <h2 className="text-[15px] font-bold tracking-[-0.01em]">
            주문 제작 안내
          </h2>
          <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
            주문하신 상품은 회원님의 사진·주문 내용에 따라 개별 제작되는
            주문제작 상품입니다. 「전자상거래 등에서의 소비자보호에 관한 법률」에
            따라 <strong className="text-foreground">제작이 시작된 이후에는
            청약철회(환불)가 제한</strong>됩니다. (제작 착수 전에는 취소·전액 환불
            가능)
          </p>
          <label className="mt-3 flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={agreedWithdrawal}
              onChange={(e) => setAgreedWithdrawal(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 rounded border-border accent-primary"
            />
            <span className="text-[13px] leading-snug text-foreground">
              위 주문 제작 및 청약철회 제한 내용을 확인했으며 이에 동의합니다.
              <span className="text-primary"> (필수)</span>
            </span>
          </label>
          <p className="mt-2.5 text-[12px] leading-relaxed text-muted-foreground">
            자세한 내용은{" "}
            <a
              href="/terms"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              이용약관
            </a>
            을 확인해 주세요.
          </p>
        </section>
      ) : null}

      {/* 하단 고정 결제 바 */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/90 px-4 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] backdrop-blur-xl">
        <div className="mx-auto max-w-md">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-[13px] text-muted-foreground">총 결제금액</span>
            <span className="text-[19px] font-bold tabular-nums text-primary">
              {formatKRW(props.amount)}
            </span>
          </div>
          <button
            type="button"
            onClick={pay}
            disabled={!canPay}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[16px] font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="size-[18px] animate-spin" aria-hidden />
            ) : (
              <CreditCard className="size-[18px]" aria-hidden />
            )}
            {busy ? "결제 진행 중…" : `${formatKRW(props.amount)} 결제하기`}
          </button>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="size-3.5" aria-hidden />
            토스페이먼츠로 안전하게 결제돼요
          </p>
        </div>
      </div>
    </div>
  );
}
