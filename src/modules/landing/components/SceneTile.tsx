// 스타일라이즈드 여행 "사진" 타일 — 실제 이미지 없이 CSS 다중 그라데이션 + 최소 인라인 SVG로
// 미니멀·고급 톤의 포스트카드 비주얼을 만든다.
//
// 설계 원칙
//  - 서버 컴포넌트 안전: 'use client' 불필요, hooks/랜덤/이벤트 없음. 입력(scene)에 대해 결정적 렌더.
//  - 외부 의존 0 (lucide·fabric 등 미사용). 단일 자급 .tsx.
//  - 색은 브랜드 토큰 우선(--chart-1 코랄 / --chart-2 앰버 / --chart-3 골든 / --chart-4 틸 / --chart-5 플럼).
//    사실적 하늘·바다·숲 색은 보조로만. 라이트/다크는 globals.css 토큰이 알아서 전환.
//  - 하단은 bg-scrim-photo 유틸로 어둑하게 → 위에 얹는 캡션/배지 가독 확보(LandingPage 패턴과 동일).
//  - 이미지 "영역"만 렌더한다. 폴라로이드/벤토/책표지 등 어떤 컨테이너에도 그대로 들어가도록
//    기본은 absolute inset-0(부모가 relative+overflow-hidden이면 꽉 채움). rounded는 prop로 제어.

import type { CSSProperties } from "react";

export type SceneName =
  | "sunset-beach" // 노을 진 바다 + 해 + 수평선
  | "mountains" // 능선 실루엣 + 맑은 하늘 + 해
  | "city-night" // 도시 야경 스카이라인 + 창문 불빛
  | "fireworks" // 밤하늘 불꽃 + 별
  | "picnic" // 잔디 언덕 + 햇살 + 떠 있는 해
  | "road-trip"; // 노을 도로 + 소실점 + 차선

export const SCENE_NAMES: SceneName[] = [
  "sunset-beach",
  "mountains",
  "city-night",
  "fireworks",
  "picnic",
  "road-trip",
];

interface SceneTileProps {
  scene: SceneName;
  /** 추가 클래스 (부모 컨테이너에 맞춰 위치/크기 조정용) */
  className?: string;
  /** 타일 라운드. false면 라운드 없음(부모 overflow-hidden 라운드를 그대로 따름). 기본 false */
  rounded?: boolean | string;
  /** 하단 스크림 강도(텍스트가 얹힐 때 1, 장식만이면 0.55 권장). 기본 0.62 */
  scrim?: number;
}

/* ──────────────────────────────────────────────────────────────
   각 씬 = 배경 그라데이션 레이어(여러 겹) + 인라인 SVG 형상.
   배경은 CSS background-image 다중 레이어, 전경 디테일은 SVG로 분리해
   "사진" 같은 깊이감(하늘 그라데이션 → 광원 → 실루엣 → 스크림)을 낸다.
   ────────────────────────────────────────────────────────────── */

