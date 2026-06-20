# ShareSnap 디자인 시스템 — "추억을 모아 빛나게"

> **버전**: 1.0 (2026-06-12)
> **적용 대상**: Phase 3 디자인 개편부터 전 화면
> **스택 전제**: Next.js 16 (App Router) + Tailwind v4 (`@theme` CSS 설정) + shadcn/ui 4.x (@base-ui) + lucide-react + next-themes + tw-animate-css — 모두 이미 설치됨 (`package.json` 확인 완료)

---

## 0. 브랜드 컨셉과 디자인 원칙

### 컨셉: Sunset Coral — "추억을 모아 빛나게"

여행의 가장 빛나는 순간(골든아워/선셋)을 브랜드 색으로 가져온다.
**선셋 코랄(primary) → 앰버(accent)** 그라데이션이 브랜드 시그니처이며, 나머지 UI는 **웜 뉴트럴 그레이**로 철저히 가라앉혀 사진이 주인공이 되게 한다.

### 5대 원칙

1. **포토 퍼스트** — 컬러풀한 UI 면적은 전체 화면의 10% 이하(CTA, FAB, 활성 상태만). 카드/배경/네비는 뉴트럴.
2. **카카오 옐로 격리** — `#FEE500`은 오직 카카오 로그인/공유 버튼에만 사용. 브랜드 영역(themeColor, manifest, 스플래시)에 절대 사용 금지. ⚠️ **현재 위반 중**: `src/app/layout.tsx`의 `themeColor: "#FEE500"`, `public/manifest.json`의 `"theme_color": "#FEE500"` → Phase 3에서 코랄로 교체해야 함.
3. **다크모드 = 시네마 모드** — 다크는 단순 반전이 아니라 "사진 감상에 최적화된 어두운 극장". 웜 블랙(완전 무채색 검정 금지) + 사진 뷰어만 순수 블랙.
4. **모션은 가볍게, 피드백은 즉시** — 진입 fade-up 0.45s 1회, 탭 피드백 0.15s. 화려한 모션 금지, `prefers-reduced-motion` 항상 존중.
5. **한 손 모바일** — 핵심 액션은 화면 하단 1/3에. 터치 타깃 최소 44×44px(기본 48px).

### 시드 디렉션 대비 조정 사항 (근거 포함)

| 시드 | 조정 | 근거 |
|------|------|------|
| 선셋 코랄 primary | 채택. 단, **light 모드 소형 텍스트용 `--coral-deep` 보조 토큰 추가** | 코랄 oklch(0.655)은 흰 배경 대비 약 3.3:1 — 버튼/대형 텍스트는 OK지만 15px 이하 텍스트 링크는 AA(4.5:1) 미달. 텍스트용 진한 코랄을 분리해야 접근성과 감성을 둘 다 지킴 |
| 다크모드 필수 | 채택 + **사진 뷰어는 테마 무관 강제 블랙** | OLED 모바일에서 사진 감상 몰입도. 인스타그램/애플 사진 앱과 동일 패턴 |
| Pretendard Variable CDN | 채택, **dynamic-subset 버전** 사용 | 한글 전체 서브셋(~2MB) 대신 dynamic-subset은 사용 글리프만 청크 로드 — 카카오톡 인앱 브라우저의 첫 진입 속도에 결정적 |

---

## 1. 디자인 토큰 — globals.css 전체 교체 코드

아래 코드는 `src/app/globals.css`를 **통째로 교체**하는 완성본이다. shadcn 변수명 100% 호환(기존 컴포넌트 무수정 동작), 기존 `@theme inline` 매핑·radius 체계 유지.

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));

/* ─────────────────────────────────────────────
   폰트 + 모션 토큰 (정적 @theme — 값 직접 정의)
   ───────────────────────────────────────────── */
@theme {
  --font-sans: "Pretendard Variable", Pretendard, -apple-system,
    BlinkMacSystemFont, system-ui, Roboto, "Helvetica Neue", "Segoe UI",
    "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif;

  /* 모션 — animate-fade-up 등 유틸리티로 사용 */
  --animate-fade-up: fade-up 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
  --animate-fade-in: fade-in 0.3s ease-out both;
  --animate-scale-in: scale-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) both;
  --animate-shimmer: shimmer 1.8s linear infinite;

  @keyframes fade-up {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes scale-in {
    from { opacity: 0; transform: scale(0.96); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes shimmer {
    from { transform: translateX(-100%); }
    to   { transform: translateX(100%); }
  }
}

/* ─────────────────────────────────────────────
   시맨틱 토큰 매핑 (shadcn 호환 — 기존 구조 유지)
   ───────────────────────────────────────────── */
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-heading: var(--font-sans);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  --color-chart-5: var(--chart-5);
  --color-chart-4: var(--chart-4);
  --color-chart-3: var(--chart-3);
  --color-chart-2: var(--chart-2);
  --color-chart-1: var(--chart-1);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);

  /* ShareSnap 브랜드 확장 토큰 */
  --color-kakao: var(--kakao);                       /* bg-kakao */
  --color-kakao-foreground: var(--kakao-foreground); /* text-kakao-foreground */
  --color-amber-brand: var(--amber-brand);           /* text-amber-brand 등 */
  --color-coral-deep: var(--coral-deep);             /* 소형 텍스트용 진코랄 */

  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
  --radius-3xl: calc(var(--radius) * 2.2);
  --radius-4xl: calc(var(--radius) * 2.6);
}

