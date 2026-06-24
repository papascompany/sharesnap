// 랜딩 콘텐츠 모델 — 어드민(CMS)에서 편집 가능한 문구/이미지.
// DB(site_content key='landing')에 JSON으로 저장하며, 비어있으면 아래 기본값을 사용한다.
// 사진 슬롯은 url(실사 이미지)이 있으면 그것을, 없으면 scene(스타일라이즈드 SceneTile)을 폴백 렌더한다.

import type { SceneName } from "@/modules/landing/components/SceneTile";

/** 사진 슬롯: 실사 이미지 URL(우선) + 폴백 씬 + 캡션. */
export interface PhotoSlot {
  /** 실사 이미지 URL. 비면 scene 폴백 */
  url: string;
  /** 폴라로이드/타일 캡션 */
  caption: string;
  /** url 없을 때 폴백 SceneTile */
  scene: SceneName;
  /** (bento 전용) 우상단 메타 배지 텍스트 */
  meta?: string;
}

export interface LandingContent {
  hero: {
    eyebrow: string;
    /** 줄바꿈은 \n 으로 */
    headline: string;
    subhead: string;
    microcopy: string;
  };
  /** 히어로 폴라로이드 3장 */
  heroPolaroids: PhotoSlot[];
  /** 소셜 콜라주(bento) 4장 */
  bento: PhotoSlot[];
  /** 포토북 쇼케이스 표지 */
  photobookCover: PhotoSlot;
  /** 섹션 헤드라인(\n 줄바꿈 허용) */
  headings: {
    emotion: string;
    how: string;
    value: string;
    collage: string;
    showcase: string;
    viral: string;
    final: string;
  };
  /** 브랜드 슬로건 */
  slogan: string;
}

// 기본 실사 사진(Unsplash, 무료 라이선스·핫링크 공식 허용·per-photo 안정 URL, curl 200 검증).
// 어드민에서 자가호스팅 이미지로 교체 가능.
const U = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=1200&q=80&auto=format&fit=crop`;
const PHOTO = {
  sunsetBeach: U("1775547754264-8c7f455d1b85"),
  mountains: U("1509634351419-33bd979a5f56"),
  cityNight: U("1628652463675-0fdec7294acd"),
  fireworks: U("1760881973494-6df29de5e36f"),
  picnic: U("1763901326432-4b08b99e03e4"),
  friends: U("1543269865-cbf427effbad"),
  roadTrip: U("1734375119887-460f4b97dfaa"),
  family: U("1709216461598-018ae6307dc0"),
};

/** 기본 콘텐츠 — DB 미설정 시 사용(현재 랜딩 카피와 동일). */
export const DEFAULT_LANDING_CONTENT: LandingContent = {
  hero: {
    eyebrow: "카톡 링크 1탭 · 앱 설치 없이",
    headline: "친구들 사진,\n다 같이 모아\n빛나는 한 권으로",
    subhead:
      "흩어진 사진은 늘 한 명만 고생하죠. 카톡 링크 하나면 모두가 1탭으로 들어와 사진을 모아요. 고르기만 하면 포토북은 저절로 완성.",
    microcopy: "카드 등록 없이 · 앱 설치 없이 · 카카오로 3초",
  },
  heroPolaroids: [
    { url: PHOTO.picnic, caption: "동아리 MT", scene: "picnic" },
    { url: PHOTO.sunsetBeach, caption: "제주 2박 3일", scene: "sunset-beach" },
    { url: PHOTO.fireworks, caption: "졸업 여행", scene: "fireworks" },
  ],
  bento: [
    { url: PHOTO.friends, caption: "제주 2박 3일", scene: "sunset-beach", meta: "여러 장 · 친구들" },
    { url: PHOTO.mountains, caption: "동아리 MT", scene: "mountains" },
    { url: PHOTO.family, caption: "엄마 환갑여행", scene: "picnic" },
    { url: PHOTO.cityNight, caption: "졸업 여행", scene: "city-night" },
  ],
  photobookCover: { url: PHOTO.roadTrip, caption: "우리의 2박 3일", scene: "sunset-beach" },
  headings: {
    emotion: "여행은 끝났는데, 사진은\n다섯 개의 카톡방에 흩어져 있어요",
    how: "카톡 보내고, 모으고,\n책이 돼요",
    value: "모으는 건 쉽게,\n결과물은 자랑스럽게",
    collage: "흩어진 사진이,\n우리 모두의 앨범이 돼요",
    showcase: "다 모으면,\n이렇게 한 권이 돼요",
    viral: "혼자 하지 마세요,\n다 같이 하세요",
    final: "이번 여행 사진,\n흩어지기 전에 모아요",
  },
  slogan: "추억을 모아 빛나게",
};

/** 부분 저장본을 기본값 위에 병합(누락 필드는 기본값 유지). */
export function mergeLandingContent(
  partial: unknown,
): LandingContent {
  const d = DEFAULT_LANDING_CONTENT;
  if (!partial || typeof partial !== "object") return d;
  const p = partial as Partial<LandingContent>;
  return {
    hero: { ...d.hero, ...(p.hero ?? {}) },
    heroPolaroids: Array.isArray(p.heroPolaroids) && p.heroPolaroids.length
      ? p.heroPolaroids.map((s, i) => ({ ...d.heroPolaroids[i % 3], ...s }))
      : d.heroPolaroids,
    bento: Array.isArray(p.bento) && p.bento.length
      ? p.bento.map((s, i) => ({ ...d.bento[i % 4], ...s }))
      : d.bento,
    photobookCover: { ...d.photobookCover, ...(p.photobookCover ?? {}) },
    headings: { ...d.headings, ...(p.headings ?? {}) },
    slogan: typeof p.slogan === "string" && p.slogan ? p.slogan : d.slogan,
  };
}
