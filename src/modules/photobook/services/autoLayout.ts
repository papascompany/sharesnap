// ⚠️ 서버 전용 모듈 — 'use client' 없음. Route Handler(src/app/api/storige/*)에서만 사용.
//
// 사진 자동배치 — Storige 편집세션 canvasData(내지별 사진 배치) 생성기.
//
// [좌표계 근거 — Storige canvas_data ground truth (실제 세션 덤프 기준)]
// - Storige 편집기는 Fabric.js 5.5.2를 사용한다. (version:"5.5.2")
// - 세션 canvasData = 페이지 배열: [표지, 내지1, 내지2, ...].
//   길이 = 표지(1) + 내지 수. canvasData[i] === null 이면 그 페이지는
//   templateSet 템플릿 기본을 유지한다 (embed.tsx: `if(saved[i]) loadFromJSON`).
//   → index 0(표지)은 null로 두어 표지 템플릿을 보존하고, 내지에만 사진을 배치한다.
// - 각 내지 페이지 = { version:"5.5.2", objects:[ WORKSPACE_RECT, IMAGE_OBJECT? ] }.
//   페이지 레벨 width/height는 없다 — workspace rect가 페이지 크기를 정의한다.
// - 단위 = px, 원점 = 워크스페이스 중심(0,0), originX/originY = "center".
// - 표시 해상도 DISPLAY_DPI = 150, 블리드 BLEED_MM = 3.
//   워크스페이스 px = (판형mm + BLEED_MM*2) * 150 / 25.4.
//   (실측 검증: A4 내지 (210+6)*150/25.4 = 1275.59 × (297+6)*150/25.4 = 1789.37 ✓)
// - 자동배치 사진은 사용자가 옮길 수 있어야 하므로 lock 속성 없이 selectable:true.
// - 결정적 출력만 생성한다 (랜덤/시간 사용 금지) — 동일 입력 → 동일 canvasData.

// ── 좌표계 상수 (ground truth) ─────────────────────────────────
/** Storige 편집기 표시 해상도 (DPI). 워크스페이스 px 환산 기준. */
export const DISPLAY_DPI = 150;
/** 인쇄 블리드 (mm). 판형 양쪽에 각각 더해진다. */
export const BLEED_MM = 3;

/** 1인치 = 25.4mm */
const MM_PER_INCH = 25.4;

// ── 타입 ───────────────────────────────────────────────────────
import type { ExternalPhoto } from "@/modules/photo/types";

/** 워크스페이스 px 크기 (블리드 포함). */
export interface WorkspacePx {
  /** 가로 px */
  Wpx: number;
  /** 세로 px */
  Hpx: number;
}

/** buildAutoLayoutCanvasData 옵션 */
export interface AutoLayoutOptions {
  /** 페이지 판형 가로 (mm) */
  pageWidthMm: number;
  /** 페이지 판형 세로 (mm) */
  pageHeightMm: number;
  /** 내지 페이지 수를 이 배수로 올림 (기본 4 — 4P 단위 제본). */
  pageStep?: number;
  /** 내지 최대 페이지 수 (지정 시 초과분 사진은 버림). */
  maxPages?: number;
}

// ── 워크스페이스 px 환산 ───────────────────────────────────────
/**
 * 판형(mm) → 워크스페이스 px (블리드 포함).
 * Wpx = (pageWidthMm + BLEED_MM*2) * DISPLAY_DPI / 25.4
 */
export function workspacePx(
  pageWidthMm: number,
  pageHeightMm: number,
): WorkspacePx {
  const Wpx = ((pageWidthMm + BLEED_MM * 2) * DISPLAY_DPI) / MM_PER_INCH;
  const Hpx = ((pageHeightMm + BLEED_MM * 2) * DISPLAY_DPI) / MM_PER_INCH;
  return { Wpx, Hpx };
}

// ── WORKSPACE_RECT 생성 ────────────────────────────────────────
/**
 * 페이지 크기를 정의하는 워크스페이스 사각형 (ground truth 속성 그대로).
 * 중심(0,0)·center 원점·흰 배경·잠금(선택 불가).
 */
export function makeWorkspaceRect(Wpx: number, Hpx: number) {
  return {
    type: "rect",
    version: "5.5.2",
    originX: "center",
    originY: "center",
    left: 0,
    top: 0,
    width: Wpx,
    height: Hpx,
    fill: "#fff",
    stroke: null,
    strokeWidth: 1,
    scaleX: 1,
    scaleY: 1,
    angle: 0,
    opacity: 1,
    visible: true,
    id: "workspace",
    selectable: false,
    hasControls: false,
    hasBorders: false,
    lockMovementX: true,
    lockMovementY: true,
    evented: true,
  };
}