/** 씬별 다층 배경(맨 위 레이어가 화면 앞). 색은 토큰 + 약간의 raw(하늘/물) 보조. */
const SCENE_BG: Record<SceneName, string> = {
  // 노을 바다: 위 플럼하늘 → 코랄·앰버 노을대 → 아래 짙은 물. 해광은 SVG가 담당.
  "sunset-beach": [
    "linear-gradient(180deg, transparent 0%, transparent 58%, color-mix(in oklab, var(--chart-4) 55%, #0b1f2e) 60%, color-mix(in oklab, var(--chart-4) 30%, #07151f) 100%)",
    "radial-gradient(120% 80% at 50% 60%, color-mix(in oklab, var(--chart-2) 85%, white 5%) 0%, var(--chart-1) 32%, transparent 62%)",
    "linear-gradient(180deg, var(--chart-5) 0%, color-mix(in oklab, var(--chart-5) 60%, var(--chart-1)) 34%, var(--chart-1) 56%, var(--chart-2) 70%)",
  ].join(","),

  // 산: 맑고 깊은 하늘 그라데이션. 능선/해는 SVG. 위쪽 틸→플럼, 아래 따뜻한 앰버 띠.
  mountains: [
    "radial-gradient(90% 60% at 78% 26%, color-mix(in oklab, var(--chart-3) 70%, white) 0%, transparent 45%)",
    "linear-gradient(180deg, color-mix(in oklab, var(--chart-4) 70%, #0a2a3a) 0%, var(--chart-4) 30%, color-mix(in oklab, var(--chart-2) 45%, var(--chart-4)) 64%, var(--chart-2) 86%)",
  ].join(","),

  // 도시 야경: 짙은 플럼/네이비 하늘 + 지평선 코랄 글로우. 스카이라인/창문은 SVG.
  "city-night": [
    "radial-gradient(120% 70% at 50% 100%, color-mix(in oklab, var(--chart-1) 75%, #1a0a1e) 0%, transparent 55%)",
    "linear-gradient(180deg, color-mix(in oklab, var(--chart-5) 55%, #0c0716) 0%, color-mix(in oklab, var(--chart-5) 70%, #160a22) 50%, color-mix(in oklab, var(--chart-5) 45%, var(--chart-1)) 100%)",
  ].join(","),

  // 불꽃: 거의 검은 밤하늘 + 미세 플럼 색조. 별/폭죽은 SVG.
  fireworks: [
    "radial-gradient(80% 60% at 30% 30%, color-mix(in oklab, var(--chart-5) 40%, transparent) 0%, transparent 55%)",
    "linear-gradient(180deg, #0a0712 0%, color-mix(in oklab, var(--chart-5) 28%, #0a0712) 60%, color-mix(in oklab, var(--chart-1) 22%, #0d0710) 100%)",
  ].join(","),

  // 피크닉: 따뜻한 하늘 + 햇살. 잔디 언덕/해는 SVG. 위 앰버·코랄, 가운데 골든, 아래 틸그린.
  picnic: [
    "radial-gradient(70% 55% at 26% 24%, color-mix(in oklab, var(--chart-3) 80%, white 10%) 0%, transparent 48%)",
    "linear-gradient(180deg, color-mix(in oklab, var(--chart-2) 70%, white 6%) 0%, var(--chart-3) 40%, color-mix(in oklab, var(--chart-3) 50%, var(--chart-4)) 60%)",
  ].join(","),

  // 노을 도로: 위 노을 하늘 → 아래 짙은 아스팔트. 도로/차선/소실점은 SVG.
  "road-trip": [
    "linear-gradient(180deg, transparent 0%, transparent 52%, color-mix(in oklab, var(--chart-5) 40%, #14101c) 55%, #14101c 100%)",
    "radial-gradient(60% 36% at 50% 52%, color-mix(in oklab, var(--chart-2) 90%, white 8%) 0%, var(--chart-1) 40%, transparent 70%)",
    "linear-gradient(180deg, var(--chart-5) 0%, color-mix(in oklab, var(--chart-5) 55%, var(--chart-1)) 30%, var(--chart-1) 50%)",
  ].join(","),
};

/* ──────────────────────────────────────────────────────────────
   전경 SVG. preserveAspectRatio="none"로 타일 비율(정사각/2:1 등)에
   맞춰 늘어나도 형상이 자연스럽게 보이도록 viewBox 100×100 좌표계 사용.
   currentColor/토큰 색은 fill-opacity·흰색 알파로 "사진" 같은 광원/실루엣 표현.
   ────────────────────────────────────────────────────────────── */
