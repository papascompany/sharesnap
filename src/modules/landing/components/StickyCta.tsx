"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * 스크롤 인지형 하단 스티키 CTA 바.
 * - 히어로를 지나면 등장, 페이지 하단(파이널 CTA/푸터) 근처에선 숨김(중복 노출 방지).
 * - prefers-reduced-motion은 globals.css가 transition 무력화 → 즉시 토글.
 */
export function StickyCta({ isAuthed }: { isAuthed: boolean }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        const vh = window.innerHeight;
        const docH = document.documentElement.scrollHeight;
        const nearBottom = y + vh > docH - 560;
        setShow(y > vh * 0.7 && !nearBottom);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/80 px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 backdrop-blur-xl backdrop-saturate-150 transition-all duration-300 ${
        show
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-full opacity-0"
      }`}
    >
      <div className="mx-auto flex max-w-md items-center justify-between gap-3">
        <p className="text-[12px] font-medium leading-tight text-muted-foreground">
          앱 설치 없이
          <br />
          카톡으로 1탭 시작
        </p>
        {isAuthed ? (
          <Link href="/rooms" className="shrink-0">
            <span className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-[15px] font-semibold text-primary-foreground transition-transform active:scale-[0.97]">
              내 공유방으로
            </span>
          </Link>
        ) : (
          <Link href="/login?next=%2Frooms" className="shrink-0">
            <span className="inline-flex h-11 items-center justify-center rounded-xl bg-kakao px-6 text-[15px] font-semibold text-kakao-foreground transition-transform active:scale-[0.97]">
              카카오로 시작하기
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}
