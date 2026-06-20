// 300dpi 단일 소스 — 책 사이즈 ↔ 픽셀 변환 유틸
// CLAUDE.md 절대 규칙 3: 항상 이 파일만 사용

import type { BookSize } from "@/modules/shared/types/global";
import { BOOK_SIZES, BLEED_MM, SAFE_MARGIN_MM, DPI } from "@/modules/shared/lib/constants";

export interface PixelSize {
  width: number;
  height: number;
}

export interface BookCanvasSize extends PixelSize {
  // 블리드 포함 전체 캔버스 사이즈
  bleed: number;
  // 안전영역 시작 좌표
  safeOffset: number;
  // 안전영역 내부 사이즈
  safeWidth: number;
  safeHeight: number;
}

// 1mm = (DPI / 25.4) px — 300dpi 기준 1mm ≈ 11.811px
export const MM_PER_INCH = 25.4;
export const PX_PER_MM = DPI / MM_PER_INCH;

export function mmToPixels(mm: number): number {
  return Math.round(mm * PX_PER_MM);
}

export function pixelsToMm(px: number): number {
  return px / PX_PER_MM;
}

export function getPixelSize(size: BookSize): PixelSize {
  const { widthMm, heightMm } = BOOK_SIZES[size];
  return {
    width: mmToPixels(widthMm),
    height: mmToPixels(heightMm),
  };
}

// 블리드 + 안전영역 포함 캔버스 정보
export function getBookCanvasSize(size: BookSize): BookCanvasSize {
  const { widthMm, heightMm } = BOOK_SIZES[size];
  const bleed = mmToPixels(BLEED_MM);
  const safeOffset = mmToPixels(SAFE_MARGIN_MM);
  const width = mmToPixels(widthMm + BLEED_MM * 2);
  const height = mmToPixels(heightMm + BLEED_MM * 2);

  return {
    width,
    height,
    bleed,
    safeOffset: safeOffset + bleed,
    safeWidth: mmToPixels(widthMm - SAFE_MARGIN_MM * 2),
    safeHeight: mmToPixels(heightMm - SAFE_MARGIN_MM * 2),
  };
}

// 화면 표시용 축소 배율 계산 (캔버스를 실제 픽셀로 다루면 너무 크므로)
export function getDisplayScale(
  canvasSize: PixelSize,
  viewportWidth: number,
  viewportHeight: number,
): number {
  const scaleX = viewportWidth / canvasSize.width;
  const scaleY = viewportHeight / canvasSize.height;
  return Math.min(scaleX, scaleY, 1);
}
