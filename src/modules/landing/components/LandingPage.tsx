// 루트(/) 공개 랜딩 — "추억을 모아 빛나게"
// 디자인 단일소스: docs/design-system.md (선셋 코랄/앰버 bg-sunset·text-sunset, 웜페이퍼/시네마다크, Pretendard)
// 콘텐츠: CMS(site_content)에서 주입(content prop). 사진은 PhotoFrame(실사 url 우선, 없으면 SceneTile).
// 반응형: 모바일 우선 + 데스크톱(lg) 2열 히어로 + 와이드 에디토리얼 레이아웃.

import Link from "next/link";
import {
  Share2,
  Images,
  BookHeart,
  ShoppingBag,
  MessageCircle,
  Camera,
  Sparkles,
  ChevronRight,
  CreditCard,
  Download,
  Zap,
  Users,
  Heart,
  CheckCircle2,
  LockKeyhole,
  EyeOff,
  Smartphone,
  ShieldCheck,
} from "lucide-react";
import { Reveal } from "@/modules/landing/components/Reveal";
import { StickyCta } from "@/modules/landing/components/StickyCta";
import { PhotoFrame } from "@/modules/landing/components/PhotoFrame";
import type { LandingContent, PhotoSlot } from "@/modules/landing/content";

// ── 주 CTA (카카오 / 내 공유방) ──
function PrimaryCta({
  isAuthed,
  size = "lg",
  className = "",
}: {
  isAuthed: boolean;
  size?: "lg" | "md";
  className?: string;
}) {
  const h = size === "lg" ? "h-12 text-[16px]" : "h-11 text-[15px]";
  if (isAuthed) {
    return (
      <Link href="/rooms" className={className}>
        <span
          className={`inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-7 font-semibold text-primary-foreground shadow-sm transition-transform active:scale-[0.97] ${h}`}
        >
          내 공유방으로
          <ChevronRight className="size-[18px]" aria-hidden />
        </span>
      </Link>
    );
  }
  return (
    <Link href="/login?next=%2Frooms" className={className}>
      <span
        className={`inline-flex w-full items-center justify-center gap-2 rounded-xl bg-kakao px-7 font-semibold text-kakao-foreground shadow-sm transition-transform active:scale-[0.97] ${h}`}
      >
        <MessageCircle className="size-[18px]" aria-hidden />
        카카오로 시작하기
      </span>
    </Link>
  );
}

