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

/** 제목/설명 한 쌍(가치 카드·3단계·신뢰 카드·FAQ 등 반복 카드용). */
export interface CardCopy {
  title: string;
  desc: string;
}

/** FAQ 한 항목(질문/답변). */
export interface FaqItem {
  q: string;
  a: string;
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

  /** 감정 훅 섹션 본문 */
  emotion: {
    eyebrow: string;
    desc: string;
    /** 불릿 3개 */
    bullets: string[];
  };
  /** 3단계 섹션 본문 — 카드 3개(아이콘/번호는 코드 고정, 문구만 편집) */
  how: {
    eyebrow: string;
    steps: CardCopy[];
  };
  /** 가치 벤토 섹션 본문 — 카드 4개(아이콘/레이아웃은 코드 고정, 문구만 편집) */
  value: {
    eyebrow: string;
    cards: CardCopy[];
  };
  /** 소셜 콜라주 섹션 본문 */
  collage: {
    eyebrow: string;
    desc: string;
    /** 콜라주 하단 면책 캡션 */
    note: string;
  };
  /** 포토북 쇼케이스 섹션 본문 */
  showcase: {
    eyebrow: string;
    desc: string;
    /** 스펙 칩 목록 */
    tags: string[];
  };
  /** 바이럴 섹션 본문 */
  viral: {
    desc: string;
  };
  /** FAQ 섹션 본문 */
  faq: {
    eyebrow: string;
    title: string;
    items: FaqItem[];
  };
  /** 신뢰 밴드 섹션 본문 — 카드 4개(아이콘은 코드 고정, 문구만 편집) */
  trust: {
    eyebrow: string;
    /** \n 줄바꿈 허용 */
    title: string;
    desc: string;
    cards: CardCopy[];
    /** 하단 안심 배너 */
    note: string;
  };
  /** 파이널 CTA 섹션 본문 */
  final: {
    desc: string;
    /** 하단 칩 3개(아이콘은 코드 고정) */
    chips: string[];
    /** 프라이버시 안심 한 줄 */
    privacy: string;
  };
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
  friends: U("1529156069898-49953e39b3ac"),
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
  emotion: {
    eyebrow: "그날의 사진들",
    desc: "누구는 안 보내고, 누구 건 화질이 깨지고, 한참 스크롤을 올려야 찾는 우리의 그날.",
    bullets: [
      "폰 속에 잠든 베스트 컷",
      "단톡방에 묻힌 단체샷",
      "1년 뒤엔 어디 있는지도 모를 그 순간",
    ],
  },
  how: {
    eyebrow: "딱 3단계",
    steps: [
      {
        title: "카톡으로 부르기",
        desc: "공유방 링크를 단톡방에 보내면 끝. 앱 설치도, 따로 회원가입도 없어요. 카카오 1탭이면 입장.",
      },
      {
        title: "다 같이 사진 모으기",
        desc: "각자 폰 속 사진을 올리면 실시간으로 한 화면에. 채팅으로 그날의 수다까지 함께.",
      },
      {
        title: "고르면 포토북 완성",
        desc: "사진만 고르면 표지·내지가 자동 편집. 인화도 포토북 주문도 한 번에.",
      },
    ],
  },
  value: {
    eyebrow: "왜 ShareSnap",
    cards: [
      {
        title: "카톡 1탭 참여",
        desc: "링크 클릭 → 카카오 로그인이면 끝. 앱 설치·가입 절차 없이 웹에서 바로.",
      },
      {
        title: "모두의 사진, 실시간으로",
        desc: "누가 올려도 곧바로 한 화면에 모여요.",
      },
      {
        title: "고르면 자동 포토북",
        desc: "표지부터 내지까지 자동 편집.",
      },
      {
        title: "인화·포토북 주문까지",
        desc: "마음에 들면 그대로 주문. 손에 잡히는 진짜 책으로.",
      },
    ],
  },
  collage: {
    eyebrow: "우리 모두의 앨범",
    desc: "누가 올려도 실시간으로 바로. 여행도, MT도, 가족 행사도 한 방에.",
    note: "※ 화면은 예시예요",
  },
  showcase: {
    eyebrow: "결과물",
    desc: "표지부터 마지막 장까지 자동 편집. 인스타에 올리고 싶은 표지, 손에 잡히는 진짜 책으로.",
    tags: ["정사각 210×210", "A4 · A5", "자동 레이아웃", "인쇄용 PDF"],
  },
  viral: {
    desc: "단톡방에 링크 하나 보내면 친구들이 알아서 사진을 채워요.",
  },
  faq: {
    eyebrow: "안심하세요",
    title: "쓰기 전에 궁금한 것들",
    items: [
      {
        q: "앱을 꼭 깔아야 하나요?",
        a: "아니요. 카톡 링크로 웹에서 바로 시작해요. 홈 화면에 추가하면 앱처럼 쓸 수도 있어요.",
      },
      {
        q: "친구도 가입해야 하나요?",
        a: "카카오 1탭이면 끝이에요. 로그인 전에도 어떤 방인지 미리보기로 확인할 수 있어요.",
      },
      {
        q: "사진은 안전한가요?",
        a: "초대된 멤버, 링크를 가진 사람만 방에 들어올 수 있어요. 올린 사진은 공유방 멤버에게만 보여요.",
      },
      {
        q: "포토북은 어떻게 만들어지나요?",
        a: "고른 사진으로 표지와 내지를 자동 편집해요. 마음에 들면 그대로 인화·주문하면 돼요.",
      },
      {
        q: "비용이 드나요?",
        a: "모으고 만드는 건 자유예요. 인화나 포토북을 주문할 때만 비용이 들어요. (가격은 주문 화면에서 확인)",
      },
    ],
  },
  trust: {
    eyebrow: "약속",
    title: "과장 없이,\n진짜 되는 것만 약속해요",
    desc: "후기도 별점도 부풀린 숫자도 없어요. 대신, 지금 바로 확인할 수 있는 것들.",
    cards: [
      {
        title: "초대받은 사람만 입장",
        desc: "링크를 가진 사람·초대된 멤버만 공유방에 들어올 수 있어요.",
      },
      {
        title: "사진은 우리끼리만",
        desc: "올린 사진은 그 공유방 멤버에게만 보여요. 외부엔 공개되지 않아요.",
      },
      {
        title: "카드 등록 없이 시작",
        desc: "모으고 만드는 건 자유. 인화·포토북을 주문할 때만 결제해요.",
      },
      {
        title: "앱 설치 없이 웹에서",
        desc: "카톡 링크 1탭, 카카오 로그인이면 끝. 따로 깔 것도 가입 절차도 없어요.",
      },
    ],
    note: "마음에 드는 사진을 골라, 마음에 들 때만 주문하세요.",
  },
  final: {
    desc: "모으는 데 3초, 추억은 평생.",
    chips: ["카드 등록 없이", "앱 설치 없이", "카카오로 3초"],
    privacy: "올린 사진은 우리 공유방 멤버에게만 보여요",
  },
};

