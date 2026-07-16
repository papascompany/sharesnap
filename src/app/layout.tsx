import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { ServiceWorkerRegister } from "@/modules/shared/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "ShareSnap — 사진 공유 & 포토북",
  description: "여행과 모임 사진을 공유하고 포토북으로 만드는 PWA 서비스",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ShareSnap",
  },
  // iOS 홈 화면 아이콘 (180×180, 모서리 라운딩 없음 — iOS가 자동 라운딩)
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  // ⚠️ 카카오 옐로 금지 — 브랜드 웜화이트/웜블랙으로 (design-system.md §2.1)
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBF8F3" },
    { media: "(prefers-color-scheme: dark)", color: "#1B1715" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // 필수: 없으면 safe-area-inset이 0 → pt-safe/pb-safe 무효
  maximumScale: 5, // 접근성: 확대 차단 금지 (WCAG 1.4.4)
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased" suppressHydrationWarning>
      <head>
        {/* Pretendard Variable dynamic-subset — 사용 글리프만 청크 로드 (카카오 인앱 첫 진입 최적화)
            보안 강화: 버전 고정 URL(@v1.3.9) + crossOrigin + referrerPolicy="no-referrer".
            ⚠️ SRI(integrity) 미적용 사유: 이 파일은 정적 CSS가 아니라 dynamic-subset CSS로,
               내부에서 글리프별 서브셋 청크(woff2)를 @import/url로 동적 참조한다. jsdelivr가
               서빙하는 바이트가 환경(요청 글리프 셋)·CDN 최적화에 따라 달라질 수 있어 콘텐츠
               해시가 깨질 위험이 높다 → 폰트 깨짐을 유발한다. 따라서 SRI 대신
               "버전 고정 + no-referrer(경로 유출 차단)"로 안전하게 강화한다.
               (완전 고정이 필요하면 운영 시 폰트를 self-host로 옮겨 SRI 적용 검토) */}
        <link
          rel="stylesheet"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster position="top-center" richColors />
          {/* PWA: Service Worker 등록 (production 한정, public/sw.js) */}
          <ServiceWorkerRegister />
          {/* 퍼널 계측 — Vercel Web Analytics (ux-flows.md §5.4) */}
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
