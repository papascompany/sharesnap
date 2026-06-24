// 사진 인화 주문(M7) 도메인 타입 — print_orders / print_order_items (마이그레이션 004 + 012)

import type { Database } from "@/modules/shared/types/database";
import type { PrintSize, PrintPaper } from "@/modules/print-order/utils/pricing";

export type PrintOrderRow = Database["public"]["Tables"]["print_orders"]["Row"];
export type PrintOrderItemRow =
  Database["public"]["Tables"]["print_order_items"]["Row"];
export type PrintOrderStatus = PrintOrderRow["status"];

/** 주문서 생성 입력 — 사진 1장당 옵션 */
export interface NewPrintItem {
  photoId: string;
  size: PrintSize;
  paper: PrintPaper;
  quantity: number;
}

// 클라이언트 도메인 모델
export interface PrintOrder {
  id: string;
  userId: string;
  roomId: string | null;
  status: PrintOrderStatus;
  totalPrice: number;
  recipientName: string;
  recipientPhone: string;
  memo: string | null;
  createdAt: string;
  /** 총 인화 매수 */
  itemCount: number;
}

/** 목록 표시용 — 방 이름 + 대표 썸네일 */
export interface PrintOrderListItem extends PrintOrder {
  roomName: string | null;
  thumbnailUrl: string | null;
}

/** 상세(체크아웃 요약)용 — 항목별 사진/옵션 */
export interface PrintOrderItem {
  id: string;
  photoId: string;
  size: PrintSize;
  paper: PrintPaper;
  quantity: number;
  unitPrice: number;
  thumbnailUrl: string | null;
}
