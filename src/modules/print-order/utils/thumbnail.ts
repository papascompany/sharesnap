// thumbnails 버킷(공개) public URL 빌더 — 서버/클라 공용(순수 함수, 'use client' 없음).
// photoService.toPhoto는 'use client'라 서버 컴포넌트에서 못 쓰므로, 결정적 URL을 직접 조립한다.

export function thumbnailPublicUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base.replace(/\/+$/, "")}/storage/v1/object/public/thumbnails/${path}`;
}
