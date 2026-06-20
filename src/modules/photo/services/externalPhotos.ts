"use client";

// Storige 편집기 externalPhotos 어댑터
//
// Storige 세션 metadata.externalPhotos 형식(핸드오프 §6.1 D1 ①)으로 공유방 사진을 변환한다.
// Storige 측 D1(외부 사진 주입 — 이미지 패널 "공유방 사진" 탭) 구현이 완료되면
// 세션 생성/PATCH 시 이 결과를 그대로 주입하면 되는, 바로 쓸 수 있는 어댑터다.
//
// 정책 (핸드오프 §6.1 D1-UX 인쇄해상도, §6.3 사진 URL 수명):
// - url: 인쇄용 리사이즈본(긴변 3600px, public URL — 만료 없음) 우선,
//   print 본이 없는 과거 업로드 사진은 mediumUrl(1280px) 폴백
// - thumbnailUrl: ~300px 패널 목록용 (현재 400px 정사각 썸네일 사용)
// - 편집기가 로드 시점에 fetch하므로 만료되는 signed URL은 절대 포함하지 않는다

import type { ExternalPhoto, Photo } from "@/modules/photo/types";

/**
 * 공유방 사진 목록 → Storige externalPhotos 배열 변환
 *
 * - printUrl 우선, 없으면 mediumUrl 폴백 (둘 다 없으면 주입 불가 → 제외)
 * - name: 원본 파일명, 없으면 사진 id 기반 대체명
 * - thumbnailUrl: 400px 정사각 public URL (Storige 권장 ~300px 수준, 없으면 생략)
 */
export function buildExternalPhotos(photos: Photo[]): ExternalPhoto[] {
  const result: ExternalPhoto[] = [];

  for (const photo of photos) {
    // 인쇄용 우선 → 중간 해상도 폴백 (print_path 도입 전 업로드분 호환)
    const url = photo.printUrl ?? photo.mediumUrl;
    if (!url) continue; // 주입 가능한 public URL이 없는 사진은 제외

    result.push({
      url,
      name: photo.original_filename ?? `photo-${photo.id}.jpg`,
      ...(photo.thumbnailUrl ? { thumbnailUrl: photo.thumbnailUrl } : {}),
      // 원본 px — 자동배치 cover-fit scale 계산용 (null이면 생략 → 정사각 폴백)
      ...(photo.width != null ? { width: photo.width } : {}),
      ...(photo.height != null ? { height: photo.height } : {}),
    });
  }

  return result;
}