// ── 병합 헬퍼 ──────────────────────────────────────────────
// 문자열: 비어있지 않은 부분값만 채택, 아니면 기본값 유지.
function mergeStr(v: unknown, fallback: string): string {
  return typeof v === "string" && v ? v : fallback;
}
// 문자열 배열: 길이 기반 폴백 — 항목이 문자열이면 채택, 아니면 같은 인덱스 기본값.
function mergeStrArr(v: unknown, fallback: string[]): string[] {
  if (!Array.isArray(v) || v.length === 0) return fallback;
  return v.map((item, i) =>
    typeof item === "string" && item ? item : fallback[i % fallback.length],
  );
}
// 카드 배열(title/desc): heroPolaroids/bento 와 동일한 인덱스별 스프레드 폴백.
function mergeCards(v: unknown, fallback: CardCopy[]): CardCopy[] {
  if (!Array.isArray(v) || v.length === 0) return fallback;
  return v.map((item, i) => {
    const base = fallback[i % fallback.length];
    const it = (item ?? {}) as Partial<CardCopy>;
    return {
      title: mergeStr(it.title, base.title),
      desc: mergeStr(it.desc, base.desc),
    };
  });
}
// FAQ 배열(q/a): 위 카드와 동일 패턴.
function mergeFaq(v: unknown, fallback: FaqItem[]): FaqItem[] {
  if (!Array.isArray(v) || v.length === 0) return fallback;
  return v.map((item, i) => {
    const base = fallback[i % fallback.length];
    const it = (item ?? {}) as Partial<FaqItem>;
    return {
      q: mergeStr(it.q, base.q),
      a: mergeStr(it.a, base.a),
    };
  });
}

