"use client";

// 사진 모듈 핵심 서비스 — Storage 업로드/삭제 + photos/photo_comments 테이블 CRUD

import { createClient } from "@/modules/shared/lib/supabase/client";
import {
  STORAGE_BUCKETS,
  MAX_PHOTO_SIZE_MB,
} from "@/modules/shared/lib/constants";
import { processImage } from "@/modules/photo/services/imageProcessor";
import type {
  Photo,
  PhotoRow,
  PhotoComment,
  PhotoUploadResult,
} from "@/modules/photo/types";

type PhotoBucket =
  | typeof STORAGE_BUCKETS.PHOTOS
  | typeof STORAGE_BUCKETS.THUMBNAILS;

/** 원본 서명 URL 유효시간 (초) */
const SIGNED_URL_EXPIRES_IN = 3600;

// ===== URL 헬퍼 =====

/**
 * Storage 경로 → 표시용 URL
 * - thumbnails 버킷(공개): getPublicUrl
 * - photos 버킷(원본, 비공개): createSignedUrl(3600초)
 */
export async function getPhotoUrl(
  path: string,
  bucket: PhotoBucket = STORAGE_BUCKETS.THUMBNAILS,
): Promise<string> {
  const supabase = createClient();
  if (bucket === STORAGE_BUCKETS.THUMBNAILS) {
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_EXPIRES_IN);
  if (error) throw error;
  return data.signedUrl;
}

/** thumbnails 버킷 public URL (동기) — 목록 매핑용 */
function thumbnailPublicUrl(path: string | null): string | null {
  if (!path) return null;
  const supabase = createClient();
  return supabase.storage
    .from(STORAGE_BUCKETS.THUMBNAILS)
    .getPublicUrl(path).data.publicUrl;
}

/** PhotoRow → Photo (파생 URL 포함) 매핑 — Realtime payload 변환에도 사용 */
export function toPhoto(row: PhotoRow): Photo {
  return {
    ...row,
    thumbnailUrl: thumbnailPublicUrl(row.thumbnail_path),
    mediumUrl: thumbnailPublicUrl(row.medium_path),
    // 인쇄용(3600px)도 공개 thumbnails 버킷 — public URL이라 만료 없음 (Storige externalPhotos 요건)
    printUrl: thumbnailPublicUrl(row.print_path),
  };
}

// ===== 업로드 =====

/**
 * 사진 1장 업로드 E2E
 * 1) 클라이언트 리사이즈 (인쇄용 3600 / 원본 2560 / 중간 1280 / 썸네일 400 정사각)
 * 2) Storage 업로드 — photos 버킷에 원본, thumbnails 버킷(공개)에 thumb+medium+print
 *    ⚠️ RLS가 경로의 1번째 폴더 = auth.uid() 를 검사하므로 반드시 userId가 첫 세그먼트
 *    ⚠️ 인쇄용은 Storige 편집기가 만료 없는 URL로 fetch해야 하므로 public 버킷 필수
 *       (signed URL 금지 — 핸드오프 §6.3 사진 URL 수명)
 * 3) photos 테이블 insert (print_path 포함)
 * 4) messages 테이블에 type:'photo' 메시지 insert (채팅 연동)
 *
 * onProgress: 0~100 단계별 진행률 콜백 (Supabase가 바이트 단위 진행률을
 * 제공하지 않으므로 단계 기반으로 보고)
 */
export async function uploadPhoto(
  roomId: string,
  file: File,
  onProgress?: (progress: number) => void,
): Promise<PhotoUploadResult> {
  // 용량 검사
  if (file.size > MAX_PHOTO_SIZE_MB * 1024 * 1024) {
    throw new Error(`사진 용량은 최대 ${MAX_PHOTO_SIZE_MB}MB까지 가능합니다.`);
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  onProgress?.(5);

  // 1) 클라이언트 리사이즈
  const processed = await processImage(file);
  onProgress?.(25);

  // 2) Storage 업로드 — {userId}/{roomId}/{uuid}.jpg (userId가 첫 세그먼트, RLS 필수)
  const photoId = crypto.randomUUID();
  const basePath = `${user.id}/${roomId}/${photoId}`;
  const originalPath = `${basePath}.jpg`;
  const thumbnailPath = `${basePath}_thumb.jpg`;
  const mediumPath = `${basePath}_medium.jpg`;
  // 인쇄용 — 공통 계약 경로: {userId}/{roomId}/print/{uuid}.jpg (thumbnails 공개 버킷)
  const printPath = `${user.id}/${roomId}/print/${photoId}.jpg`;

  // 실패 시 정리할 업로드 완료 목록
  const uploaded: { bucket: PhotoBucket; path: string }[] = [];
  const cleanupStorage = async () => {
    // 베스트 에포트 정리 — 실패해도 원래 에러를 우선 던진다
    await Promise.allSettled(
      uploaded.map(({ bucket, path }) =>
        supabase.storage.from(bucket).remove([path]),
      ),
    );
  };

  try {
    const uploadOptions = { contentType: "image/jpeg", upsert: false };

    const { error: originalError } = await supabase.storage
      .from(STORAGE_BUCKETS.PHOTOS)
      .upload(originalPath, processed.original, uploadOptions);
    if (originalError) throw originalError;
    uploaded.push({ bucket: STORAGE_BUCKETS.PHOTOS, path: originalPath });
    onProgress?.(45);

    // 인쇄용(3600px) — 공개 버킷이라 getPublicUrl 즉시 사용 가능 (만료 없음)
    const { error: printError } = await supabase.storage
      .from(STORAGE_BUCKETS.THUMBNAILS)
      .upload(printPath, processed.print, uploadOptions);
    if (printError) throw printError;
    uploaded.push({ bucket: STORAGE_BUCKETS.THUMBNAILS, path: printPath });
    onProgress?.(60);

    const { error: mediumError } = await supabase.storage
      .from(STORAGE_BUCKETS.THUMBNAILS)
      .upload(mediumPath, processed.medium, uploadOptions);
    if (mediumError) throw mediumError;
    uploaded.push({ bucket: STORAGE_BUCKETS.THUMBNAILS, path: mediumPath });
    onProgress?.(70);

    const { error: thumbError } = await supabase.storage
      .from(STORAGE_BUCKETS.THUMBNAILS)
      .upload(thumbnailPath, processed.thumbnail, uploadOptions);
    if (thumbError) throw thumbError;
    uploaded.push({ bucket: STORAGE_BUCKETS.THUMBNAILS, path: thumbnailPath });
    onProgress?.(80);

    // 3) photos 테이블 insert
    const { data: photoRow, error: insertError } = await supabase
      .from("photos")
      .insert({
        id: photoId,
        room_id: roomId,
        user_id: user.id,
        storage_path: originalPath,
        thumbnail_path: thumbnailPath,
        medium_path: mediumPath,
        print_path: printPath,
        original_filename: file.name,
        width: processed.width,
        height: processed.height,
        file_size: processed.original.size,
        taken_at: processed.takenAt,
      })
      .select("*")
      .single();
    if (insertError) throw insertError;
    onProgress?.(90);

    // 4) 채팅 메시지 insert (type: photo) — 갤러리 업로드가 채팅에도 노출
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .insert({
        room_id: roomId,
        user_id: user.id,
        type: "photo",
        photo_id: photoRow.id,
      })
      .select("id")
      .single();
    if (messageError) throw messageError;

    onProgress?.(100);
    return { photo: toPhoto(photoRow as PhotoRow), messageId: message.id };
  } catch (err) {
    await cleanupStorage();
    throw err;
  }
}

// ===== 사진 CRUD =====

/** 방의 사진 목록 (최신순) */
export async function listPhotos(roomId: string): Promise<Photo[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("photos")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as PhotoRow[]).map(toPhoto);
}

