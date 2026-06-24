// 관리자(M9) 주문 대시보드 타입

import type { OrderKind } from "@/modules/payment/types";

/** 대시보드 통합 주문 행(포토북 + 인화). */
export interface AdminOrder {
  kind: OrderKind;
  id: string;
  /** 요약 라벨(포토북 #주문번호 / 인화 N매) */
  label: string;
  /** 부가 정보(방 이름 등) */
  sub: string | null;
  status: string;
  amount: number | null;
  recipientName: string | null;
  recipientPhone: string | null;
  shippingText: string | null;
  paymentStatus: string | null;
  paymentMethod: string | null;
  createdAt: string;
  paidAt: string | null;
}