/** 부분 저장본을 기본값 위에 병합(누락 필드는 기본값 유지). */
export function mergeLandingContent(
  partial: unknown,
): LandingContent {
  const d = DEFAULT_LANDING_CONTENT;
  if (!partial || typeof partial !== "object") return d;
  const p = partial as Partial<LandingContent>;
  // 본문 섹션 부분값(존재하면 객체)
  const emotion = (p.emotion ?? {}) as Partial<LandingContent["emotion"]>;
  const how = (p.how ?? {}) as Partial<LandingContent["how"]>;
  const value = (p.value ?? {}) as Partial<LandingContent["value"]>;
  const collage = (p.collage ?? {}) as Partial<LandingContent["collage"]>;
  const showcase = (p.showcase ?? {}) as Partial<LandingContent["showcase"]>;
  const viral = (p.viral ?? {}) as Partial<LandingContent["viral"]>;
  const faq = (p.faq ?? {}) as Partial<LandingContent["faq"]>;
  const trust = (p.trust ?? {}) as Partial<LandingContent["trust"]>;
  const final = (p.final ?? {}) as Partial<LandingContent["final"]>;
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
    slogan: mergeStr(p.slogan, d.slogan),
    emotion: {
      eyebrow: mergeStr(emotion.eyebrow, d.emotion.eyebrow),
      desc: mergeStr(emotion.desc, d.emotion.desc),
      bullets: mergeStrArr(emotion.bullets, d.emotion.bullets),
    },
    how: {
      eyebrow: mergeStr(how.eyebrow, d.how.eyebrow),
      steps: mergeCards(how.steps, d.how.steps),
    },
    value: {
      eyebrow: mergeStr(value.eyebrow, d.value.eyebrow),
      cards: mergeCards(value.cards, d.value.cards),
    },
    collage: {
      eyebrow: mergeStr(collage.eyebrow, d.collage.eyebrow),
      desc: mergeStr(collage.desc, d.collage.desc),
      note: mergeStr(collage.note, d.collage.note),
    },
    showcase: {
      eyebrow: mergeStr(showcase.eyebrow, d.showcase.eyebrow),
      desc: mergeStr(showcase.desc, d.showcase.desc),
      tags: mergeStrArr(showcase.tags, d.showcase.tags),
    },
    viral: {
      desc: mergeStr(viral.desc, d.viral.desc),
    },
    faq: {
      eyebrow: mergeStr(faq.eyebrow, d.faq.eyebrow),
      title: mergeStr(faq.title, d.faq.title),
      items: mergeFaq(faq.items, d.faq.items),
    },
    trust: {
      eyebrow: mergeStr(trust.eyebrow, d.trust.eyebrow),
      title: mergeStr(trust.title, d.trust.title),
      desc: mergeStr(trust.desc, d.trust.desc),
      cards: mergeCards(trust.cards, d.trust.cards),
      note: mergeStr(trust.note, d.trust.note),
    },
    final: {
      desc: mergeStr(final.desc, d.final.desc),
      chips: mergeStrArr(final.chips, d.final.chips),
      privacy: mergeStr(final.privacy, d.final.privacy),
    },
  };
}
