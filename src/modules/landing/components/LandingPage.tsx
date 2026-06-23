// 루트(/) 공개 랜딩 — "추억을 모아 빛나게"
// 디자인 단일소스: docs/design-system.md (토큰: 선셋 코랄/앰버 bg-sunset·text-sunset, 웜페이퍼/시네마다크, Pretendard)
// 구조: 서버 컴포넌트 + Reveal/StickyCta(클라이언트) 합성. CTA는 isAuthed 분기(미로그인=카카오, 로그인=내 공유방).

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
  MountainSnow,
  Heart,
  CheckCircle2,
} from "lucide-react";
import { Reveal } from "@/modules/landing/components/Reveal";
import { StickyCta } from "@/modules/landing/components/StickyCta";

// ── 사진 플레이스홀더 그라데이션(chart-1~5 조합 — 실제 사진 없이 컬러풀한 앨범 표현) ──
const TILE: Array<[string, string]> = [
  ["--chart-1", "--chart-2"], // 코랄→앰버 (선셋)
  ["--chart-4", "--chart-2"], // 틸→앰버
  ["--chart-5", "--chart-1"], // 플럼→코랄
  ["--chart-3", "--chart-4"], // 골든→틸
  ["--chart-2", "--chart-5"], // 앰버→플럼
];
function tileStyle(i: number): React.CSSProperties {
  const [a, b] = TILE[i % TILE.length];
  return { backgroundImage: `linear-gradient(135deg, var(${a}), var(${b}))` };
}

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

// ── 폴라로이드 ──
function Polaroid({
  i,
  caption,
  rotate,
  className = "",
  float,
}: {
  i: number;
  caption?: string;
  rotate: number;
  className?: string;
  float?: "float" | "float-slow";
}) {
  // Tailwind는 리터럴 클래스만 스캔 → 동적 보간 금지(리터럴 매핑)
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
      <div
        className="relative aspect-square w-full overflow-hidden rounded-lg"
        style={tileStyle(i)}
      >
        <div className="absolute inset-0 bg-scrim-photo opacity-60" />
      </div>
      <p className="px-0.5 pt-1.5 pb-0.5 text-center text-[10px] font-medium text-zinc-500">
        {caption ?? "우리의 그날"}
      </p>
    </div>
  );
}

// ── 섹션 공통 헤딩 ──
function SectionHead({
  eyebrow,
  title,
  desc,
  align = "center",
}: {
  eyebrow?: string;
  title: React.ReactNode;
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
      <h2 className="text-[clamp(24px,6vw,34px)] font-bold leading-[1.18] tracking-[-0.02em]">
        {title}
      </h2>
      {desc ? (
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-muted-foreground">
          {desc}
        </p>
      ) : null}
    </div>
  );
}