// ── IMAGE_OBJECT 생성 ──────────────────────────────────────────
/**
 * 자동배치 사진 이미지 객체 (ground truth 속성 그대로, 사용자 편집 가능).
 *
 * - cover-fit: scale s = max(Wpx/iw, Hpx/ih) — 워크스페이스를 가득 채우도록 확대.
 * - 1페이지 1사진 풀블리드: 중심 배치 left = 0, top = 0.
 * - iw/ih(원본 px) 없으면 정사각 폴백(iw = ih = Wpx) → s = max(1, Wpx/Hpx).
 * - id는 결정적: "auto-" + index (랜덤 금지).
 * - src / externalPhotoUrl 모두 photo.url (Supabase public URL). crossOrigin 명시.
 */
export function makePhotoImage(
  photo: ExternalPhoto,
  Wpx: number,
  Hpx: number,
  index: number,
) {
  // 원본 px — 없으면 정사각(Wpx) 폴백
  const iw = photo.width && photo.width > 0 ? photo.width : Wpx;
  const ih = photo.height && photo.height > 0 ? photo.height : Wpx;

  // cover-fit scale — 워크스페이스를 빈틈없이 덮는 최소 확대율
  const s = Math.max(Wpx / iw, Hpx / ih);

  return {
    type: "image",
    version: "5.5.2",
    originX: "center",
    originY: "center",
    left: 0,
    top: 0,
    width: iw,
    height: ih,
    scaleX: s,
    scaleY: s,
    angle: 0,
    opacity: 1,
    visible: true,
    src: photo.url,
    crossOrigin: "anonymous",
    id: `auto-${index}`,
    externalPhotoUrl: photo.url,
    selectable: true,
    evented: true,
    hasControls: true,
    hasBorders: true,
  };
}

// ── 내지 페이지 (workspace + optional image) ───────────────────
/** 내지 한 페이지 Fabric JSON. 사진 없으면 빈 페이지(workspace만). */
function makeContentPage(
  Wpx: number,
  Hpx: number,
  photo: ExternalPhoto | undefined,
  imageIndex: number,
) {
  const objects: unknown[] = [makeWorkspaceRect(Wpx, Hpx)];
  if (photo) {
    objects.push(makePhotoImage(photo, Wpx, Hpx, imageIndex));
  }
  return { version: "5.5.2", objects };
}

// ── canvasData 빌더 ────────────────────────────────────────────
/**
 * 사진 배열 → Storige canvasData (페이지 배열) 생성.
 *
 * 출력 형태(결정적):
 *   [ null, contentPage1, contentPage2, ..., contentPageN ]
 *   - index 0 = null  → 표지: 템플릿 기본 유지 (사진 배치 안 함)
 *   - index 1..N      = 내지: 사진 1장당 1페이지 [workspace, image]
 *
 * 페이지 수 규칙:
 *   - 내지 페이지 수 = 사진 수를 pageStep(기본 4) 배수로 올림 (최소 pageStep).
 *   - 사진보다 페이지가 많으면 → 남는 페이지는 빈 페이지(workspace만).
 *   - maxPages 지정 시 내지 페이지 수를 그 값으로 자른다(초과 사진 버림).
 *
 * @returns canvasData: any[] (createEditSession에 그대로 전달)
 */
export function buildAutoLayoutCanvasData(
  photos: ExternalPhoto[],
  opts: AutoLayoutOptions,
): unknown[] {
  const pageStep = opts.pageStep ?? 4;
  const { Wpx, Hpx } = workspacePx(opts.pageWidthMm, opts.pageHeightMm);

  // 내지 페이지 수: 사진 수를 pageStep 배수로 올림, 최소 pageStep
  const step = pageStep > 0 ? pageStep : 1;
  let contentPageCount = Math.max(
    step,
    Math.ceil(photos.length / step) * step,
  );

  // maxPages 상한 적용 (지정 시) — 초과 사진은 버림
  if (typeof opts.maxPages === "number" && opts.maxPages > 0) {
    contentPageCount = Math.min(contentPageCount, opts.maxPages);
  }

  // [표지 null, 내지 N페이지]
  const canvasData: unknown[] = [null];
  for (let i = 0; i < contentPageCount; i++) {
    // i번째 내지에 i번째 사진 (없으면 빈 페이지). 결정적 매핑.
    canvasData.push(makeContentPage(Wpx, Hpx, photos[i], i));
  }

  return canvasData;
}
