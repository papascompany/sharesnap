"use client";

// 클라이언트 캔버스 기반 이미지 리사이즈 서비스
// 업로드 전 브라우저에서 인쇄용(3600px)/원본(2560px)/중간(1280px)/썸네일(400px 정사각) 4종 JPEG 생성

import type { ProcessedImage } from "@/modules/photo/types";

/** 인쇄용 최대 변 길이 (px) — Storige 300dpi 인쇄 정책: 긴변 3000~4000px 권장 (핸드오프 §6.1 D1-UX) */
const PRINT_MAX_PX = 3600;
/** 원본 최대 변 길이 (px) */
const ORIGINAL_MAX_PX = 2560;
/** 중간 해상도 최대 변 길이 (px) */
const MEDIUM_MAX_PX = 1280;
/** 썸네일 정사각 한 변 (px) */
const THUMBNAIL_PX = 400;

const PRINT_QUALITY = 0.85;
const ORIGINAL_QUALITY = 0.9;
const MEDIUM_QUALITY = 0.85;
const THUMBNAIL_QUALITY = 0.8;

/** canvas.toBlob 을 Promise 로 감싼 헬퍼 */
function canvasToJpegBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("이미지 변환에 실패했습니다."));
      },
      "image/jpeg",
      quality,
    );
  });
}

/** 최대 변 길이 기준으로 비율 유지 리사이즈 (업스케일 없음) */
async function resizeToBlob(
  bitmap: ImageBitmap,
  maxPx: number,
  quality: number,
): Promise<{ blob: Blob; width: number; height: number }> {
  const scale = Math.min(1, maxPx / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("캔버스 컨텍스트를 생성할 수 없습니다.");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob = await canvasToJpegBlob(canvas, quality);
  return { blob, width, height };
}

/** 중앙 기준 정사각 cover crop 썸네일 생성 */
async function cropSquareThumbnail(
  bitmap: ImageBitmap,
  sizePx: number,
  quality: number,
): Promise<Blob> {
  // 원본에서 중앙 정사각 영역을 잘라 sizePx × sizePx 로 축소 (cover)
  const srcSize = Math.min(bitmap.width, bitmap.height);
  const srcX = (bitmap.width - srcSize) / 2;
  const srcY = (bitmap.height - srcSize) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = sizePx;
  canvas.height = sizePx;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("캔버스 컨텍스트를 생성할 수 없습니다.");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, srcX, srcY, srcSize, srcSize, 0, 0, sizePx, sizePx);

  return canvasToJpegBlob(canvas, quality);
}

/**
 * 업로드 전 이미지 처리 — 인쇄용/원본/중간/썸네일 4종 JPEG Blob 생성
 *
 * - print: 최대 3600px, JPEG q0.85 — Storige 편집기 인쇄용(300dpi) 리사이즈본 (핸드오프 §6.1 D1-UX)
 * - original: 최대 2560px, JPEG q0.9
 * - medium: 최대 1280px, JPEG q0.85
 * - thumbnail: 400×400 정사각 cover crop, JPEG q0.8
 * - takenAt: 현재는 file.lastModified 기반 (EXIF DateTimeOriginal 파싱은 후속 작업)
 *
 * ⚠️ 메모리 주의: 3600px 인쇄용 캔버스는 비압축 RGBA 기준 최대 ~52MB(3600×3600×4)를
 * 점유한다. 모바일(특히 카톡 인앱 브라우저)에서 원본 비트맵 + 캔버스 다중 동시 생성 시
 * 메모리 압박으로 탭이 종료될 수 있으므로, 가장 큰 인쇄용 변환을 먼저 단독 수행해
 * 캔버스가 GC 대상이 된 뒤 나머지 3종을 처리한다 (동시 캔버스 피크 최소화).
 *
 * HEIC 등 브라우저 미지원 포맷은 createImageBitmap 단계에서 실패 → 안내 에러 발생
 */
export async function processImage(file: File): Promise<ProcessedImage> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // Safari 외 브라우저는 HEIC 디코딩 미지원 — 변환 라이브러리 도입 전까지 안내만
    throw new Error(
      "지원하지 않는 이미지 형식입니다. HEIC 사진은 JPEG로 변환 후 업로드해주세요.",
    );
  }

  try {
    // 1) 인쇄용(최대 캔버스)을 먼저 단독 처리 — 메모리 피크 분산
    const print = await resizeToBlob(bitmap, PRINT_MAX_PX, PRINT_QUALITY);

    // 2) 나머지 3종은 캔버스가 상대적으로 작아 병렬 처리
    const [original, medium, thumbnail] = await Promise.all([
      resizeToBlob(bitmap, ORIGINAL_MAX_PX, ORIGINAL_QUALITY),
      resizeToBlob(bitmap, MEDIUM_MAX_PX, MEDIUM_QUALITY),
      cropSquareThumbnail(bitmap, THUMBNAIL_PX, THUMBNAIL_QUALITY),
    ]);

    // TODO(후속): EXIF DateTimeOriginal 파싱으로 교체 — 현재는 파일 수정 시각 사용
    const takenAt = new Date(file.lastModified || Date.now()).toISOString();

    return {
      print: print.blob,
      original: original.blob,
      medium: medium.blob,
      thumbnail,
      width: original.width,
      height: original.height,
      takenAt,
    };
  } finally {
    bitmap.close();
  }
}
