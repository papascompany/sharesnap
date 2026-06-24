// 사진 프레임 — 실사 이미지(url)가 있으면 <img>, 없으면 SceneTile 폴백.
// 부모는 반드시 relative + overflow-hidden(+원하는 rounded) 이어야 한다(둘 다 absolute inset-0).

import { SceneTile, type SceneName } from "@/modules/landing/components/SceneTile";

export function PhotoFrame({
  url,
  scene,
  alt = "",
  scrim = 0.55,
  rounded,
  className = "",
}: {
  url?: string;
  scene: SceneName;
  alt?: string;
  scrim?: number;
  rounded?: boolean | string;
  className?: string;
}) {
  if (url) {
    return (
      <>
        {/* Supabase/외부 호스팅 이미지 — next/image remotePatterns 미설정으로 img 사용 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={alt}
          loading="lazy"
          className={`absolute inset-0 size-full object-cover ${className}`}
        />
        {/* 하단 스크림 — 캡션/배지 가독 */}
        <div
          className="absolute inset-0 bg-scrim-photo"
          style={{ opacity: scrim }}
          aria-hidden
        />
      </>
    );
  }
  return (
    <SceneTile scene={scene} scrim={scrim} rounded={rounded} className={className} />
  );
}
