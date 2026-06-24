"use client";

// 토스페이먼츠 v2 표준 결제위젯 — CDN 동적 로드 래퍼.
// SSR/번들 안전(카카오 SDK와 동일 패턴): script 동적 삽입 후 window.TossPayments 사용.
// 클라이언트 키만 필요(NEXT_PUBLIC_TOSS_CLIENT_KEY) — 승인은 서버(paymentServer)에서.

const SDK_SRC = "https://js.tosspayments.com/v2/standard";

// ---- 토스 SDK 최소 타입(공식 v2 표준) ----
export interface TossWidgets {
  setAmount(arg: { currency: "KRW"; value: number }): Promise<void>;
  renderPaymentMethods(arg: {
    selector: string;
    variantKey?: string;
  }): Promise<unknown>;
  renderAgreement(arg: {
    selector: string;
    variantKey?: string;
  }): Promise<unknown>;
  requestPayment(arg: {
    orderId: string;
    orderName: string;
    successUrl: string;
    failUrl: string;
    customerEmail?: string;
    customerName?: string;
  }): Promise<void>;
}

interface TossPaymentsInstance {
  widgets(arg: { customerKey: string }): TossWidgets;
}

type TossPaymentsFactory = (clientKey: string) => TossPaymentsInstance;

declare global {
  interface Window {
    TossPayments?: TossPaymentsFactory;
  }
}

let loadPromise: Promise<void> | null = null;

/** 토스 표준 SDK 스크립트를 1회 로드. */
function loadSdk(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("브라우저에서만 사용할 수 있어요."));
  }
  if (window.TossPayments) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SDK_SRC}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("토스 SDK 로드 실패")));
      if (window.TossPayments) resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = SDK_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loadPromise = null;
      reject(new Error("토스 SDK 로드 실패"));
    };
    document.head.appendChild(s);
  });
  return loadPromise;
}

/** clientKey + customerKey로 결제위젯 인스턴스를 초기화. */
export async function initTossWidgets(
  clientKey: string,
  customerKey: string,
): Promise<TossWidgets> {
  await loadSdk();
  const factory = window.TossPayments;
  if (!factory) throw new Error("토스 SDK를 불러오지 못했어요.");
  const toss = factory(clientKey);
  return toss.widgets({ customerKey });
}