function SceneArt({ scene }: { scene: SceneName }) {
  const common = {
    className: "absolute inset-0 h-full w-full",
    viewBox: "0 0 100 100",
    preserveAspectRatio: "none" as const,
    "aria-hidden": true,
  };

  switch (scene) {
    case "sunset-beach":
      return (
        <svg {...common}>
          {/* 태양 코어 + 헤일로 */}
          <circle cx="50" cy="54" r="11" fill="#fff" fillOpacity="0.92" />
          <circle cx="50" cy="54" r="20" fill="#fff" fillOpacity="0.1" />
          {/* 수평선 + 물 위 반사 광로 */}
          <rect x="0" y="59.5" width="100" height="0.7" fill="#fff" fillOpacity="0.28" />
          <polygon points="50,60 56,100 44,100" fill="#fff" fillOpacity="0.18" />
          <rect x="0" y="66" width="100" height="0.5" fill="#fff" fillOpacity="0.12" />
          <rect x="0" y="74" width="100" height="0.5" fill="#fff" fillOpacity="0.08" />
        </svg>
      );

    case "mountains":
      return (
        <svg {...common}>
          {/* 해 */}
          <circle cx="78" cy="26" r="8" fill="#fff" fillOpacity="0.85" />
          {/* 먼 능선(연한) */}
          <polygon
            points="0,64 22,46 40,58 60,40 80,56 100,44 100,100 0,100"
            fill="#fff"
            fillOpacity="0.1"
          />
          {/* 가까운 능선(짙은 실루엣) */}
          <polygon
            points="0,78 18,60 33,72 50,52 67,70 84,58 100,72 100,100 0,100"
            fill="#0c1a24"
            fillOpacity="0.55"
          />
          {/* 정상 설선 하이라이트 */}
          <polygon points="50,52 56,58 44,58" fill="#fff" fillOpacity="0.5" />
        </svg>
      );

    case "city-night":
      return (
        <svg {...common}>
          {/* 스카이라인 실루엣 */}
          <g fill="#08040e" fillOpacity="0.78">
            <rect x="4" y="62" width="11" height="38" />
            <rect x="17" y="50" width="9" height="50" />
            <rect x="28" y="68" width="8" height="32" />
            <rect x="38" y="44" width="12" height="56" />
            <rect x="52" y="58" width="9" height="42" />
            <rect x="63" y="36" width="10" height="64" />
            <rect x="75" y="56" width="8" height="44" />
            <rect x="85" y="48" width="11" height="52" />
          </g>
          {/* 창문 불빛 — 결정적 배치 */}
          <g fill="var(--chart-3)" fillOpacity="0.9">
            {[
              [6, 66], [10, 66], [6, 72], [19, 54], [22, 60], [19, 66],
              [40, 48], [44, 54], [40, 60], [44, 66], [65, 40], [69, 46],
              [65, 52], [69, 58], [87, 52], [91, 58], [87, 64], [54, 62], [57, 68],
            ].map(([x, y], idx) => (
              <rect key={idx} x={x} y={y} width="1.6" height="2.4" rx="0.3" />
            ))}
          </g>
        </svg>
      );

    case "fireworks":
      return (
        <svg {...common}>
          {/* 별 */}
          <g fill="#fff">
            {[
              [12, 16, 0.7], [28, 9, 0.5], [44, 20, 0.6], [62, 12, 0.45],
              [80, 22, 0.6], [90, 10, 0.5], [20, 34, 0.4], [70, 36, 0.5],
            ].map(([x, y, o], idx) => (
              <circle key={idx} cx={x} cy={y} r="0.7" fillOpacity={o} />
            ))}
          </g>
          {/* 폭죽 1 (코랄) */}
          <g stroke="var(--chart-1)" strokeWidth="0.8" strokeLinecap="round" opacity="0.95">
            {Array.from({ length: 12 }).map((_, k) => {
              const a = (k / 12) * Math.PI * 2;
              return (
                <line
                  key={k}
                  x1="34"
                  y1="40"
                  x2={(34 + Math.cos(a) * 14).toFixed(2)}
                  y2={(40 + Math.sin(a) * 14).toFixed(2)}
                />
              );
            })}
          </g>
          <circle cx="34" cy="40" r="1.6" fill="#fff" />
          {/* 폭죽 2 (앰버, 작게) */}
          <g stroke="var(--chart-2)" strokeWidth="0.6" strokeLinecap="round" opacity="0.9">
            {Array.from({ length: 10 }).map((_, k) => {
              const a = (k / 10) * Math.PI * 2;
              return (
                <line
                  key={k}
                  x1="68"
                  y1="30"
                  x2={(68 + Math.cos(a) * 9).toFixed(2)}
                  y2={(30 + Math.sin(a) * 9).toFixed(2)}
                />
              );
            })}
          </g>
          <circle cx="68" cy="30" r="1.1" fill="#fff" />
          {/* 폭죽 3 (골든, 막 터지는) */}
          <g stroke="var(--chart-3)" strokeWidth="0.5" strokeLinecap="round" opacity="0.85">
            {Array.from({ length: 8 }).map((_, k) => {
              const a = (k / 8) * Math.PI * 2;
              return (
                <line
                  key={k}
                  x1="52"
                  y1="58"
                  x2={(52 + Math.cos(a) * 6).toFixed(2)}
                  y2={(58 + Math.sin(a) * 6).toFixed(2)}
                />
              );
            })}
          </g>
        </svg>
      );

    case "picnic":
      return (
        <svg {...common}>
          {/* 해 + 햇살 */}
          <circle cx="26" cy="24" r="7" fill="#fff" fillOpacity="0.8" />
          <circle cx="26" cy="24" r="14" fill="#fff" fillOpacity="0.1" />
          {/* 뒤 언덕(연) */}
          <path d="M0,72 Q35,58 70,70 T100,66 V100 H0 Z" fill="#1f3a22" fillOpacity="0.32" />
          {/* 앞 언덕(짙은 잔디) */}
          <path d="M0,82 Q30,70 58,80 T100,78 V100 H0 Z" fill="#16301a" fillOpacity="0.55" />
          {/* 잔디 위 하이라이트 띠 */}
          <path d="M0,82 Q30,70 58,80 T100,78" stroke="#fff" strokeOpacity="0.16" strokeWidth="0.6" fill="none" />
        </svg>
      );

    case "road-trip":
      return (
        <svg {...common}>
          {/* 해 */}
          <circle cx="50" cy="50" r="9" fill="#fff" fillOpacity="0.9" />
          <rect x="0" y="54.5" width="100" height="0.6" fill="#fff" fillOpacity="0.22" />
          {/* 도로 — 소실점으로 좁아지는 사다리꼴 */}
          <polygon points="42,55 58,55 88,100 12,100" fill="#0d0a14" fillOpacity="0.72" />
          {/* 중앙 차선(점선, 원근감) */}
          <g fill="var(--chart-3)" fillOpacity="0.92">
            <polygon points="49.6,58 50.4,58 50.6,62 49.4,62" />
            <polygon points="49.3,66 50.7,66 51,72 49,72" />
            <polygon points="48.8,77 51.2,77 51.7,86 48.3,86" />
            <polygon points="48,92 52,92 52.8,100 47.2,100" />
          </g>
        </svg>
      );

    default:
      return null;
  }
}

export function SceneTile({
  scene,
  className = "",
  rounded = false,
  scrim = 0.62,
}: SceneTileProps) {
  const roundedCls =
    rounded === true ? "rounded-[inherit]" : typeof rounded === "string" ? rounded : "";

  const bgStyle: CSSProperties = {
    backgroundImage: SCENE_BG[scene],
    backgroundColor: "var(--chart-5)", // 폴백(레이어 로드 전/투명 영역 보호)
  };

  return (
    <div
      className={`absolute inset-0 overflow-hidden ${roundedCls} ${className}`}
      aria-hidden
    >
      {/* 1) 다층 그라데이션 배경 */}
      <div className="absolute inset-0" style={bgStyle} />
      {/* 2) 전경 SVG 형상(해/수평선/실루엣/별) */}
      <SceneArt scene={scene} />
      {/* 3) 미세 비네트 — 사진 같은 가장자리 깊이 */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(120% 90% at 50% 40%, transparent 55%, rgba(0,0,0,0.22) 100%)",
        }}
      />
      {/* 4) 하단 스크림 — 텍스트 가독(LandingPage와 동일 유틸) */}
      <div className="absolute inset-0 bg-scrim-photo" style={{ opacity: scrim }} />
    </div>
  );
}

export default SceneTile;