// ── 폴라로이드 (실사 사진 또는 SceneTile 폴백) ──
function Polaroid({
  slot,
  rotate,
  className = "",
  float,
  priority = false,
}: {
  slot: PhotoSlot;
  rotate: number;
  className?: string;
  float?: "float" | "float-slow";
  priority?: boolean;
}) {
  const floatCls =
    float === "float"
      ? "motion-safe:animate-float"
      : float === "float-slow"
        ? "motion-safe:animate-float-slow"
        : "";
  return (
    <div
      className={`rounded-2xl bg-white p-2 pb-1 shadow-xl ring-1 ring-black/5 ${floatCls} ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-lg">
        <PhotoFrame
          url={slot.url}
          scene={slot.scene}
          alt={slot.caption}
          rounded="rounded-lg"
          scrim={slot.url ? 0.28 : 0.5}
          priority={priority}
        />
      </div>
      <p className="px-0.5 pt-1.5 pb-0.5 text-center text-[10px] font-medium text-zinc-500">
        {slot.caption}
      </p>
    </div>
  );
}

// ── 섹션 공통 헤딩 (title은 \n 줄바꿈 허용 문자열) ──
function SectionHead({
  eyebrow,
  title,
  desc,
  align = "center",
}: {
  eyebrow?: string;
  title: string;
  desc?: React.ReactNode;
  align?: "center" | "left";
}) {
  return (
    <div className={align === "center" ? "text-center" : "text-left"}>
      {eyebrow ? (
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-primary">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="whitespace-pre-line text-[clamp(24px,5vw,36px)] font-bold leading-[1.18] tracking-[-0.02em]">
        {title}
      </h2>
      {desc ? (
        <p
          className={`mt-3 max-w-md text-[15px] leading-relaxed text-muted-foreground ${
            align === "center" ? "mx-auto" : ""
          }`}
        >
          {desc}
        </p>
      ) : null}
    </div>
  );
}

export function LandingPage({
  isAuthed,
  content,
}: {
  isAuthed: boolean;
  content: LandingContent;
}) {
  const {
    hero,
    heroPolaroids,
    bento,
    photobookCover,
    headings,
    slogan,
    emotion,
    how,
    value,
    collage,
    showcase,
    viral,
    faq,
    trust,
    final,
  } = content;

  // 아이콘/번호/레이아웃은 코드 고정, 텍스트만 content에서 주입(인덱스로 zip).
  const howIcons = [Share2, Images, BookHeart] as const;
  const stepNums = ["01", "02", "03"] as const;
  const valueIcons = [MessageCircle, Camera, BookHeart, ShoppingBag] as const;
  const valueLayout = [
    { wide: true, kakao: true },
    { wide: false, kakao: false },
    { wide: false, kakao: false },
    { wide: true, kakao: false },
  ] as const;
  const trustIcons = [LockKeyhole, EyeOff, CreditCard, Smartphone] as const;
  const finalChipIcons = [CreditCard, Download, Zap] as const;

  return (
    <main className="overflow-x-hidden bg-background">
      {/* ───────────── 헤더 ───────────── */}
      <header className="absolute inset-x-0 top-0 z-30">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 pt-safe sm:h-20">
          <span className="text-[19px] font-bold tracking-[-0.02em] text-white drop-shadow-sm sm:text-[22px]">
            ShareSnap
          </span>
          <Link
            href={isAuthed ? "/rooms" : "/login?next=%2Frooms"}
            className="rounded-full bg-white/15 px-4 py-2 text-[13px] font-semibold text-white backdrop-blur-md transition active:scale-[0.97] sm:px-5 sm:text-[14px]"
          >
            {isAuthed ? "내 공유방" : "시작하기"}
          </Link>
        </div>
      </header>

      {/* ───────────── 히어로 (데스크톱 2열) ───────────── */}
      <section className="relative isolate flex min-h-[92svh] items-center overflow-hidden bg-sunset px-5 pb-16 pt-24 lg:min-h-screen lg:pt-20">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 top-10 size-72 rounded-full bg-white/25 blur-3xl motion-safe:animate-float lg:size-[28rem]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 bottom-0 size-80 rounded-full bg-amber-300/30 blur-3xl motion-safe:animate-float-slow lg:size-[32rem]"
        />

        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 text-white lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
          {/* 좌: 카피 + CTA */}
          <div className="mx-auto max-w-md text-center lg:mx-0 lg:max-w-none lg:text-left">
            <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-[12.5px] font-semibold backdrop-blur-md animate-fade-in">
              <Sparkles className="size-3.5" aria-hidden />
              {hero.eyebrow}
            </span>

            <h1
              className="whitespace-pre-line font-bold leading-[1.12] tracking-[-0.03em] animate-fade-up [text-shadow:0_2px_24px_rgb(0_0_0/0.16)]"
              style={{ fontSize: "clamp(33px, 6.2vw, 68px)" }}
            >
              {hero.headline}
            </h1>

            <p
              className="mx-auto mt-5 max-w-sm text-[15.5px] leading-relaxed text-white/90 animate-fade-up lg:mx-0 lg:max-w-md lg:text-[17px]"
              style={{ animationDelay: "80ms" }}
            >
              {hero.subhead}
            </p>

            {/* 모바일: 폴라로이드 콜라주(좌측 카피 아래). 데스크톱에선 우측 컬럼이 담당 */}
            <div className="relative mx-auto mt-9 mb-9 flex h-40 w-full max-w-xs items-center justify-center lg:hidden">
              <Polaroid
                slot={heroPolaroids[0]}
                rotate={-13}
                float="float-slow"
                className="absolute left-2 top-2 w-24 animate-fade-up"
              />
              <Polaroid
                slot={heroPolaroids[1]}
                rotate={4}
                float="float"
                className="absolute z-10 w-28 animate-scale-in"
              />
              <Polaroid
                slot={heroPolaroids[2]}
                rotate={14}
                float="float-slow"
                className="absolute right-2 top-3 w-24 animate-fade-up"
              />
            </div>

            <div className="mx-auto flex max-w-xs flex-col gap-2.5 lg:mx-0 lg:max-w-sm lg:flex-row">
              <PrimaryCta isAuthed={isAuthed} className="lg:flex-1" />
              <Link
                href="#how-it-works"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-white/30 bg-white/10 px-6 text-[15px] font-semibold text-white backdrop-blur-md transition active:scale-[0.97] lg:h-12"
              >
                먼저 둘러보기
              </Link>
            </div>
            <p className="mt-3.5 text-[12px] text-white/75">{hero.microcopy}</p>
          </div>

          {/* 우: 데스크톱 전용 큰 폴라로이드 콜라주 */}
          <div className="relative hidden h-[30rem] lg:block">
            <Polaroid
              slot={heroPolaroids[1]}
              rotate={-6}
              float="float"
              className="absolute left-[6%] top-[8%] z-10 w-60 animate-scale-in"
              priority
            />
            <Polaroid
              slot={heroPolaroids[0]}
              rotate={-14}
              float="float-slow"
              className="absolute left-[2%] bottom-[6%] w-48 animate-fade-up"
              priority
            />
            <Polaroid
              slot={heroPolaroids[2]}
              rotate={11}
              float="float-slow"
              className="absolute right-[4%] top-[22%] w-56 animate-fade-up"
              priority
            />
          </div>
        </div>
      </section>

      {/* ───────────── 감정 훅 ───────────── */}
      <section className="px-5 py-20 lg:py-28">
        <Reveal className="mx-auto max-w-md lg:max-w-3xl lg:text-center">
          <p className="text-[13px] font-semibold text-primary">{emotion.eyebrow}</p>
          <h2 className="mt-2 whitespace-pre-line text-[clamp(23px,5vw,34px)] font-bold leading-[1.22] tracking-[-0.02em]">
            {headings.emotion}
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground lg:mx-auto lg:max-w-xl lg:text-[16px]">
            {emotion.desc}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-2.5 lg:justify-center">
            {heroPolaroids
              .concat(bento.slice(0, 3))
              .slice(0, 6)
              .map((s, i) => (
                <div
                  key={i}
                  className="relative size-14 shrink-0 overflow-hidden rounded-xl opacity-90 ring-1 ring-border/60 lg:size-16"
                  style={{ transform: `rotate(${(i % 3) - 1}deg)` }}
                >
                  <PhotoFrame url={s.url} scene={s.scene} alt="" scrim={0.2} />
                </div>
              ))}
            <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground lg:size-16">
              <MessageCircle className="size-5" aria-hidden />
            </span>
          </div>

          <ul className="mt-7 space-y-2.5 text-[14.5px] text-foreground/80 lg:mx-auto lg:flex lg:max-w-2xl lg:flex-wrap lg:justify-center lg:gap-x-6 lg:space-y-0">
            {emotion.bullets.map((t) => (
              <li key={t} className="flex items-center gap-2.5">
                <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                {t}
              </li>
            ))}
          </ul>
        </Reveal>
      </section>

      {/* ───────────── 3단계 (how-it-works) ───────────── */}
      <section
        id="how-it-works"
        className="scroll-mt-4 bg-secondary/40 px-5 py-20 lg:py-28"
      >
        <Reveal>
          <SectionHead eyebrow={how.eyebrow} title={headings.how} />
        </Reveal>

        <div className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-3 lg:mt-14 lg:gap-6">
          {how.steps.map((s, i) => {
            const Icon = howIcons[i % howIcons.length];
            const n = stepNums[i % stepNums.length];
            return (
              <Reveal key={i} delay={i * 90}>
                <div className="relative h-full overflow-hidden rounded-3xl border border-border/60 bg-card p-6 lg:p-8">
                  <span className="text-sunset text-[40px] font-extrabold leading-none tracking-tight lg:text-[48px]">
                    {n}
                  </span>
                  <div className="mt-4 inline-flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="size-6" strokeWidth={1.6} aria-hidden />
                  </div>
                  <h3 className="mt-4 text-[18px] font-bold tracking-[-0.01em] lg:text-[20px]">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground lg:text-[15px]">
                    {s.desc}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ───────────── 가치 벤토 ───────────── */}
      <section className="px-5 py-20 lg:py-28">
        <Reveal>
          <SectionHead eyebrow={value.eyebrow} title={headings.value} />
        </Reveal>
        <div className="mx-auto mt-10 grid max-w-2xl grid-cols-2 gap-3.5 lg:max-w-5xl lg:grid-cols-4 lg:gap-5">
          {value.cards.map((v, i) => {
            const Icon = valueIcons[i % valueIcons.length];
            const layout = valueLayout[i % valueLayout.length];
            return (
              <Reveal
                key={i}
                delay={i * 70}
                className={layout.wide ? "col-span-2" : ""}
              >
                <div className="flex h-full flex-col rounded-3xl border border-border/60 bg-card p-5 lg:p-6">
                  <div
                    className={`inline-flex size-11 items-center justify-center rounded-2xl ${
                      layout.kakao
                        ? "bg-kakao text-kakao-foreground"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    <Icon className="size-[22px]" strokeWidth={1.7} aria-hidden />
                  </div>
                  <h3 className="mt-3.5 text-[16px] font-bold tracking-[-0.01em] lg:text-[17px]">
                    {v.title}
                  </h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground lg:text-[14px]">
                    {v.desc}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ───────────── 소셜 콜라주(bento) ───────────── */}
      <section className="bg-secondary/40 px-5 py-20 lg:py-28">
        <Reveal>
          <SectionHead
            eyebrow={collage.eyebrow}
            title={headings.collage}
            desc={collage.desc}
          />
        </Reveal>
        <Reveal delay={80} className="mx-auto mt-9 max-w-2xl lg:mt-12 lg:max-w-4xl">
          <div className="grid grid-cols-4 gap-2.5 lg:gap-3.5">
            {bento.map((tile, idx) => {
              const span =
                idx === 0
                  ? "col-span-2 row-span-2 aspect-square"
                  : idx === 1
                    ? "col-span-2 aspect-[2/1]"
                    : "col-span-1 aspect-square";
              return (
                <div
                  key={idx}
                  className={`relative overflow-hidden rounded-2xl ring-1 ring-black/5 ${span}`}
                >
                  <PhotoFrame
                    url={tile.url}
                    scene={tile.scene}
                    alt={tile.caption}
                    scrim={tile.url ? 0.45 : 0.72}
                  />
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
                    <span className="text-[12.5px] font-semibold text-white drop-shadow lg:text-[14px]">
                      {tile.caption}
                    </span>
                    {tile.meta ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10.5px] font-medium text-white backdrop-blur-sm">
                        <Users className="size-3" aria-hidden />
                        {tile.meta}
                      </span>
                    ) : null}
                  </div>
                  {idx === 0 ? (
                    <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/25 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
                      <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                      실시간
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-center text-[11.5px] text-muted-foreground">
            {collage.note}
          </p>
        </Reveal>
      </section>

      {/* ───────────── 포토북 쇼케이스 ───────────── */}
      <section className="px-5 py-20 lg:py-28">
        <div className="mx-auto grid max-w-4xl items-center gap-10 md:grid-cols-2 lg:max-w-5xl lg:gap-16">
          <Reveal className="order-2 md:order-1">
            <SectionHead align="left" eyebrow={showcase.eyebrow} title={headings.showcase} />
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground lg:text-[16px]">
              {showcase.desc}
            </p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {showcase.tags.map((s) => (
                <li
                  key={s}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1.5 text-[12.5px] font-medium text-foreground/80"
                >
                  <CheckCircle2 className="size-3.5 text-primary" aria-hidden />
                  {s}
                </li>
              ))}
            </ul>
          </Reveal>

          {/* 포토북 3D 목업 */}
          <Reveal delay={100} className="order-1 md:order-2">
            <div className="relative mx-auto flex aspect-square w-full max-w-xs items-center justify-center lg:max-w-sm">
              <div
                aria-hidden
                className="absolute size-56 rounded-full bg-sunset opacity-20 blur-3xl lg:size-72"
              />
              <div className="relative w-52 [perspective:1200px] lg:w-64">
                <div className="relative aspect-[3/4] w-full rounded-r-md rounded-l-sm bg-sunset p-5 shadow-2xl [transform:rotateY(-16deg)_rotateX(4deg)] motion-safe:animate-float">
                  <div className="absolute inset-y-0 left-0 w-2.5 rounded-l-sm bg-black/15" />
                  <div className="flex h-full flex-col justify-between text-white">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-white/80">
                      ShareSnap Photobook
                    </span>
                    <div className="rounded-xl bg-white/15 p-2 backdrop-blur-sm">
                      <div className="relative aspect-square w-full overflow-hidden rounded-lg">
                        <PhotoFrame
                          url={photobookCover.url}
                          scene={photobookCover.scene}
                          alt={photobookCover.caption}
                          rounded="rounded-lg"
                          scrim={photobookCover.url ? 0.25 : 0.4}
                        />
                      </div>
                    </div>
                    <div>
                      <Sparkles className="mb-1 size-5" aria-hidden />
                      <p className="whitespace-pre-line text-[19px] font-bold leading-tight tracking-[-0.01em]">
                        {photobookCover.caption}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ───────────── 바이럴 (친구 다 같이) ───────────── */}
      <section className="relative isolate overflow-hidden bg-sunset px-5 py-20 lg:py-28">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 top-6 size-64 rounded-full bg-white/20 blur-3xl motion-safe:animate-float-slow lg:size-96"
        />
        <div className="relative mx-auto max-w-md text-center text-white lg:max-w-3xl">
          <Reveal>
            <h2 className="whitespace-pre-line text-[clamp(24px,5.5vw,38px)] font-bold leading-[1.18] tracking-[-0.02em] [text-shadow:0_2px_20px_rgb(0_0_0/0.15)]">
              {headings.viral}
            </h2>
            <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-white/90 lg:max-w-md lg:text-[16px]">
              {viral.desc}
            </p>
          </Reveal>

          <Reveal delay={90} className="mx-auto mt-8 max-w-xs">
            <div className="rounded-2xl bg-white/12 p-4 text-left backdrop-blur-md ring-1 ring-white/20">
              <p className="text-[13px] font-medium text-white/90">
                우리 여행 사진 여기 다 모으자 📸
              </p>
              <div className="mt-3 rounded-xl bg-white p-3 text-zinc-900 shadow-lg">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-sunset text-white">
                    <Images className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-bold leading-tight">
                      제주 2박 3일 공유방
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      사진 모으러 들어오기
                    </p>
                  </div>
                </div>
                <span className="mt-2.5 flex h-9 items-center justify-center rounded-lg bg-kakao text-[13px] font-semibold text-kakao-foreground">
                  카카오로 1탭 참여
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div className="flex -space-x-2">
                  {heroPolaroids.concat(bento[0]).map((s, i) => (
                    <span
                      key={i}
                      className="relative size-6 overflow-hidden rounded-full ring-2 ring-white/80"
                    >
                      <PhotoFrame url={s.url} scene={s.scene} alt="" scrim={0} />
                    </span>
                  ))}
                </div>
                <span className="text-[11.5px] text-white/85">
                  친구들이 들어오고 있어요
                </span>
              </div>
            </div>
          </Reveal>

          <Reveal delay={150} className="mx-auto mt-8 max-w-xs">
            <PrimaryCta isAuthed={isAuthed} />
          </Reveal>
        </div>
      </section>

      {/* ───────────── FAQ ───────────── */}
      <section className="px-5 py-20 lg:py-28">
        <Reveal>
          <SectionHead eyebrow={faq.eyebrow} title={faq.title} />
        </Reveal>
        <Reveal delay={70} className="mx-auto mt-8 max-w-xl space-y-2.5">
          {faq.items.map((f) => (
            <details
              key={f.q}
              className="group rounded-2xl border border-border/60 bg-card px-5 [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-[15px] font-semibold">
                {f.q}
                <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
              </summary>
              <p className="pb-4 text-[14px] leading-relaxed text-muted-foreground">
                {f.a}
              </p>
            </details>
          ))}
        </Reveal>
      </section>

      {/* ───────────── 신뢰 밴드 (정직한 보장) ───────────── */}
      <section className="px-5 py-20 lg:py-28">
        <Reveal>
          <SectionHead
            eyebrow={trust.eyebrow}
            title={trust.title}
            desc={trust.desc}
          />
        </Reveal>

        <div className="mx-auto mt-10 grid max-w-2xl grid-cols-2 gap-3.5 lg:max-w-5xl lg:grid-cols-4 lg:gap-5">
          {trust.cards.map((g, i) => {
            const Icon = trustIcons[i % trustIcons.length];
            return (
              <Reveal key={i} delay={i * 70}>
                <div className="flex h-full flex-col rounded-3xl border border-border/60 bg-card p-5 lg:p-6">
                  <div className="inline-flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="size-[22px]" strokeWidth={1.7} aria-hidden />
                  </div>
                  <h3 className="mt-3.5 text-[16px] font-bold tracking-[-0.01em]">
                    {g.title}
                  </h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
                    {g.desc}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={120} className="mx-auto mt-7 max-w-md">
          <p className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border/60 bg-secondary/40 px-4 py-3 text-center text-[13px] font-medium text-foreground/75">
            <ShieldCheck className="size-4 shrink-0 text-primary" aria-hidden />
            {trust.note}
          </p>
        </Reveal>
      </section>

      {/* ───────────── 파이널 CTA (풀블리드 선셋) ───────────── */}
      <section className="relative isolate overflow-hidden bg-sunset px-5 py-24 text-white lg:py-32">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 size-96 -translate-x-1/2 rounded-full bg-white/15 blur-3xl"
        />
        <Reveal className="relative mx-auto max-w-md text-center lg:max-w-2xl">
          <div className="mx-auto mb-8 flex items-end justify-center gap-1.5">
            {heroPolaroids
              .concat(bento.slice(0, 2))
              .slice(0, 5)
              .map((s, i) => (
                <span
                  key={i}
                  className="relative overflow-hidden rounded-md ring-1 ring-white/30"
                  style={{
                    width: i === 2 ? 48 : 28,
                    height: i === 2 ? 60 : 32,
                    transform: `translateY(${i === 2 ? -6 : 0}px) rotate(${
                      (i - 2) * 5
                    }deg)`,
                  }}
                >
                  <PhotoFrame url={s.url} scene={s.scene} alt="" scrim={0.1} />
                </span>
              ))}
          </div>
          <h2 className="whitespace-pre-line text-[clamp(26px,6vw,42px)] font-bold leading-[1.16] tracking-[-0.02em] [text-shadow:0_2px_20px_rgb(0_0_0/0.16)]">
            {headings.final}
          </h2>
          <p className="mt-3 text-[15.5px] text-white/90 lg:text-[17px]">
            {final.desc}
          </p>
          <p className="mt-6 text-[26px] font-bold tracking-[-0.01em] lg:text-[32px]">
            {slogan}
          </p>

          <div className="mx-auto mt-7 max-w-xs">
            <PrimaryCta isAuthed={isAuthed} />
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[12px] text-white/85">
            {final.chips.map((chip, i) => {
              const ChipIcon = finalChipIcons[i % finalChipIcons.length];
              return (
                <span key={i} className="inline-flex items-center gap-1.5">
                  <ChipIcon className="size-3.5" aria-hidden />
                  {chip}
                </span>
              );
            })}
          </div>
          <p className="mt-5 inline-flex items-center gap-1.5 text-[12px] text-white/75">
            <Heart className="size-3.5" aria-hidden />
            {final.privacy}
          </p>
        </Reveal>
      </section>

      {/* ───────────── 푸터 ───────────── */}
      <footer className="border-t border-border/60 bg-background px-5 py-12 pb-[max(env(safe-area-inset-bottom),3rem)]">
        <div className="mx-auto max-w-6xl">
          <p className="text-[18px] font-bold tracking-[-0.02em]">ShareSnap</p>
          <p className="mt-1 text-[13px] text-muted-foreground">{slogan}</p>
          <nav className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[13px] font-medium text-coral-deep">
            <Link href="#how-it-works">둘러보기</Link>
            <Link href={isAuthed ? "/rooms" : "/login?next=%2Frooms"}>
              시작하기
            </Link>
          </nav>
          <p className="mt-6 text-[12px] text-muted-foreground">
            © ShareSnap. All rights reserved.
          </p>
        </div>
      </footer>

      <StickyCta isAuthed={isAuthed} />
    </main>
  );
}
