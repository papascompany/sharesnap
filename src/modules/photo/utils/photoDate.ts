// 사진 날짜 유틸 — 타임라인 그룹핑/뷰어 날짜 라벨 공용 (순수 함수)

import type { Photo } from "@/modules/photo/types";

/** 날짜별 사진 그룹 (타임라인 모드) */
export interface PhotoDateGroup {
  /** 로컬 타임존 기준 yyyy-MM-dd — 정렬/React key 용 */
  key: string;
  /** 표시용 라벨 (예: "5월 24일 토요일") */
  label: string;
  photos: Photo[];
}

/** 사진의 기준 시각 — taken_at 우선, 없으면 created_at */
export function getPhotoDate(photo: Photo): Date {
  return new Date(photo.taken_at ?? photo.created_at);
}

/** 로컬 타임존 기준 yyyy-MM-dd 키 */
function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 한국어 날짜 라벨 — 올해면 연도 생략 (예: "5월 24일 토요일") */
export function formatPhotoDateLabel(date: Date): string {
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return new Intl.DateTimeFormat("ko-KR", {
    ...(sameYear ? {} : { year: "numeric" as const }),
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(date);
}

/**
 * 날짜별 그룹핑 — 그룹은 최신 날짜 우선, 그룹 내부는 촬영 시각 내림차순.
 * (입력 photos는 created_at 내림차순이지만 taken_at 기준으로는 어긋날 수 있어 재정렬)
 */
export function groupPhotosByDate(photos: Photo[]): PhotoDateGroup[] {
  const map = new Map<string, PhotoDateGroup>();

  for (const photo of photos) {
    const date = getPhotoDate(photo);
    const key = toDateKey(date);
    let group = map.get(key);
    if (!group) {
      group = { key, label: formatPhotoDateLabel(date), photos: [] };
      map.set(key, group);
    }
    group.photos.push(photo);
  }

  const groups = [...map.values()];
  for (const group of groups) {
    group.photos.sort(
      (a, b) => getPhotoDate(b).getTime() - getPhotoDate(a).getTime(),
    );
  }
  groups.sort((a, b) => (a.key < b.key ? 1 : -1));
  return groups;
}