/* ─────────────────────────────────────────────
   LIGHT — 웜 페이퍼 위의 선셋 코랄
   ───────────────────────────────────────────── */
:root {
  --background: oklch(0.985 0.005 84);          /* 웜 오프화이트 ≈ #FBF8F3 */
  --foreground: oklch(0.235 0.012 40);          /* 웜 차콜 */
  --card: oklch(1 0 0);                          /* 순백 카드 — 배경과 미세 분리 */
  --card-foreground: oklch(0.235 0.012 40);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.235 0.012 40);
  --primary: oklch(0.655 0.19 32);              /* ★ 선셋 코랄 ≈ #F2654C */
  --primary-foreground: oklch(0.99 0.005 80);
  --secondary: oklch(0.955 0.012 70);           /* 웜 샌드 */
  --secondary-foreground: oklch(0.35 0.02 40);
  --muted: oklch(0.955 0.008 80);
  --muted-foreground: oklch(0.50 0.015 50);
  --accent: oklch(0.945 0.035 75);              /* 앰버 틴트 (hover/선택 배경) */
  --accent-foreground: oklch(0.42 0.07 50);
  --destructive: oklch(0.577 0.225 27);
  --border: oklch(0.912 0.01 75);
  --input: oklch(0.912 0.01 75);
  --ring: oklch(0.655 0.19 32);
  --chart-1: oklch(0.655 0.19 32);   /* 코랄 */
  --chart-2: oklch(0.78 0.15 70);    /* 앰버 */
  --chart-3: oklch(0.86 0.13 92);    /* 골든 */
  --chart-4: oklch(0.62 0.10 200);   /* 더스크 틸 */
  --chart-5: oklch(0.55 0.12 310);   /* 트와일라잇 플럼 */
  --radius: 0.75rem;                 /* 기존 0.625 → 0.75 (부드러운 프리미엄 라운드) */
  --sidebar: oklch(0.985 0.005 84);
  --sidebar-foreground: oklch(0.235 0.012 40);
  --sidebar-primary: oklch(0.655 0.19 32);
  --sidebar-primary-foreground: oklch(0.99 0.005 80);
  --sidebar-accent: oklch(0.955 0.008 80);
  --sidebar-accent-foreground: oklch(0.35 0.02 40);
  --sidebar-border: oklch(0.912 0.01 75);
  --sidebar-ring: oklch(0.655 0.19 32);

  /* 브랜드 확장 */
  --kakao: #FEE500;                              /* 카카오 버튼 전용 — 다른 곳 사용 금지 */
  --kakao-foreground: #191919;
  --amber-brand: oklch(0.78 0.15 70);
  --coral-deep: oklch(0.555 0.175 30);           /* 흰 배경 위 소형 텍스트용 (4.5:1↑) */
  --gradient-sunset: linear-gradient(135deg,
    oklch(0.655 0.19 32) 0%,
    oklch(0.72 0.17 50) 55%,
    oklch(0.80 0.15 75) 100%);
  --scrim-photo: linear-gradient(to top,
    oklch(0.15 0.01 40 / 0.72) 0%, transparent 45%);
  --shimmer-highlight: oklch(1 0 0 / 0.45);
}

/* ─────────────────────────────────────────────
   DARK — 웜 블랙 시네마
   ───────────────────────────────────────────── */
.dark {
  --background: oklch(0.165 0.008 45);          /* 웜 니어블랙 ≈ #1B1715 */
  --foreground: oklch(0.955 0.005 80);
  --card: oklch(0.21 0.01 50);
  --card-foreground: oklch(0.955 0.005 80);
  --popover: oklch(0.23 0.01 50);
  --popover-foreground: oklch(0.955 0.005 80);
  --primary: oklch(0.72 0.165 35);              /* 다크에선 한 톤 밝은 코랄 */
  --primary-foreground: oklch(0.205 0.04 30);   /* 코랄 위 진갈색 텍스트 (7:1↑) */
  --secondary: oklch(0.27 0.012 50);
  --secondary-foreground: oklch(0.93 0.008 75);
  --muted: oklch(0.26 0.01 50);
  --muted-foreground: oklch(0.71 0.012 60);
  --accent: oklch(0.30 0.03 55);
  --accent-foreground: oklch(0.90 0.06 70);
  --destructive: oklch(0.70 0.19 22);
  --border: oklch(0.95 0.01 70 / 12%);
  --input: oklch(0.95 0.01 70 / 16%);
  --ring: oklch(0.72 0.165 35);
  --chart-1: oklch(0.72 0.165 35);
  --chart-2: oklch(0.80 0.14 70);
  --chart-3: oklch(0.87 0.12 92);
  --chart-4: oklch(0.68 0.10 200);
  --chart-5: oklch(0.65 0.12 310);
  --sidebar: oklch(0.21 0.01 50);
  --sidebar-foreground: oklch(0.955 0.005 80);
  --sidebar-primary: oklch(0.72 0.165 35);
  --sidebar-primary-foreground: oklch(0.205 0.04 30);
  --sidebar-accent: oklch(0.26 0.01 50);
  --sidebar-accent-foreground: oklch(0.93 0.008 75);
  --sidebar-border: oklch(0.95 0.01 70 / 12%);
  --sidebar-ring: oklch(0.72 0.165 35);

  /* 카카오 옐로는 다크에서도 동일 (카카오 디자인 가이드 — 다크 변형 없음) */
  --kakao: #FEE500;
  --kakao-foreground: #191919;
  --amber-brand: oklch(0.80 0.14 70);
  --coral-deep: oklch(0.80 0.12 42);             /* 다크 배경 위 소형 코랄 텍스트 */
  --gradient-sunset: linear-gradient(135deg,
    oklch(0.60 0.18 32) 0%,
    oklch(0.67 0.16 50) 55%,
    oklch(0.74 0.14 75) 100%);
  --scrim-photo: linear-gradient(to top,
    oklch(0 0 0 / 0.8) 0%, transparent 45%);
  --shimmer-highlight: oklch(1 0 0 / 0.07);
}

