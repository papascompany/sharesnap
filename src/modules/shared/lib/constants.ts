// 프로젝트 전역 상수

import type { BookSize } from "@/modules/shared/types/global";

export const APP_NAME = "ShareSnap";
// || — 빈 문자열 env도 폴백(공유링크·OG·webhook origin 깨짐 방지)
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// 300dpi 기준 책 사이즈 (mm)
export const BOOK_SIZES: Record<
  BookSize,
  { widthMm: number; heightMm: number; label: string }
> = {
  A4: { widthMm: 210, heightMm: 297, label: "A4 (210×297mm)" },
  A5: { widthMm: 148, heightMm: 210, label: "A5 (148×210mm)" },
  "210x210": { widthMm: 210, heightMm: 210, label: "정사각 (210×210mm)" },
};

// 인쇄 안전영역/블리드 (mm)
export const BLEED_MM = 3;
export const SAFE_MARGIN_MM = 5;
export const DPI = 300;

// Supabase Storage 버킷
export const STORAGE_BUCKETS = {
  PHOTOS: "photos",
  THUMBNAILS: "thumbnails",
  RESOURCES: "resources",
  PDFS: "pdfs",
} as const;

// Realtime 채널 네이밍 규칙
export const realtimeChannel = (roomId: string) => `room:${roomId}`;

// 사진 업로드 제한
export const MAX_PHOTO_SIZE_MB = 20;
export const MAX_PHOTOS_PER_UPLOAD = 30;

// 악용 방어 상한 (감사 P1) — 정상 사용자(여행 1회 수백 장)는 체감하지 않는 값으로 시작.
// 방 인원 상한(ROOM_MAX_MEMBERS)은 join RPC 내부(마이그 014)에서 강제 — 여기 값은 참고/문구용.
export const ROOM_MAX_MEMBERS = 100;
export const ROOM_MAX_PHOTOS = 2000; // 방당 누적 사진 총량
export const MAX_ROOMS_PER_USER = 20; // 사용자당 생성 가능 방 개수

// 포토북 페이지 수 제한
export const PHOTOBOOK_PAGE_MIN = 8;
export const PHOTOBOOK_PAGE_MAX = 80;

// 갤러리 포토북 넛지 임계 — 사진이 이만큼 모이면 "포토북 만들기" 배너 노출(감사 P1/P2 전환)
export const PHOTOBOOK_NUDGE_THRESHOLD = 20;

// 공유방 share_code 길이
export const SHARE_CODE_LENGTH = 8;

// Storige 편집세션 dev 템플릿셋 ID
// dev 배선용 상수 — 실제 포토북 templateSet은 Storige가 별도 제공한다.
// 운영에서는 env STORIGE_TEMPLATE_SET_ID로 오버라이드 (getTemplateSetId() 참조)
export const STORIGE_DEV_TEMPLATE_SET_ID =
  "a2cc2939-b76d-41a2-bd41-2d9fba091a24";

// 자동배치 기본 페이지 판형 (mm) — Storige 포토북 자동편집 시 워크스페이스 크기 산출에 사용.
// 정사각 210×210 기본. 운영에서는 env STORIGE_PHOTOBOOK_PAGE_W_MM / _H_MM 로 오버라이드.
// (env 값은 route 단에서 parse 후 buildAutoLayoutCanvasData에 주입)
export const STORIGE_PHOTOBOOK_PAGE_W_MM = 210;
export const STORIGE_PHOTOBOOK_PAGE_H_MM = 210;
