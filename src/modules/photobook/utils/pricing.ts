// 포토북 가격 정책
//
// ⚠️ PLACEHOLDER — 아래 정가는 임시값이다. 실제 인쇄 원가·마진을 반영해
//    운영자가 확정한 뒤 교체해야 한다. 가격 "구조"(기본가 + 페이지당 단가 × 수량)는
//    확정이라 값만 바꾸면 된다. 결제 연동(트랙 B4) 시 이 함수로 청구금액을 산출한다.

import type { BookSize } from "@/modules/shared/types/global";

/**
 * 판형별 가격 구성(원).
 * - base: 제본·표지 등 고정비
 * - perPage: 내지 1페이지당 단가
 * ⚠️ 값은 임시(placeholder) — 운영자 확정 필요.
 */
export const PHOTOBOOK_PRICES: Record<
  BookSize,
  { base: number; perPage: number }
> = {
  A4: { base: 18000, perPage: 600 },
  A5: { base: 14000, perPage: 450 },
  "210x210": { base: 20000, perPage: 700 },
};

/**
 * 포토북 예상가(원) = (기본가 + 페이지당단가 × 페이지수) × 수량.
 * 음수/0 방어. 결제 확정가는 주문 시점에 total_price로 별도 저장한다.
 */
export function calculatePhotobookPrice(
  bookSize: BookSize,
  pageCount: number,
  quantity = 1,
): number {
  const p = PHOTOBOOK_PRICES[bookSize];
  const pages = Math.max(0, Math.floor(pageCount));
  const qty = Math.max(1, Math.floor(quantity));
  return (p.base + p.perPage * pages) * qty;
}

/** 원화 표기: 12000 → "12,000원" */
export function formatKRW(won: number): string {
  return `${Math.round(won).toLocaleString("ko-KR")}원`;
}