/* ─────────────────────────────────────────────
   커스텀 유틸리티
   ───────────────────────────────────────────── */
@utility bg-sunset {
  background-image: var(--gradient-sunset);
}
@utility text-sunset {
  background-image: var(--gradient-sunset);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
@utility bg-scrim-photo {
  background-image: var(--scrim-photo);
}
@utility skeleton {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-md);
  background-color: var(--color-muted);
  &::after {
    content: "";
    position: absolute;
    inset: 0;
    transform: translateX(-100%);
    background: linear-gradient(90deg, transparent, var(--shimmer-highlight), transparent);
    animation: shimmer 1.8s linear infinite;
  }
}
@utility scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
}
@utility pb-safe {
  padding-bottom: env(safe-area-inset-bottom);
}
@utility pt-safe {
  padding-top: env(safe-area-inset-top);
}

/* ─────────────────────────────────────────────
   베이스
   ───────────────────────────────────────────── */
@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  html {
    @apply font-sans;
    -webkit-tap-highlight-color: transparent; /* 모바일 탭 회색 플래시 제거 */
  }
  body {
    @apply bg-background text-foreground;
    word-break: keep-all;            /* 한글 단어 단위 줄바꿈 */
    overflow-wrap: break-word;
    letter-spacing: -0.01em;         /* Pretendard 한글 기본 자간 보정 */
  }
  ::selection {
    background: oklch(0.655 0.19 32 / 0.25);
  }
  /* 모션 민감 사용자 — 모든 애니메이션 즉시 종료 */
  @media (prefers-reduced-motion: reduce) {
    *, ::before, ::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
}
```

### 토큰 사용 규칙

| 토큰 | 용도 | 금지 사항 |
|------|------|----------|
| `bg-primary` | CTA 버튼, FAB, 활성 네비 아이콘, 내 채팅 버블 | 넓은 배경면(히어로 제외), 본문 텍스트 |
| `text-coral-deep` | 흰/웜화이트 배경 위 15px 이하 코랄 텍스트(링크, 강조 숫자) | 버튼 배경 |
| `bg-sunset` | 로그인 히어로, 엠티 스테이트 아이콘 원, 프리미엄 배지 | 카드 배경, 리스트 아이템 |
| `bg-kakao text-kakao-foreground` | **카카오 버튼만** | 그 외 전부 |
| `bg-accent` | 선택된 행, hover 배경 | CTA |

---

## 2. 타이포그래피 — Pretendard Variable

### 2.1 적용 코드 — `src/app/layout.tsx`

jsdelivr CDN의 **dynamic-subset**(필요 글리프만 청크 로드, 카카오 인앱 브라우저 첫 진입 최적화)을 사용한다. 동시에 themeColor의 카카오 옐로 위반을 코랄로 교정한다.

```tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";

export const metadata: Metadata = {
  title: "ShareSnap — 사진 공유 & 포토북",
  description: "여행과 모임 사진을 공유하고 포토북으로 만드는 PWA 서비스",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ShareSnap",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png", // 180×180 (mobile-deployment.md §2.1 아이콘 체크리스트)
  },
};

