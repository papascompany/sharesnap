// 결제 도메인 타입 — 토스페이먼츠 v2 (마이그레이션 012 payments)

import type { Database } from "@/modules/shared/types/database";
import type { ShippingAddress } from "@/modules/shared/types/global";

export type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];

/** 결제 대상 주문 종류 */
export type OrderKind = "photobook" | "print";

export type PaymentStatus = "ready" | "paid" | "canceled" | "failed";

/** 체크아웃 요청 — 배송지 + 수령인 */
export interface CheckoutInput {
  orderKind: OrderKind;
  orderId: string;
  recipientName: string;
  recipientPhone: string;
  address: ShippingAddress;
  memo?: string;
}

/**
 * /api/payments/checkout 응답 — 클라이언트가 토스 위젯을 띄우는 데 필요한 값.
 * 금액(amount)은 반드시 서버가 산출한다(클라이언트 위변조 방지).
 */
export interface CheckoutSession {
  clientKey: string;
  customerKey: string;
  merchantOrderId: string;
  amount: number;
  orderName: string;
  customerEmail: string | null;
  customerName: string;
  successUrl: string;
  failUrl: string;
}

// 클라이언트 도메인 모델
export interface Payment {
  id: string;
  userId: string;
  orderKind: OrderKind;
  orderId: string;
  provider: string;
  merchantOrderId: string;
  amount: number;
  status: PaymentStatus;
  paymentKey: string | null;
  method: string | null;
  receiptUrl: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