/** 단일 사진 조회 — 채팅 사진 메시지 썸네일 연동용 (없거나 삭제됐으면 null) */
export async function getPhotoById(photoId: string): Promise<Photo | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("photos")
    .select("*")
    .eq("id", photoId)
    .maybeSingle();
  if (error) throw error;
  return data ? toPhoto(data as PhotoRow) : null;
}

/** 사진 삭제 — Storage(원본+썸네일+중간+인쇄용) 제거 포함 */
export async function deletePhoto(photoId: string): Promise<void> {
  const supabase = createClient();

  // 경로 확보를 위해 먼저 조회
  const { data, error } = await supabase
    .from("photos")
    .select("*")
    .eq("id", photoId)
    .single();
  if (error) throw error;
  const row = data as PhotoRow;

  // Storage 제거 — 실패해도 DB 삭제는 진행 (DB가 단일 진실 소스, 고아 파일은 후속 정리)
  // thumbnails 버킷 소속 3종: 썸네일 + 중간 + 인쇄용(3600px, 공개 URL)
  // ⚠ Supabase Storage `.remove()`는 RLS 위반/부분 실패 시에도 reject하지 않고 { error }로 resolve한다.
  //   → allSettled의 rejected만 보면 침묵 실패한다(감사 P0-D). error를 명시적으로 throw해 관측한다.
  const thumbnailPaths = [
    row.thumbnail_path,
    row.medium_path,
    row.print_path,
  ].filter((p): p is string => Boolean(p));

  const removeFromBucket = async (
    bucket: string,
    paths: string[],
  ): Promise<void> => {
    if (paths.length === 0) return;
    const { error: removeError } = await supabase.storage
      .from(bucket)
      .remove(paths);
    if (removeError) throw removeError;
  };

  const results = await Promise.allSettled([
    removeFromBucket(STORAGE_BUCKETS.PHOTOS, [row.storage_path]),
    removeFromBucket(STORAGE_BUCKETS.THUMBNAILS, thumbnailPaths),
  ]);
  results.forEach((r) => {
    if (r.status === "rejected") {
      // 공개 썸네일이 잔존하면 삭제한 사진이 URL로 계속 노출된다 — warn이 아닌 error로 승격
      console.error("사진 Storage 정리 실패(공개 파일 잔존 가능):", r.reason);
    }
  });

  // DB row 삭제 (messages.photo_id 는 FK ON DELETE SET NULL 가정)
  const { error: deleteError } = await supabase
    .from("photos")
    .delete()
    .eq("id", photoId);
  if (deleteError) throw deleteError;
}

/** 포토북 선택 토글 */
export async function toggleBookSelection(
  photoId: string,
  value: boolean,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("photos")
    .update({ is_selected_for_book: value })
    .eq("id", photoId);
  if (error) throw error;
}

// ===== 코멘트 =====

/** 사진 코멘트 목록 (오래된 순) */
export async function listComments(photoId: string): Promise<PhotoComment[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("photo_comments")
    .select("*")
    .eq("photo_id", photoId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as PhotoComment[];
}

/** 코멘트 추가 */
export async function addComment(
  photoId: string,
  content: string,
): Promise<PhotoComment> {
  const trimmed = content.trim();
  if (!trimmed) throw new Error("코멘트 내용을 입력해주세요.");

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const { data, error } = await supabase
    .from("photo_comments")
    .insert({ photo_id: photoId, user_id: user.id, content: trimmed })
    .select("*")
    .single();
  if (error) throw error;
  return data as PhotoComment;
}

/** 코멘트 삭제 */
export async function deleteComment(commentId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("photo_comments")
    .delete()
    .eq("id", commentId);
  if (error) throw error;
}