export function LandingPage({ isAuthed }: { isAuthed: boolean }) {
  return (
    <main className="overflow-x-hidden bg-background">
      {/* ───────────── 헤더 ───────────── */}
      <header className="absolute inset-x-0 top-0 z-30">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5 pt-safe">
          <span className="text-[19px] font-bold tracking-[-0.02em] text-white drop-shadow-sm">
            ShareSnap
          </span>
          <Link
            href={isAuthed ? "/rooms" : "/login?next=%2Frooms"}
            className="rounded-full bg-white/15 px-4 py-2 text-[13px] font-semibold text-white backdrop-blur-md transition active:scale-[0.97]"
          >
            {isAuthed ? "내 공유방" : "시작하기"}
          </Link>
        </div>
      </header>

      {/* ───────────── 히어로 ───────────── */}
      <section className="relative isolate flex min-h-[92svh] flex-col justify-center overflow-hidden bg-sunset px-5 pb-16 pt-24">
        {/* 오로라 블롭 */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-20 top-10 size-72 rounded-full bg-white/25 blur-3xl motion-safe:animate-float"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 bottom-8 size-80 rounded-full bg-amber-300/30 blur-3xl motion-safe:animate-float-slow"
        />

        <div className="relative mx-auto w-full max-w-md text-center text-white">
          <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-[12.5px] font-semibold backdrop-blur-md animate-fade-in">
            <Sparkles className="size-3.5" aria-hidden />
            카톡 링크 1탭 · 앱 설치 없이
          </span>

          <h1
            className="font-bold leading-[1.12] tracking-[-0.03em] animate-fade-up [text-shadow:0_2px_24px_rgb(0_0_0/0.16)]"
            style={{ fontSize: "clamp(33px, 9vw, 56px)" }}
          >
            친구들 사진,
            <br />
            다 같이 모아
            <br />
            빛나는 한 권으로
          </h1>

          <p
            className="mx-auto mt-5 max-w-sm text-[15.5px] leading-relaxed text-white/90 animate-fade-up"
            style={{ animationDelay: "80ms" }}
          >
            흩어진 사진은 늘 한 명만 고생하죠. 카톡 링크 하나면 모두가 1탭으로
            들어와 사진을 모아요. 고르기만 하면 포토북은 저절로 완성.
          </p>

          {/* 폴라로이드 콜라주 */}
          <div className="relative mx-auto mt-9 mb-9 flex h-40 w-full max-w-xs items-center justify-center">
            <Polaroid
              i={2}
              caption="동아리 MT"
              rotate={-13}
              float="float-slow"
              className="absolute left-2 top-2 w-24 animate-fade-up"
            />
            <Polaroid
              i={0}
              caption="제주 2박 3일"
              rotate={4}
              float="float"
              className="absolute z-10 w-28 animate-scale-in"
            />
            <Polaroid
              i={3}
              caption="졸업 여행"
              rotate={14}
              float="float-slow"
              className="absolute right-2 top-3 w-24 animate-fade-up"
            />
          </div>

          <div className="mx-auto flex max-w-xs flex-col gap-2.5">
            <PrimaryCta isAuthed={isAuthed} />
            <Link
              href="#how-it-works"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-white/30 bg-white/10 px-6 text-[15px] font-semibold text-white backdrop-blur-md transition active:scale-[0.97]"
            >
              먼저 둘러보기
            </Link>
          </div>
          <p className="mt-3.5 text-[12px] text-white/75">
            카드 등록 없이 · 앱 설치 없이 · 카카오로 3초
          </p>
        </div>
      </section>

      {/* ───────────── 감정 훅 ───────────── */}
      <section className="px-5 py-20">
        <Reveal className="mx-auto max-w-md">
          <p className="text-[13px] font-semibold text-primary">그날의 사진들</p>
          <h2 className="mt-2 text-[clamp(23px,6vw,30px)] font-bold leading-[1.22] tracking-[-0.02em]">
            여행은 끝났는데, 사진은
            <br />
            다섯 개의 카톡방에 흩어져 있어요
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            누구는 안 보내고, 누구 건 화질이 깨지고, 한참 스크롤을 올려야 찾는
            우리의 그날.
          </p>

          {/* 흩어진 썸네일 */}
          <div className="mt-7 flex flex-wrap items-center gap-2.5">
            {[0, 3, 1, 4, 2, 0].map((t, i) => (
              <div
                key={i}
                className="size-14 shrink-0 overflow-hidden rounded-xl opacity-90 ring-1 ring-border/60"
                style={{ ...tileStyle(t), transform: `rotate(${(i % 3) - 1}deg)` }}
              />
            ))}
            <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
              <MessageCircle className="size-5" aria-hidden />
            </span>
          </div>

          <ul className="mt-7 space-y-2.5 text-[14.5px] text-foreground/80">
            {[
              "폰 속에 잠든 베스트 컷",
              "단톡방에 묻힌 단체샷",
              "1년 뒤엔 어디 있는지도 모를 그 순간",
            ].map((t) => (
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
        className="scroll-mt-4 bg-secondary/40 px-5 py-20"
      >
        <Reveal>
          <SectionHead
            eyebrow="딱 3단계"
            title={
              <>
                카톡 보내고, 모으고,
                <br />
                책이 돼요
              </>
            }
          />
        </Reveal>

        <div className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-3">
          {[
            {
              n: "01",
              icon: Share2,
              title: "카톡으로 부르기",
              desc: "공유방 링크를 단톡방에 보내면 끝. 앱 설치도, 따로 회원가입도 없어요. 카카오 1탭이면 입장.",
            },
            {
              n: "02",
              icon: Images,
              title: "다 같이 사진 모으기",
              desc: "각자 폰 속 사진을 올리면 실시간으로 한 화면에. 채팅으로 그날의 수다까지 함께.",
            },
            {
              n: "03",
              icon: BookHeart,
              title: "고르면 포토북 완성",
              desc: "사진만 고르면 표지·내지가 자동 편집. 인화도 포토북 주문도 한 번에.",
            },
          ].map((s, i) => (
            <Reveal key={s.n} delay={i * 90}>
              <div className="relative h-full overflow-hidden rounded-3xl border border-border/60 bg-card p-6">
                <span className="text-sunset text-[40px] font-extrabold leading-none tracking-tight">
                  {s.n}
                </span>
                <div className="mt-4 inline-flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <s.icon className="size-6" strokeWidth={1.6} aria-hidden />
                </div>
                <h3 className="mt-4 text-[18px] font-bold tracking-[-0.01em]">
                  {s.title}
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                  {s.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ───────────── 가치 벤토 ───────────── */}
      <section className="px-5 py-20">
        <Reveal>
          <SectionHead
            eyebrow="왜 ShareSnap"
            title={
              <>
                모으는 건 쉽게,
                <br />
                결과물은 자랑스럽게
              </>
            }
          />
        </Reveal>
        <div className="mx-auto mt-10 grid max-w-2xl grid-cols-2 gap-3.5">
          {[
            {
              icon: MessageCircle,
              title: "카톡 1탭 참여",
              desc: "링크 클릭 → 카카오 로그인이면 끝. 앱 설치·가입 절차 없이 웹에서 바로.",
              wide: true,
              kakao: true,
            },
            {
              icon: Camera,
              title: "모두의 사진, 실시간으로",
              desc: "누가 올려도 곧바로 한 화면에 모여요.",
            },
            {
              icon: BookHeart,
              title: "고르면 자동 포토북",
              desc: "표지부터 내지까지 자동 편집.",
            },
            {
              icon: ShoppingBag,
              title: "인화·포토북 주문까지",
              desc: "마음에 들면 그대로 주문. 손에 잡히는 진짜 책으로.",
              wide: true,
            },
          ].map((v, i) => (
            <Reveal
              key={v.title}
              delay={i * 70}
              className={v.wide ? "col-span-2" : ""}
            >
              <div className="flex h-full flex-col rounded-3xl border border-border/60 bg-card p-5">
                <div
                  className={`inline-flex size-11 items-center justify-center rounded-2xl ${
                    v.kakao
                      ? "bg-kakao text-kakao-foreground"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  <v.icon className="size-[22px]" strokeWidth={1.7} aria-hidden />
                </div>
                <h3 className="mt-3.5 text-[16px] font-bold tracking-[-0.01em]">
                  {v.title}
                </h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
                  {v.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ───────────── 소셜 콜라주(bento) ───────────── */}
      <section className="bg-secondary/40 px-5 py-20">
        <Reveal>
          <SectionHead
            eyebrow="우리 모두의 앨범"
            title={
              <>
                흩어진 사진이,
                <br />
                우리 모두의 앨범이 돼요
              </>
            }
            desc="누가 올려도 실시간으로 바로. 여행도, MT도, 가족 행사도 한 방에."
          />
        </Reveal>
        <Reveal delay={80} className="mx-auto mt-9 max-w-2xl">
          <div className="grid grid-cols-4 gap-2.5">
            {[
              { t: "제주 2박 3일", span: "col-span-2 row-span-2 aspect-square", i: 0, meta: "여러 장 · 친구들" },
              { t: "동아리 MT", span: "col-span-2 aspect-[2/1]", i: 3, meta: "" },
              { t: "엄마 환갑여행", span: "col-span-1 aspect-square", i: 4, meta: "" },
              { t: "졸업 여행", span: "col-span-1 aspect-square", i: 2, meta: "" },
            ].map((tile, idx) => (
              <div
                key={idx}
                className={`relative overflow-hidden rounded-2xl ring-1 ring-black/5 ${tile.span}`}
                style={tileStyle(tile.i)}
              >
                <div className="absolute inset-0 bg-scrim-photo" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
                  <span className="text-[12.5px] font-semibold text-white drop-shadow">
                    {tile.t}
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
            ))}
          </div>
          <p className="mt-3 text-center text-[11.5px] text-muted-foreground">
            ※ 화면은 예시예요
          </p>
        </Reveal>
      </section>

      {/* ───────────── 포토북 쇼케이스 ───────────── */}
      <section className="px-5 py-20">
        <div className="mx-auto grid max-w-4xl items-center gap-10 md:grid-cols-2">
          <Reveal className="order-2 md:order-1">
            <SectionHead
              align="left"
              eyebrow="결과물"
              title={
                <>
                  다 모으면,
                  <br />
                  이렇게 한 권이 돼요
                </>
              }
            />
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              표지부터 마지막 장까지 자동 편집. 인스타에 올리고 싶은 표지, 손에
              잡히는 진짜 책으로.
            </p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {[
                "정사각 210×210",
                "A4 · A5",
                "자동 레이아웃",
                "인쇄용 PDF",
              ].map((s) => (
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
            <div className="relative mx-auto flex aspect-square w-full max-w-xs items-center justify-center">
              <div
                aria-hidden
                className="absolute size-56 rounded-full bg-sunset opacity-20 blur-3xl"
              />
              <div className="relative w-52 [perspective:1200px]">
                <div className="relative aspect-[3/4] w-full rounded-r-md rounded-l-sm bg-sunset p-5 shadow-2xl [transform:rotateY(-16deg)_rotateX(4deg)] motion-safe:animate-float">
                  {/* 책등 */}
                  <div className="absolute inset-y-0 left-0 w-2.5 rounded-l-sm bg-black/15" />
                  <div className="flex h-full flex-col justify-between text-white">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-white/80">
                      ShareSnap Photobook
                    </span>
                    <div className="rounded-xl bg-white/15 p-2 backdrop-blur-sm">
                      <div
                        className="aspect-square w-full rounded-lg"
                        style={tileStyle(0)}
                      />
                    </div>
                    <div>
                      <Sparkles className="mb-1 size-5" aria-hidden />
                      <p className="text-[19px] font-bold leading-tight tracking-[-0.01em]">
                        우리의
                        <br />
                        2박 3일
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
      <section className="relative isolate overflow-hidden bg-sunset px-5 py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 top-6 size-64 rounded-full bg-white/20 blur-3xl motion-safe:animate-float-slow"
        />
        <div className="relative mx-auto max-w-md text-center text-white">
          <Reveal>
            <h2 className="text-[clamp(24px,6.5vw,34px)] font-bold leading-[1.18] tracking-[-0.02em] [text-shadow:0_2px_20px_rgb(0_0_0/0.15)]">
              혼자 하지 마세요,
              <br />
              다 같이 하세요
            </h2>
            <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-white/90">
              단톡방에 링크 하나 보내면 친구들이 알아서 사진을 채워요.
            </p>
          </Reveal>

          {/* 카톡 초대 목업 */}
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
                  {[1, 4, 2, 3].map((t, i) => (
                    <span
                      key={i}
                      className="size-6 rounded-full ring-2 ring-white/80"
                      style={tileStyle(t)}
                    />
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
      <section className="px-5 py-20">
        <Reveal>
          <SectionHead eyebrow="안심하세요" title="쓰기 전에 궁금한 것들" />
        </Reveal>
        <Reveal delay={70} className="mx-auto mt-8 max-w-xl space-y-2.5">
          {[
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
          ].map((f) => (
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

      {/* ───────────── 파이널 CTA (풀블리드 선셋) ───────────── */}
      <section className="relative isolate overflow-hidden bg-sunset px-5 py-24 text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 size-96 -translate-x-1/2 rounded-full bg-white/15 blur-3xl"
        />
        <Reveal className="relative mx-auto max-w-md text-center">
          {/* 흩어진 → 한 권 수렴 모티프 */}
          <div className="mx-auto mb-8 flex items-end justify-center gap-1.5">
            {[2, 4, 0, 3, 1].map((t, i) => (
              <span
                key={i}
                className="rounded-md ring-1 ring-white/30"
                style={{
                  ...tileStyle(t),
                  width: i === 2 ? 44 : 26,
                  height: i === 2 ? 56 : 30,
                  transform: `translateY(${i === 2 ? -6 : 0}px) rotate(${
                    (i - 2) * 5
                  }deg)`,
                }}
              />
            ))}
          </div>
          <h2 className="text-[clamp(26px,7vw,38px)] font-bold leading-[1.16] tracking-[-0.02em] [text-shadow:0_2px_20px_rgb(0_0_0/0.16)]">
            이번 여행 사진,
            <br />
            흩어지기 전에 모아요
          </h2>
          <p className="mt-3 text-[15.5px] text-white/90">
            모으는 데 3초, 추억은 평생.
          </p>
          <p className="mt-6 text-[26px] font-bold tracking-[-0.01em]">
            추억을 모아, 빛나게
          </p>

          <div className="mx-auto mt-7 max-w-xs">
            <PrimaryCta isAuthed={isAuthed} />
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[12px] text-white/85">
            <span className="inline-flex items-center gap-1.5">
              <CreditCard className="size-3.5" aria-hidden />
              카드 등록 없이
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Download className="size-3.5" aria-hidden />
              앱 설치 없이
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Zap className="size-3.5" aria-hidden />
              카카오로 3초
            </span>
          </div>
          <p className="mt-5 inline-flex items-center gap-1.5 text-[12px] text-white/75">
            <Heart className="size-3.5" aria-hidden />
            올린 사진은 우리 공유방 멤버에게만 보여요
          </p>
        </Reveal>
      </section>

      {/* ───────────── 푸터 ───────────── */}
      <footer className="border-t border-border/60 bg-background px-5 py-12 pb-[max(env(safe-area-inset-bottom),3rem)]">
        <div className="mx-auto max-w-5xl">
          <p className="text-[18px] font-bold tracking-[-0.02em]">ShareSnap</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            추억을 모아 빛나게
          </p>
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

      {/* 스크롤 인지형 스티키 CTA */}
      <StickyCta isAuthed={isAuthed} />
    </main>
  );
}
