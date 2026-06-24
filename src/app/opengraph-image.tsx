import { ImageResponse } from "next/og";

/**
 * ShareSnap 공유 썸네일 (Open Graph 이미지)
 * ───────────────────────────────────────────────────────────────
 * 카카오톡/슬랙/트위터 등 링크 미리보기에 노출되는 1200×630 카드.
 * 디자인: 선셋 코랄→앰버 그라데이션 + 폴라로이드 콜라주 + 워드마크/헤드라인/슬로건.
 *
 * ⚠️ 폰트 주의 (next/og = Satori 엔진)
 *   - Satori는 **woff2를 읽지 못한다.** 반드시 ttf / otf / woff 를 fetch 해 fonts[]에 전달.
 *   - 여기서는 프로젝트 브랜드 폰트인 Pretendard **OTF**(CFF/OTTO)를 런타임 fetch 한다.
 *     (OTF/CFF는 Satori가 지원. woff2만 미지원.)
 *   - fetch 실패(네트워크/CDN 장애)에 대비해 try/catch 로 폰트 없이도 깨지지 않게 graceful fallback.
 *
 * ⚠️ ImageResponse(Satori) 렌더 제약
 *   - flexbox + 인라인 스타일만 지원. `display:grid`, 일부 CSS(예: background-clip:text 일부 환경)
 *     미지원 → 모든 레이아웃은 flex 로, 텍스트 그라데이션은 피하고 단색 사용.
 *   - div가 2개 이상 자식을 가지면 display:flex 명시 권장.
 */

// 라우트 세그먼트 설정 — Edge 런타임에서 동작
export const runtime = "edge";

// OG 표준 사이즈 & 콘텐츠 타입 (next/og 메타 자동 연결)
export const alt = "ShareSnap — 추억을 모아 빛나게";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// ── 브랜드 컬러 (globals.css 선셋 팔레트의 sRGB 근사치) ──────────
// oklch 토큰을 Satori가 직접 못 쓰므로, 디자인시스템 코랄/앰버를 hex로 환산해 사용.
const CORAL = "#F2654C"; // --primary 선셋 코랄
const CORAL_DEEP = "#E04A33"; // 그라데이션 시작(진코랄)
const AMBER = "#F4A24C"; // 앰버
const GOLD = "#FBC56A"; // 골든(그라데이션 끝)
const WARM_PAPER = "#FBF8F3"; // 폴라로이드 종이
const INK = "#2A211C"; // 폴라로이드 캡션 잉크

// 폴라로이드 사진 자리(실제 사진 없음 → 정직성 원칙: 가짜 인물 사진 대신 추상 그라데이션 타일)
// design-system chart-1~5 톤의 추상 타일.
const POLAROIDS: { from: string; to: string; rotate: number; caption: string }[] =
  [
    { from: "#FF8A65", to: "#F4511E", rotate: -8, caption: "제주 2박3일" },
    { from: "#FFCC80", to: "#FB8C00", rotate: 5, caption: "동아리 MT" },
    { from: "#80CBC4", to: "#26A69A", rotate: -3, caption: "벚꽃 나들이" },
  ];

/**
 * 한국어 폰트(OTF) 런타임 로드.
 * - Pretendard OTF(CFF) — 브랜드 폰트와 동일. Satori 호환(woff2 아님).
 * - 실패 시 빈 배열 반환 → 폰트 없이도 이미지 생성은 성공(한글이 시스템 기본으로 폴백).
 */
async function loadFonts(): Promise<
  { name: string; data: ArrayBuffer; weight: 700 | 800; style: "normal" }[]
> {
  const BOLD =
    "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/public/static/Pretendard-Bold.otf";
  const EXTRABOLD =
    "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/public/static/Pretendard-ExtraBold.otf";

  try {
    const [bold, extrabold] = await Promise.all([
      fetch(BOLD),
      fetch(EXTRABOLD),
    ]);
    if (!bold.ok || !extrabold.ok) return [];
    const [boldBuf, extraBuf] = await Promise.all([
      bold.arrayBuffer(),
      extrabold.arrayBuffer(),
    ]);
    return [
      { name: "Pretendard", data: boldBuf, weight: 700, style: "normal" },
      { name: "Pretendard", data: extraBuf, weight: 800, style: "normal" },
    ];
  } catch {
    // 네트워크/CDN 실패 — 폰트 없이도 렌더는 진행
    return [];
  }
}