export const viewport: Viewport = {
  // ⚠️ 카카오 옐로 금지 — 브랜드 코랄/웜블랙으로
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBF8F3" },
    { media: "(prefers-color-scheme: dark)", color: "#1B1715" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // ← 필수: 이것 없이는 safe-area-inset이 0 → pt-safe/pb-safe 유틸 전부 무효 (mobile-deployment.md §2.3)
  maximumScale: 5,      // 접근성: 확대 차단 금지 (WCAG 1.4.4)
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster position="top-center" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
```

> `--font-sans`는 globals.css `@theme`에 정의되어 있으므로(1장 코드) 별도 next/font 설정 불필요. `suppressHydrationWarning`은 next-themes의 class 주입 때문에 필수.

### 2.2 타입 스케일 (모바일 기준)

한국 모바일 앱 관례에 따라 **본문 15px**을 기준으로 한다. Tailwind 기본 유틸리티 + 자간 조합으로 사용한다 (별도 토큰 오버라이드 없이 클래스 조합으로 통일).

| 역할 | 클래스 조합 | 크기/굵기/행간 | 사용처 |
|------|------------|---------------|--------|
| Display | `text-[32px] font-bold leading-[1.25] tracking-[-0.02em]` | 32/700/1.25 | 로그인 히어로 워드마크 아래 캐치프레이즈 |
| H1 | `text-2xl font-bold tracking-[-0.02em]` | 24/700/1.33 | 페이지 타이틀 (방 목록 헤더) |
| H2 | `text-xl font-semibold tracking-[-0.015em]` | 20/600/1.4 | 섹션 타이틀, 다이얼로그 제목 |
| H3 | `text-[17px] font-semibold tracking-[-0.01em]` | 17/600/1.45 | 카드 제목(방 이름) |
| Body | `text-[15px] leading-[1.6]` | 15/400/1.6 | 본문, 채팅 메시지 |
| Body-strong | `text-[15px] font-medium` | 15/500 | 리스트 주제목 |
| Caption | `text-[13px] text-muted-foreground` | 13/400 | 보조 설명, 타임스탬프 |
| Micro | `text-[11px] text-muted-foreground` | 11/400 | 네비 라벨, 배지, 메타 |
| Number | `font-semibold tabular-nums` | — | 사진 수, 가격, 카운터 (자릿수 흔들림 방지) |

### 2.3 한글 letter-spacing 가이드

Pretendard는 한글 기본 자간이 다소 넓으므로 음수 자간이 기본이다.

- **전역 본문**: `-0.01em` (globals.css `body`에 이미 적용 — 개별 지정 불필요)
- **제목(20px 이상)**: `-0.015em ~ -0.02em` — 클수록 더 좁힌다
- **Micro(11px)·영문/숫자 단독**: `tracking-normal`로 리셋 (작은 글자에 음수 자간은 가독성 저하)
- **줄바꿈**: `word-break: keep-all` 전역 적용됨. 카드처럼 좁은 영역의 긴 한글 제목은 `break-keep` + `line-clamp-2`
- **숫자**: 가격·카운트다운·업로드 퍼센트는 반드시 `tabular-nums`

---

## 3. 모션 시스템

> 토큰(`--animate-*`)과 keyframes는 1장 globals.css에 포함되어 있음. tw-animate-css가 설치되어 있으므로 `animate-in fade-in slide-in-from-bottom-2` 계열도 병용 가능하다. **기준: 진입 0.45s / 피드백 0.15s / 이즈 `cubic-bezier(0.16,1,0.3,1)` (easeOutExpo 계열)**.

### 3.1 진입 애니메이션 — fade-up + 스태거

```tsx
{/* 페이지 단위 진입 */}
<div className="animate-fade-up">…</div>

{/* 리스트 스태거 — 최대 6개까지만 지연, 이후 동시 (긴 리스트 지연 금지) */}
{rooms.map((room, i) => (
  <li
    key={room.id}
    className="animate-fade-up"
    style={{ animationDelay: `${Math.min(i, 6) * 50}ms` }}
  >
```

### 3.2 페이지 전환 — `template.tsx`

route 그룹에 `template.tsx`를 추가하면 네비게이션마다 재마운트되어 진입 모션이 일관 적용된다.

```tsx
// src/app/(main)/template.tsx
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 flex-col animate-fade-up">{children}</div>;
}
```

> 채팅방(`rooms/[id]`)은 스크롤 위치 유지가 중요하므로 template 모션 제외 — `(main)` 최상위에만 적용하고 채팅 화면은 `animate-fade-in`(transform 없음)으로 별도 처리.

### 3.3 탭 피드백 — 모든 인터랙티브 요소 공통

```
버튼/FAB:        active:scale-[0.97] transition-transform duration-150
카드/리스트 행:   active:scale-[0.98] transition-[transform,background-color] duration-150
사진 썸네일:      active:opacity-80 transition-opacity duration-150  (scale 금지 — 그리드 떨림)
아이콘 버튼:      active:scale-90 transition-transform duration-150
```

기존 shadcn `button.tsx`의 `active:translate-y-px`는 유지해도 되지만, 모바일 주요 CTA에는 위 scale 피드백을 className으로 덧입힌다.

### 3.4 스켈레톤 로딩

1장의 `skeleton` 유틸리티(shimmer 포함) 사용. 규칙: **실제 콘텐츠와 동일한 레이아웃 골격**을 그린다.

```tsx
{/* 방 목록 스켈레톤 — RoomList isLoading 분기 대체 */}
<ul className="flex flex-col gap-3 px-4 py-4">
  {Array.from({ length: 4 }).map((_, i) => (
    <li key={i} className="skeleton h-[180px] rounded-2xl" />
  ))}
</ul>

{/* 갤러리 그리드 스켈레톤 */}
<div className="grid grid-cols-3 gap-0.5">
  {Array.from({ length: 12 }).map((_, i) => (
    <div key={i} className="skeleton aspect-square rounded-none" />
  ))}
</div>
```

> 현재 `LoadingSpinner` 중앙 배치 패턴은 **전체 화면 차단 로딩**(인증 확인 등)에만 남기고, 콘텐츠 로딩은 전부 스켈레톤으로 교체한다.

---

## 4. 컴포넌트 가이드

### 4.1 버튼

현재 shadcn 4.x 기본 높이(h-8/h-9)는 데스크톱용으로 모바일 터치에 작다. **모바일 CTA 표준 클래스**를 정한다 (button.tsx 수정 없이 className 오버라이드).

```tsx
{/* Primary CTA — 화면당 1개 원칙 */}
<Button className="h-12 w-full rounded-xl text-base font-semibold
  shadow-lg shadow-primary/25 active:scale-[0.97] transition-transform">
  포토북 만들기
</Button>

{/* Secondary */}
<Button variant="secondary" className="h-12 w-full rounded-xl text-base font-medium">

{/* Outline (보조 액션) */}
<Button variant="outline" className="h-11 rounded-xl">

{/* 텍스트 버튼 — 소형 코랄 텍스트는 coral-deep 사용 */}
<Button variant="ghost" className="text-coral-deep">
```

#### 카카오 버튼 (카카오 디자인 가이드 준수)

컨테이너 `#FEE500`, 심볼/라벨 `#191919`, **다크모드에서도 색 변경 없음**. 기존 `KakaoLoginButton.tsx`의 하드코딩 `bg-[#FEE500]`을 토큰으로 교체:

```tsx
<Button
  size="lg"
  className="h-12 w-full rounded-xl bg-kakao text-kakao-foreground text-base font-semibold
    hover:bg-kakao/90 active:scale-[0.97] transition-transform
    dark:bg-kakao dark:text-kakao-foreground"  {/* 다크 변형 차단 */}
>
  <svg className="mr-2 size-5" …말풍선 심볼… />
  카카오로 시작하기
</Button>
```

### 4.2 카드

```
기본 카드:    rounded-2xl border border-border/60 bg-card shadow-sm
인터랙티브:   + transition-all duration-150 active:scale-[0.98] hover:shadow-md
커버 카드:    rounded-2xl overflow-hidden (이미지가 라운드를 뚫지 않도록)
```

다크모드에서 그림자는 무의미 — 카드 식별은 `bg-card`(배경보다 한 단계 밝음)와 `border`가 담당하므로 추가 작업 불필요.

### 4.3 입력 필드

```tsx
<Input className="h-12 rounded-xl text-[15px] px-4
  focus-visible:ring-primary/30 focus-visible:border-primary" />
{/* 라벨 */}
<label className="text-[13px] font-medium text-muted-foreground mb-1.5 block">
```

### 4.4 채팅 버블 (MessageList.tsx 개편 스펙)

```tsx
{/* 내 메시지 — 선셋 그라데이션 + 꼬리쪽 라운드 축소 */}
<div className="max-w-[75%] rounded-2xl rounded-br-md px-4 py-2.5
  text-[15px] leading-[1.5] break-words
  bg-sunset text-white shadow-sm">

{/* 상대 메시지 */}
<div className="max-w-[75%] rounded-2xl rounded-bl-md px-4 py-2.5
  text-[15px] leading-[1.5] break-words
  bg-card border border-border/60 text-foreground">

{/* 시스템 메시지 */}
<div className="mx-auto rounded-full bg-muted px-3 py-1 text-[11px] text-muted-foreground">

{/* 타임스탬프 */}
<span className="text-[10px] text-muted-foreground/70 tabular-nums">
```

연속 메시지 그룹핑: 같은 사람의 1분 내 연속 메시지는 아바타/이름 생략, 버블 간 `gap-0.5`, 그룹 간 `gap-3`.

### 4.5 하단 네비 — 글래스모피즘 (MobileLayout.tsx 개편 스펙)

```tsx
<nav className="fixed inset-x-0 bottom-0 z-40
  border-t border-border/50
  bg-background/75 backdrop-blur-xl backdrop-saturate-150
  supports-[backdrop-filter]:bg-background/60
  pb-safe">
  <ul className="mx-auto flex h-16 max-w-md items-stretch justify-around">
    <Link className={cn(
      "flex flex-col items-center justify-center gap-1 min-w-16 px-2",
      "transition-colors duration-150 active:scale-95",
      active ? "text-primary" : "text-muted-foreground"
    )}>
      <Icon className="size-6" strokeWidth={active ? 2.4 : 1.8} />
      <span className={cn("text-[11px] tracking-normal", active && "font-semibold")}>
```

핵심: `pb-safe`(홈 인디케이터), 높이 64px 고정, main의 `pb-16`은 `pb-[calc(4rem+env(safe-area-inset-bottom))]`으로 수정.

### 4.6 FAB (갤러리 사진 업로드)

```tsx
<button className="fixed right-4 z-40
  bottom-[calc(4rem+env(safe-area-inset-bottom)+1rem)]
  flex size-14 items-center justify-center rounded-full
  bg-sunset text-white shadow-xl shadow-primary/30
  active:scale-90 transition-transform duration-150"
  aria-label="사진 올리기">
  <ImagePlus className="size-6" />
</button>
```

### 4.7 엠티 스테이트 (공통 패턴)

```tsx
<div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center animate-fade-up">
  <div className="flex size-20 items-center justify-center rounded-full
    bg-sunset/10 text-primary">          {/* 코랄 10% 틴트 원 */}
    <Images className="size-9" strokeWidth={1.5} />
  </div>
  <div className="space-y-1.5">
    <p className="text-[17px] font-semibold">아직 공유방이 없어요</p>
    <p className="text-[13px] text-muted-foreground leading-relaxed">
      새 공유방을 만들고<br />친구들을 카카오톡으로 초대해 보세요
    </p>
  </div>
  <Button className="h-11 rounded-xl px-6 font-semibold">공유방 만들기</Button>
</div>
```

> `bg-sunset/10`은 그라데이션이라 opacity modifier가 안 먹음 — 실제 구현은 `bg-primary/10`을 쓰거나 `[background:var(--gradient-sunset)] opacity-10` 레이어 분리. 권장: `bg-primary/10`.

---

## 5. 화면별 스펙

### 5.1 로그인 (`/login`) — 첫인상, 가장 공들일 화면

**분위기**: 화면 상단 60%는 선셋 그라데이션 히어로(깊은 코랄→앰버, 미세한 노이즈/빛망울), 하단 40%는 떠오르는 시트 형태의 로그인 카드. 카드 중심의 현재 구현(`LoginPage.tsx`)을 풀스크린 히어로 구조로 교체.

```tsx
<div className="relative flex min-h-dvh flex-col bg-sunset">
  {/* 히어로 영역 */}
  <div className="flex flex-1 flex-col items-center justify-center px-8 text-white animate-fade-up">
    <div className="flex size-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm mb-5">
      {/* 앱 아이콘 글리프 (6.3 SVG의 흰색 버전) */}
    </div>
    <h1 className="text-[32px] font-bold tracking-[-0.02em]">ShareSnap</h1>
    <p className="mt-2 text-[15px] text-white/85">추억을 모아, 빛나게</p>
  </div>

  {/* 로그인 시트 — 바닥에서 올라온 카드 */}
  <div className="rounded-t-3xl bg-background px-6 pt-8 pb-[calc(2rem+env(safe-area-inset-bottom))]
    animate-fade-up [animation-delay:120ms] space-y-4">
    <KakaoLoginButton />   {/* h-12, 4.1 스펙 */}
    {/* ── 또는 ── 구분선 → Magic Link 폼 (h-12 Input + outline Button) */}
  </div>
</div>
```

- `min-h-dvh` 사용 (카카오 인앱 브라우저 주소창 변동 대응 — `100vh` 금지)
- `next` 파라미터(초대 링크 경유) 존재 시 히어로에 "OO방에 초대받았어요" 컨텍스트 문구 노출 권장

### 5.2 방 목록 (`/rooms`) — 커버 이미지 카드

**분위기**: 사진이 먼저 보이는 매거진 느낌. 현재의 텍스트 행 카드를 커버 카드로 교체.

```tsx
<Card className="overflow-hidden rounded-2xl border-border/60 active:scale-[0.98] transition-transform">
  {/* 커버: 방의 최신 사진 or 그라데이션 폴백 */}
  <div className="relative aspect-[2/1] bg-sunset">
    {coverUrl && <img src={coverUrl} className="absolute inset-0 size-full object-cover" />}
    <div className="absolute inset-0 bg-scrim-photo" />
    {/* 스크림 위 정보 — 항상 흰색 */}
    <div className="absolute bottom-3 left-4 right-4 text-white">
      <h3 className="text-[17px] font-semibold tracking-[-0.01em] line-clamp-1">{room.name}</h3>
      <p className="text-[12px] text-white/80">사진 {photoCount}장 · 멤버 {memberCount}명</p>
    </div>
    {room.myRole === "owner" && (
      <Badge className="absolute top-3 right-3 bg-white/20 text-white backdrop-blur-sm border-0">방장</Badge>
    )}
  </div>
</Card>
```

- 헤더: `text-2xl font-bold` "공유방" + 우측 `Plus` 아이콘 버튼(방 만들기)
- 사진 없는 새 방의 폴백 커버는 `bg-sunset` + 방 이름 이니셜 — 빈 회색 박스 금지

### 5.3 채팅방 (`/rooms/[id]`)

**분위기**: 메신저 표준 문법 + ShareSnap 톤. 배경은 `bg-background`(웜 톤이 그대로 카톡과 차별화 포인트).

- **헤더**: `sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50`, 좌측 `ChevronLeft`, 중앙 방 이름(`text-[17px] font-semibold`) + 멤버 수 캡션, 우측 `Share2`(카카오 초대)·`Images`(갤러리 진입)
- **버블**: 4.4 스펙
- **입력 바**: `sticky bottom-0 bg-background/80 backdrop-blur-xl border-t border-border/50 px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]`. 좌측 `Plus`(사진 첨부) 아이콘 버튼 size-11, 중앙 `rounded-full bg-muted h-11 px-4` 입력, 우측 전송 버튼 `size-11 rounded-full bg-primary text-primary-foreground disabled:bg-muted` + `ArrowUp` 아이콘
- 채팅방은 하단 네비 숨김(`hideNav`) — 전체 높이를 대화에 사용

### 5.4 사진 갤러리 (Phase 3 신규)

**분위기**: 사진 외 모든 UI 제거 수준의 미니멀. 그리드/타임라인 토글.

```tsx
{/* 그리드 모드 — 간격 2px, 라운드 없음 (애플 사진 문법) */}
<div className="grid grid-cols-3 gap-0.5">
  <button className="relative aspect-square active:opacity-80 transition-opacity">
    <img className="absolute inset-0 size-full object-cover" loading="lazy" />
  </button>
</div>

{/* 타임라인 모드 — 날짜 섹션 헤더 (sticky) */}
<h2 className="sticky top-14 z-10 bg-background/80 backdrop-blur-md
  px-4 py-2 text-[13px] font-semibold text-muted-foreground">
  5월 24일 토요일
</h2>
```

- 토글: 갤러리 헤더 우측 `LayoutGrid`/`Rows3` 세그먼트 컨트롤 (`bg-muted rounded-lg p-0.5` 안에 활성 `bg-card shadow-sm rounded-md`)
- 다중 선택 모드: 길게 누르기 진입, 선택 시 `ring-3 ring-primary` + 우상단 체크 원(`bg-primary`), 하단에 글래스 액션 바 슬라이드 업
- 업로드 진행: 썸네일 위 `bg-black/50` 오버레이 + 원형 프로그레스(코랄), 퍼센트는 `tabular-nums`

### 5.5 사진 뷰어 — 몰입형 다크 (테마 무관 강제 블랙)

**분위기**: 어떤 테마든 뷰어 진입 순간 순수 블랙 극장. UI는 탭하면 사라진다.

```tsx
<div className="fixed inset-0 z-50 bg-black">  {/* bg-background 아님 — 의도된 하드코딩 */}
  <img className="size-full object-contain" />

  {/* 상단 바 — 스크림 + 안전영역 */}
  <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/60 to-transparent
    pt-safe px-2 pb-6 flex items-center justify-between text-white
    transition-opacity duration-200 data-[hidden=true]:opacity-0">
    <button className="size-11 grid place-items-center"><X className="size-6" /></button>
    <span className="text-[13px] tabular-nums text-white/80">3 / 24</span>
    <button className="size-11 grid place-items-center"><MoreVertical className="size-5" /></button>
  </div>

  {/* 하단 바 — 업로더 정보 + 액션 */}
  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent
    px-4 pt-10 pb-[calc(1rem+env(safe-area-inset-bottom))] text-white">
    {/* Avatar + 닉네임 + 상대시간 / 우측: Heart·MessageCircle·Download 아이콘 행 (각 size-11 터치영역) */}
  </div>
</div>
```

- 좌우 스와이프 이동, 아래로 드래그 시 dismiss(배경 알파가 드래그 거리에 비례해 감소)
- 코멘트는 하단 시트(`Sheet` side="bottom", `rounded-t-3xl max-h-[70dvh]`)로 — 뷰어 위에 겹쳐서

### 5.6 초대 페이지 (`/join/[shareCode]`) — 전환율이 목적인 화면

**분위기**: 카카오톡에서 링크를 누른 비로그인 사용자가 보는 첫 화면. "어떤 방인지"를 먼저 보여주고 안심시킨 뒤 입장시킨다. 현재 즉시 redirect 구조에서, **방 미리보기 → 로그인 → 자동 입장** 구조로 개선 권장.

```tsx
<div className="flex min-h-dvh flex-col">
  {/* 상단: 방 커버 미리보기 (5.2 커버 카드와 동일 문법, aspect-[4/3]) */}
  {/* 중앙: 방 이름 H2 + "OO님이 초대했어요" 캡션 + 멤버 아바타 스택 */}
  <div className="flex -space-x-2">
    <Avatar className="size-8 ring-2 ring-background" /> {/* 최대 5개 + "+N" 원 */}
  </div>
  {/* 하단 고정: 카카오 버튼(비로그인) 또는 "입장하기" Primary CTA(로그인됨) */}
  <div className="mt-auto px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
</div>
```

---

## 6. 아이콘 전략

### 6.1 lucide-react 운용 규칙 (이미 설치됨: `lucide-react@^1.16`)

| 컨텍스트 | 크기 | strokeWidth |
|----------|------|------------|
| 하단 네비 | `size-6` (24px) | 비활성 1.8 / 활성 2.4 |
| 헤더 액션 | `size-5` ~ `size-6`, 터치영역 `size-11` 버튼으로 감쌈 | 2 |
| 인라인(텍스트 옆) | `size-4` | 2 |
| 엠티 스테이트 | `size-9` | 1.5 (큰 아이콘은 얇게) |

### 6.2 MobileLayout 이모지 → lucide 교체 스펙

`src/modules/shared/components/MobileLayout.tsx`의 `NAV_ITEMS`를 다음으로 교체 (마크업은 4.5 글래스 네비 스펙 적용):

```tsx
import { Images, BookHeart, ShoppingBag, UserRound } from "lucide-react";

const NAV_ITEMS = [
  { href: "/rooms", label: "공유방", icon: Images },
  { href: "/photobooks", label: "포토북", icon: BookHeart },
  { href: "/orders", label: "주문", icon: ShoppingBag },
  { href: "/me", label: "내정보", icon: UserRound },
] as const;
```

### 6.3 전역 아이콘 어휘 사전 (일관성 — 같은 의미엔 항상 같은 아이콘)

| 의미 | 아이콘 | 의미 | 아이콘 |
|------|--------|------|--------|
| 사진 추가/업로드 | `ImagePlus` | 카카오/일반 공유 | `Share2` |
| 뒤로 | `ChevronLeft` | 닫기 | `X` |
| 더보기 메뉴 | `MoreVertical` | 전송 | `ArrowUp` (원형 버튼 안) |
| 좋아요 | `Heart` (활성: `fill-current text-primary`) | 코멘트 | `MessageCircle` |
| 다운로드 | `Download` | 멤버 | `Users` |
| 방 만들기/추가 | `Plus` | 링크 복사 | `Link2` |
| 갤러리 그리드 | `LayoutGrid` | 타임라인 | `Rows3` |
| 설정 | `Settings` | 알림 | `Bell` |

### 6.4 앱 아이콘 — `public/icons/icon.svg` (현재 폴더 비어 있음)

**컨셉**: 선셋 그라데이션 배경 위, 살짝 기울어진 흰 폴라로이드 한 장(= 방금 모인 추억) + 그 안의 태양·산 글리프 + 우상단 스파클(= 빛나게).

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="sunset" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#F2654C"/>
      <stop offset="0.55" stop-color="#F58A4B"/>
      <stop offset="1" stop-color="#F6B14A"/>
    </linearGradient>
  </defs>
  <!-- 배경 (maskable: 콘텐츠는 중앙 80% 안에) -->
  <rect width="512" height="512" rx="120" fill="url(#sunset)"/>
  <!-- 폴라로이드 프레임 (-5도 틸트) -->
  <g transform="rotate(-5 256 268)">
    <rect x="128" y="138" width="256" height="260" rx="28" fill="#FFFFFF"/>
    <rect x="148" y="158" width="216" height="180" rx="16" fill="#FBE9DF"/>
    <!-- 태양 -->
    <circle cx="216" cy="226" r="26" fill="#F6B14A"/>
    <!-- 산 두 개 -->
    <path d="M148 338 L232 246 L282 300 L324 258 L364 338 Z" fill="#F2654C"/>
  </g>
  <!-- 스파클 -->
  <path d="M384 112 l11 30 30 11 -30 11 -11 30 -11 -30 -30 -11 30 -11 z" fill="#FFFFFF"/>
</svg>
```

파생 산출물 (manifest의 `icon-192.png`/`icon-512.png` 참조가 현재 깨져 있음):

```bash
# icon.svg → PNG 변환 (sharp-cli 등 사용)
npx sharp-cli -i public/icons/icon.svg -o public/icons/icon-512.png resize 512 512
npx sharp-cli -i public/icons/icon.svg -o public/icons/icon-192.png resize 192 192
```

`manifest.json` 동시 수정: `"theme_color": "#F2654C"`, `"background_color": "#FBF8F3"`.

---

## 7. 접근성

### 7.1 대비 기준 (검증된 조합표)

| 조합 | 대비(근사) | 판정 | 규칙 |
|------|-----------|------|------|
| `foreground` / `background` (light) | 12:1+ | AAA | 본문 자유 사용 |
| `muted-foreground` / `background` (light) | 4.6:1 | AA | 13px 캡션까지 OK |
| 흰 텍스트 / `primary` 코랄 (light) | 약 3.3:1 | AA Large·UI | **버튼 텍스트는 16px semibold 이상 + UI 컴포넌트(3:1)로만 사용. 15px 이하 일반 텍스트 금지** |
| `coral-deep` / `background` (light) | 4.5:1+ | AA | 소형 코랄 텍스트는 반드시 이것 |
| `primary-foreground`(진갈색) / `primary` (dark) | 7:1+ | AAA | 다크 버튼 안전 |
| `#191919` / `#FEE500` 카카오 | 14:1+ | AAA | — |
| 흰 텍스트 / 사진 위 | 가변 | — | **반드시 `bg-scrim-photo` 스크림 위에만** 텍스트 배치 (5.2 커버 카드 패턴) |

### 7.2 터치 타깃

- 최소 44×44px, 표준 48px: CTA `h-12`, 보조 버튼 `h-11`, 아이콘 버튼은 시각 크기와 무관하게 `size-11` 이상의 히트 영역으로 감싼다
- 하단 네비 항목: 높이 64px 전체가 히트 영역 (`flex h-16 items-stretch`)
- 인접 타깃 간격 최소 8px (`gap-2`)

### 7.3 모션·줌·포커스

- `prefers-reduced-motion: reduce` 전역 무력화 — 1장 globals.css에 포함됨. 추가로 장식 모션은 `motion-safe:animate-fade-up`처럼 `motion-safe:` 변형 사용 권장
- **핀치줌 차단 해제**: 현재 `layout.tsx`의 `maximumScale: 1, userScalable: false`는 WCAG 1.4.4 위반 → 2.1 코드처럼 `maximumScale: 5` 로 수정 (입력 포커스 자동 줌은 input 폰트 16px↑ 또는 15px 유지 시 iOS에서 미세 줌 발생 — CTA 입력은 `text-base`(16px)로 지정해 회피)
- 포커스 링: shadcn 기본 `focus-visible:ring-3 ring-ring/50` 유지 — ring 색이 코랄로 바뀌므로 추가 작업 불필요
- 아이콘 전용 버튼은 `aria-label` 필수, 사진에는 `alt`(업로더·시간 기반 자동 문구라도) 필수
- 다크/라이트 모두에서 `Toaster`는 `richColors` 유지하되 position은 채팅 입력을 가리지 않도록 `top-center` 유지

---

## 8. Phase 3 적용 체크리스트 (구현 순서)

1. `src/app/globals.css` 전체 교체 (1장 코드) → `npm run build` 확인
2. `src/app/layout.tsx` 교체 (2.1 코드: Pretendard CDN + ThemeProvider + themeColor 교정 + 줌 해제)
3. `public/manifest.json` theme_color/background_color 교정 + `public/icons/icon.svg` 생성, PNG 파생 (6.4)
4. `MobileLayout.tsx` — lucide 네비 + 글래스모피즘 + safe-area (4.5, 6.2)
5. `KakaoLoginButton.tsx` — `bg-kakao` 토큰화 + h-12 (4.1)
6. `LoginPage.tsx` — 그라데이션 히어로 구조 (5.1)
7. `RoomList.tsx` — 커버 카드 + 스켈레톤 + 엠티 스테이트 (5.2, 3.4, 4.7)
8. `MessageList.tsx`/`MessageInput.tsx` — 버블·입력 바 (4.4, 5.3)
9. `src/app/(main)/template.tsx` 추가 — 페이지 전환 모션 (3.2)
10. Phase 3 신규 갤러리/뷰어는 처음부터 5.4·5.5 스펙으로 구현
