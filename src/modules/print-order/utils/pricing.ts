// 사진 인화 가격 정책
//
// ⚠️ PLACEHOLDER — 아래 단가는 임시값이다. 실제 인화 원가·마진을 반영해
//    운영자가 확정한 뒤 교체해야 한다. 가격 "구조"(사이즈 기본가 + 용지 추가금) × 수량)는
//    확정이라 값만 바꾸면 된다. 결제 시 서버가 이 함수로 청구금액을 재산출한다(클라 위변조 방지).

/** 인화 사이즈별 기본 단가(원, 1매). */
export const PRINT_SIZES = {
  "4x6": { label: "4×6 (10×15cm)", base: 250 },
  "5x7": { label: "5×7 (13×18cm)", base: 500 },
  "8x10": { label: "8×10 (20×25cm)", base: 1500 },
  square: { label: "정사각 (15×15cm)", base: 700 },
} as const;

export type PrintSize = keyof typeof PRINT_SIZES;

/** 용지(마감)별 추가금(원, 1매). */
export const PRINT_PAPERS = {
  glossy: { label: "유광", surcharge: 0 },
  matte: { label: "무광", surcharge: 100 },
} as const;

export type PrintPaper = keyof typeof PRINT_PAPERS;

/** 기본 인화 옵션 — 새 항목 추가 시 사용 */
export const DEFAULT_PRINT_SIZE: PrintSize = "4x6";
export const DEFAULT_PRINT_PAPER: PrintPaper = "glossy";

/**
 * 배송비(원). ⚠️ placeholder — 운영자 확정 필요.
 * 일정 금액 이상 무료배송 임계도 운영자 정책으로 추후 도입.
 */
export const PRINT_SHIPPING_FEE = 3000;

/** 인화 1매 단가 = 사이즈 기본가 + 용지 추가금. */
export function printUnitPrice(size: PrintSize, paper: PrintPaper): number {
  const s = PRINT_SIZES[size] ?? PRINT_SIZES[DEFAULT_PRINT_SIZE];
  const p = PRINT_PAPERS[paper] ?? PRINT_PAPERS[DEFAULT_PRINT_PAPER];
  return s.base + p.surcharge;
}

export interface PrintItemSpec {
  size: PrintSize;
  paper: PrintPaper;
  quantity: number;
}

/** 인화 상품가 합계(배송비 제외) = Σ(단가 × 수량). 음수/0 방어. */
export function calculatePrintSubtotal(items: PrintItemSpec[]): number {
  return items.reduce((sum, it) => {
    const qty = Math.max(0, Math.floor(it.quantity));
    return sum + printUnitPrice(it.size, it.paper) * qty;
  }, 0);
}

/** 인화 총액 = 상품가 + 배송비(상품가 0이면 0). */
export function calculatePrintTotal(items: PrintItemSpec[]): number {
  const subtotal = calculatePrintSubtotal(items);
  return subtotal > 0 ? subtotal + PRINT_SHIPPING_FEE : 0;
}

/** 인화 옵션 유효성 — 알 수 없는 사이즈/용지 방어. */
export function isPrintSize(v: string): v is PrintSize {
  return v in PRINT_SIZES;
}
export function isPrintPaper(v: string): v is PrintPaper {
  return v in PRINT_PAPERS;
}