export default async function OpengraphImage() {
  const fonts = await loadFonts();
  const fontFamily = fonts.length ? "Pretendard" : "sans-serif";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          fontFamily,
          // 선셋 코랄 → 앰버 → 골든 대각 그라데이션 배경
          backgroundImage: `linear-gradient(135deg, ${CORAL_DEEP} 0%, ${CORAL} 42%, ${AMBER} 78%, ${GOLD} 100%)`,
          color: "#FFFFFF",
          overflow: "hidden",
        }}
      >
        {/* 부드러운 라이트 글로우 (우상단) — 고급감 */}
        <div
          style={{
            position: "absolute",
            top: -260,
            right: -180,
            width: 620,
            height: 620,
            borderRadius: 9999,
            background:
              "radial-gradient(circle, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0) 70%)",
            display: "flex",
          }}
        />
        {/* 좌하단 깊이감 비네트 */}
        <div
          style={{
            position: "absolute",
            bottom: -240,
            left: -160,
            width: 560,
            height: 560,
            borderRadius: 9999,
            background:
              "radial-gradient(circle, rgba(176,42,20,0.30) 0%, rgba(176,42,20,0) 70%)",
            display: "flex",
          }}
        />

        {/* 본문: 좌(텍스트) / 우(폴라로이드 콜라주) 2열 */}
        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            padding: "0 72px",
          }}
        >
          {/* ── 좌측: 워드마크 + 헤드라인 + 슬로건 ── */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: 660,
            }}
          >
            {/* 워드마크 칩 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                marginBottom: 30,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  backgroundColor: "rgba(255,255,255,0.96)",
                  fontSize: 34,
                }}
              >
                {/* 카메라 글리프 대신 안전한 이모지 회피 → 단색 사각 렌즈 마크 */}
                <div
                  style={{
                    display: "flex",
                    width: 26,
                    height: 26,
                    borderRadius: 9999,
                    background: `linear-gradient(135deg, ${CORAL} 0%, ${AMBER} 100%)`,
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: 40,
                  fontWeight: 800,
                  letterSpacing: -1,
                  color: "#FFFFFF",
                  display: "flex",
                }}
              >
                ShareSnap
              </div>
            </div>

            {/* 강한 한 줄 헤드라인 */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                fontSize: 68,
                fontWeight: 800,
                lineHeight: 1.18,
                letterSpacing: -2.4,
                color: "#FFFFFF",
                textShadow: "0 2px 18px rgba(120,28,10,0.28)",
              }}
            >
              <div style={{ display: "flex" }}>친구들 사진,</div>
              <div style={{ display: "flex" }}>다 같이 모아 한 권으로.</div>
            </div>

            {/* 슬로건 */}
            <div
              style={{
                display: "flex",
                marginTop: 26,
                fontSize: 30,
                fontWeight: 700,
                color: "rgba(255,255,255,0.95)",
                letterSpacing: -0.8,
              }}
            >
              추억을 모아 빛나게
            </div>

            {/* 보조 라인 — 정직한 기능 설명(과장/숫자 없음) */}
            <div
              style={{
                display: "flex",
                marginTop: 18,
                fontSize: 21,
                fontWeight: 700,
                color: "rgba(255,255,255,0.78)",
                letterSpacing: -0.4,
              }}
            >
              카톡으로 모은 사진 → 자동 포토북 → 주문까지
            </div>
          </div>

          {/* ── 우측: 폴라로이드 콜라주 ── */}
          <div
            style={{
              display: "flex",
              flex: 1,
              position: "relative",
              height: "100%",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {POLAROIDS.map((p, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  display: "flex",
                  flexDirection: "column",
                  width: 232,
                  padding: 14,
                  paddingBottom: 22,
                  backgroundColor: WARM_PAPER,
                  borderRadius: 8,
                  boxShadow: "0 26px 60px rgba(90,20,8,0.40)",
                  transform: `rotate(${p.rotate}deg) translateY(${
                    i === 1 ? -36 : i === 0 ? 28 : 64
                  }px) translateX(${i === 0 ? -36 : i === 2 ? 40 : 0}px)`,
                }}
              >
                {/* 사진 자리 — 추상 그라데이션 타일(정직성: 가짜 인물 사진 미사용) */}
                <div
                  style={{
                    display: "flex",
                    width: 204,
                    height: 204,
                    borderRadius: 4,
                    backgroundImage: `linear-gradient(150deg, ${p.from} 0%, ${p.to} 100%)`,
                  }}
                />
                {/* 폴라로이드 캡션 */}
                <div
                  style={{
                    display: "flex",
                    marginTop: 12,
                    fontSize: 20,
                    fontWeight: 700,
                    color: INK,
                    letterSpacing: -0.5,
                  }}
                >
                  {p.caption}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 하단 도메인 바 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 72px 40px 72px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 22,
              fontWeight: 700,
              color: "rgba(255,255,255,0.85)",
              letterSpacing: -0.4,
            }}
          >
            sharesnap.app
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 20px",
              borderRadius: 9999,
              backgroundColor: "rgba(255,255,255,0.96)",
              color: CORAL_DEEP,
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: -0.4,
            }}
          >
            지금 사진 모으기
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fonts.map((f) => ({
        name: f.name,
        data: f.data,
        weight: f.weight,
        style: f.style,
      })),
    }
  );
}
