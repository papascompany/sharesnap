// 사진 모듈(M4) 타입 정의

import type { Database } from "@/modules/shared/types/database";

// ===== DB Row/Insert 재수출 =====
export type PhotoRow = Database["public"]["Tables"]["photos"]["Row"];
export type PhotoInsert = Database["public"]["Tables"]["photos"]["Insert"];
export type PhotoCommentRow =
  Database["public"]["Tables"]["photo_comments"]["Row"];
export type PhotoCommentInsert =
  Database["public"]["Tables"]["photo_comments"]["Insert"];

/** 화면에서 사용하는 사진 모델 — Storage URL 파생 필드 포함 */
export interface Photo extends PhotoRow {
  /** thumbnails 버킷 public URL (400px 정사각) */
  thumbnailUrl: string | null;
  /** thumbnails 버킷 public URL (1280px 중간 해상도) */
  mediumUrl: string | null;
  /**
   * thumbnails 버킷 public URL (긴변 3600px 인쇄용 리사이즈본)
   * Storige 편집기 externalPhotos 주입용 — public URL이므로 만료 없음 (핸드오프 §6.3)
   */
  printUrl: string | null;
}

/** 사진 코멘트 — 향후 프로필 조인 필드 확장용 */
export interface PhotoComment extends PhotoCommentRow {
  authorName?: string | null;
  authorAvatarUrl?: string | null;
}

/**
 * Storige 편집기 세션 metadata.externalPhotos 항목 형식 (핸드오프 §6.1 D1 ①)
 * url은 편집기가 로드 시점에 fetch — 만료되는 signed URL 금지, public URL만 사용
 */
export interface ExternalPhoto {
  /** 인쇄 품질 이미지 public URL (printUrl 우선, 없으면 mediumUrl 폴백) */
  url: string;
  /** 편집기 이미지 패널 표시용 이름 */
  name: string;
  /** ~300px 썸네일 public URL (패널 목록 lazy-load용, 선택) */
  thumbnailUrl?: string;
  /** 업로더 표시명 (프로필 조인 부재 시 생략, 핸드오프 §3.1 선택 항목) */
  uploaderName?: string;
  /** 업로드/촬영 시각 ISO 문자열 (taken_at ?? created_at, 선택) */
  uploadedAt?: string;
}

// ===== 이미지 처리 =====

/** processImage() 결과 — 인쇄용/원본/중간/썸네일 4종 Blob */
export interface ProcessedImage {
  /** 최대 3600px JPEG (q0.85) — thumbnails 버킷(공개) 인쇄용 업로드 (Storige 300dpi 정책) */
  print: Blob;
  /** 최대 2560px JPEG (q0.9) — photos 버킷 업로드용 */
  original: Blob;
  /** 최대 1280px JPEG (q0.85) — thumbnails 버킷 업로드용 */
  medium: Blob;
  /** 400×400 정사각 cover crop JPEG (q0.8) — thumbnails 버킷 업로드용 */
  thumbnail: Blob;
  /** 리사이즈된 원본 기준 가로 px */
  width: number;
  /** 리사이즈된 원본 기준 세로 px */
  height: number;
  /** 촬영 시각 ISO 문자열 (현재 file.lastModified 기반, EXIF 파싱은 후속) */
  takenAt: string;
}

// ===== 업로드 큐 =====

export type UploadStatus =
  | "pending" // 대기 중
  | "processing" // 클라이언트 리사이즈 중
  | "uploading" // Storage/DB 업로드 중
  | "done" // 완료
  | "error"; // 실패 (재시도 가능)

/** 업로드 큐 항목 (usePhotoUpload 내부 상태) */
export interface UploadQueueItem {
  /** 큐 항목 고유 id (클라이언트 생성 uuid) */
  id: string;
  file: File;
  status: UploadStatus;
  /** 0~100 진행률 */
  progress: number;
  /** status === "error" 일 때 사용자 표시용 메시지 */
  error?: string;
  /** status === "done" 일 때 업로드 결과 사진 */
  photo?: Photo;
}

/** uploadPhoto() 결과 — 사진 + 연결된 채팅 메시지 id */
export interface PhotoUploadResult {
  photo: Photo;
  /** messages 테이블에 함께 생성된 type:'photo' 메시지 id */
  messageId: string;
}
