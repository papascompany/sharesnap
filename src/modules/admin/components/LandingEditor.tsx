"use client";

import { useState } from "react";
import { toast } from "sonner";
import { UploadCloud, Save, ImageOff } from "lucide-react";
import type { LandingContent, PhotoSlot } from "@/modules/landing/content";

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-[14px] outline-none focus:ring-2 focus:ring-ring/40";

async function uploadImage(file: File): Promise<string | null> {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch("/api/admin/landing/upload", {
    method: "POST",
    body: fd,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    toast.error(j.message || "이미지 업로드에 실패했어요.");
    return null;
  }
  return j.url as string;
}

function SlotEditor({
  label,
  slot,
  onChange,
}: {
  label: string;
  slot: PhotoSlot;
  onChange: (patch: Partial<PhotoSlot>) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setBusy(true);
    const url = await uploadImage(f);
    setBusy(false);
    if (url) {
      onChange({ url });
      toast.success("이미지가 올라갔어요.");
    }
  }

  return (
    <div className="flex gap-3 rounded-xl border border-border/60 bg-card p-3">
      <div className="relative size-[72px] shrink-0 overflow-hidden rounded-lg bg-muted ring-1 ring-border/60">
        {slot.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={slot.url}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <div className="grid size-full place-items-center px-1 text-center text-[10px] leading-tight text-muted-foreground">
            씬<br />
            {slot.scene}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold text-muted-foreground">{label}</p>
        <input
          value={slot.caption}
          onChange={(e) => onChange({ caption: e.target.value })}
          placeholder="캡션"
          className={`mt-1.5 ${inputCls}`}
        />
        <div className="mt-2 flex items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-[12px] font-medium text-primary transition active:scale-[0.97]">
            <UploadCloud className="size-3.5" aria-hidden />
            {busy ? "업로드 중…" : slot.url ? "이미지 변경" : "이미지 업로드"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="hidden"
              onChange={onFile}
              disabled={busy}
            />
          </label>
          {slot.url ? (
            <button
              type="button"
              onClick={() => onChange({ url: "" })}
              className="inline-flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground transition active:scale-[0.97]"
            >
              <ImageOff className="size-3.5" aria-hidden />
              비우기(씬)
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  textarea,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-[13px] font-semibold">{label}</span>
      {hint ? (
        <span className="ml-2 text-[11px] text-muted-foreground">{hint}</span>
      ) : null}
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className={`mt-1.5 ${inputCls} resize-y`}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`mt-1.5 ${inputCls}`}
        />
      )}
    </label>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card p-5">
      <h2 className="text-[15px] font-bold tracking-[-0.01em]">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export function LandingEditor({ initial }: { initial: LandingContent }) {
  const [c, setC] = useState<LandingContent>(initial);
  const [saving, setSaving] = useState(false);

  const setHero = (k: keyof LandingContent["hero"], v: string) =>
    setC((p) => ({ ...p, hero: { ...p.hero, [k]: v } }));
  const setHeading = (k: keyof LandingContent["headings"], v: string) =>
    setC((p) => ({ ...p, headings: { ...p.headings, [k]: v } }));
  const patchPolaroid = (i: number, patch: Partial<PhotoSlot>) =>
    setC((p) => ({
      ...p,
      heroPolaroids: p.heroPolaroids.map((s, idx) =>
        idx === i ? { ...s, ...patch } : s,
      ),
    }));
  const patchBento = (i: number, patch: Partial<PhotoSlot>) =>
    setC((p) => ({
      ...p,
      bento: p.bento.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
    }));
  const patchCover = (patch: Partial<PhotoSlot>) =>
    setC((p) => ({ ...p, photobookCover: { ...p.photobookCover, ...patch } }));

  // ── 본문(섹션 카피) 세터 ──────────────────────────────
  // 섹션 객체의 단일 문자열 필드 설정. 한 섹션만 교체하고 전체를 LandingContent로 단언
  // (모양은 항상 보존하고 알려진 필드 하나만 바꾸므로 안전).
  const setSection = (
    section: keyof LandingContent,
    field: string,
    v: string,
  ) =>
    setC((p) => {
      const sec = p[section] as Record<string, unknown>;
      return { ...p, [section]: { ...sec, [field]: v } } as LandingContent;
    });
  // 문자열 배열(불릿/태그/칩) 한 항목 설정.
  const setStrArr = (
    section: keyof LandingContent,
    field: string,
    i: number,
    v: string,
  ) =>
    setC((p) => {
      const sec = p[section] as Record<string, unknown>;
      const arr = (sec[field] as string[]).map((s, idx) => (idx === i ? v : s));
      return { ...p, [section]: { ...sec, [field]: arr } } as LandingContent;
    });
  // 카드 배열(title/desc) 한 항목의 한 키 설정.
  const setCard = (
    section: keyof LandingContent,
    field: string,
    i: number,
    key: "title" | "desc",
    v: string,
  ) =>
    setC((p) => {
      const sec = p[section] as Record<string, unknown>;
      const arr = (sec[field] as { title: string; desc: string }[]).map(
        (card, idx) => (idx === i ? { ...card, [key]: v } : card),
      );
      return { ...p, [section]: { ...sec, [field]: arr } } as LandingContent;
    });
  // FAQ 배열(q/a) 한 항목의 한 키 설정.
  const setFaq = (i: number, key: "q" | "a", v: string) =>
    setC((p) => ({
      ...p,
      faq: {
        ...p.faq,
        items: p.faq.items.map((it, idx) =>
          idx === i ? { ...it, [key]: v } : it,
        ),
      },
    }));

  async function save() {
    setSaving(true);
    try {
      const r = await fetch("/api/admin/landing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(c),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.message || j.error || "저장 실패");
      toast.success("저장됐어요. 랜딩페이지에 바로 반영됩니다.");
    } catch (e) {
      toast.error(
        "저장 실패: " + (e instanceof Error ? e.message : String(e)),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pb-28">
      <div className="space-y-4">
        <Card title="히어로">
          <Field
            label="상단 배지"
            value={c.hero.eyebrow}
            onChange={(v) => setHero("eyebrow", v)}
          />
          <Field
            label="헤드라인"
            hint="줄바꿈 = Enter"
            value={c.hero.headline}
            onChange={(v) => setHero("headline", v)}
            textarea
          />
          <Field
            label="서브 카피"
            value={c.hero.subhead}
            onChange={(v) => setHero("subhead", v)}
            textarea
          />
          <Field
            label="안심 마이크로카피"
            value={c.hero.microcopy}
            onChange={(v) => setHero("microcopy", v)}
          />
        </Card>

        <Card title="히어로 폴라로이드 (3장)">
          {c.heroPolaroids.map((s, i) => (
            <SlotEditor
              key={i}
              label={`폴라로이드 ${i + 1}`}
              slot={s}
              onChange={(patch) => patchPolaroid(i, patch)}
            />
          ))}
        </Card>

        <Card title="소셜 콜라주 (4장)">
          {c.bento.map((s, i) => (
            <SlotEditor
              key={i}
              label={i === 0 ? "콜라주 1 (큰 타일)" : `콜라주 ${i + 1}`}
              slot={s}
              onChange={(patch) => patchBento(i, patch)}
            />
          ))}
        </Card>

        <Card title="포토북 표지">
          <SlotEditor
            label="표지 이미지"
            slot={c.photobookCover}
            onChange={patchCover}
          />
        </Card>

        <Card title="섹션 제목 (줄바꿈 = Enter)">
          <Field label="감정 훅" value={c.headings.emotion} onChange={(v) => setHeading("emotion", v)} textarea />
          <Field label="3단계" value={c.headings.how} onChange={(v) => setHeading("how", v)} textarea />
          <Field label="가치" value={c.headings.value} onChange={(v) => setHeading("value", v)} textarea />
          <Field label="콜라주" value={c.headings.collage} onChange={(v) => setHeading("collage", v)} textarea />
          <Field label="쇼케이스" value={c.headings.showcase} onChange={(v) => setHeading("showcase", v)} textarea />
          <Field label="바이럴" value={c.headings.viral} onChange={(v) => setHeading("viral", v)} textarea />
          <Field label="파이널 CTA" value={c.headings.final} onChange={(v) => setHeading("final", v)} textarea />
        </Card>

        <Card title="감정 훅 본문">
          <Field label="작은 제목" value={c.emotion.eyebrow} onChange={(v) => setSection("emotion", "eyebrow", v)} />
          <Field label="설명" value={c.emotion.desc} onChange={(v) => setSection("emotion", "desc", v)} textarea />
          {c.emotion.bullets.map((b, i) => (
            <Field
              key={i}
              label={`불릿 ${i + 1}`}
              value={b}
              onChange={(v) => setStrArr("emotion", "bullets", i, v)}
            />
          ))}
        </Card>

        <Card title="3단계 본문">
          <Field label="작은 제목" value={c.how.eyebrow} onChange={(v) => setSection("how", "eyebrow", v)} />
          {c.how.steps.map((s, i) => (
            <div key={i} className="rounded-xl border border-border/60 bg-card p-3">
              <p className="text-[12px] font-semibold text-muted-foreground">{`단계 ${i + 1}`}</p>
              <div className="mt-2 space-y-3">
                <Field label="제목" value={s.title} onChange={(v) => setCard("how", "steps", i, "title", v)} />
                <Field label="설명" value={s.desc} onChange={(v) => setCard("how", "steps", i, "desc", v)} textarea />
              </div>
            </div>
          ))}
        </Card>

        <Card title="가치 카드 본문">
          <Field label="작은 제목" value={c.value.eyebrow} onChange={(v) => setSection("value", "eyebrow", v)} />
          {c.value.cards.map((card, i) => (
            <div key={i} className="rounded-xl border border-border/60 bg-card p-3">
              <p className="text-[12px] font-semibold text-muted-foreground">{`카드 ${i + 1}`}</p>
              <div className="mt-2 space-y-3">
                <Field label="제목" value={card.title} onChange={(v) => setCard("value", "cards", i, "title", v)} />
                <Field label="설명" value={card.desc} onChange={(v) => setCard("value", "cards", i, "desc", v)} textarea />
              </div>
            </div>
          ))}
        </Card>

        <Card title="콜라주 본문">
          <Field label="작은 제목" value={c.collage.eyebrow} onChange={(v) => setSection("collage", "eyebrow", v)} />
          <Field label="설명" value={c.collage.desc} onChange={(v) => setSection("collage", "desc", v)} textarea />
          <Field label="하단 면책 캡션" value={c.collage.note} onChange={(v) => setSection("collage", "note", v)} />
        </Card>

        <Card title="포토북 쇼케이스 본문">
          <Field label="작은 제목" value={c.showcase.eyebrow} onChange={(v) => setSection("showcase", "eyebrow", v)} />
          <Field label="설명" value={c.showcase.desc} onChange={(v) => setSection("showcase", "desc", v)} textarea />
          {c.showcase.tags.map((t, i) => (
            <Field
              key={i}
              label={`스펙 칩 ${i + 1}`}
              value={t}
              onChange={(v) => setStrArr("showcase", "tags", i, v)}
            />
          ))}
        </Card>

        <Card title="바이럴 본문">
          <Field label="설명" value={c.viral.desc} onChange={(v) => setSection("viral", "desc", v)} textarea />
        </Card>

        <Card title="FAQ 본문">
          <Field label="작은 제목" value={c.faq.eyebrow} onChange={(v) => setSection("faq", "eyebrow", v)} />
          <Field label="섹션 제목" value={c.faq.title} onChange={(v) => setSection("faq", "title", v)} />
          {c.faq.items.map((item, i) => (
            <div key={i} className="rounded-xl border border-border/60 bg-card p-3">
              <p className="text-[12px] font-semibold text-muted-foreground">{`FAQ ${i + 1}`}</p>
              <div className="mt-2 space-y-3">
                <Field label="질문" value={item.q} onChange={(v) => setFaq(i, "q", v)} />
                <Field label="답변" value={item.a} onChange={(v) => setFaq(i, "a", v)} textarea />
              </div>
            </div>
          ))}
        </Card>

        <Card title="신뢰 밴드 본문">
          <Field label="작은 제목" value={c.trust.eyebrow} onChange={(v) => setSection("trust", "eyebrow", v)} />
          <Field label="섹션 제목" hint="줄바꿈 = Enter" value={c.trust.title} onChange={(v) => setSection("trust", "title", v)} textarea />
          <Field label="설명" value={c.trust.desc} onChange={(v) => setSection("trust", "desc", v)} textarea />
          {c.trust.cards.map((card, i) => (
            <div key={i} className="rounded-xl border border-border/60 bg-card p-3">
              <p className="text-[12px] font-semibold text-muted-foreground">{`카드 ${i + 1}`}</p>
              <div className="mt-2 space-y-3">
                <Field label="제목" value={card.title} onChange={(v) => setCard("trust", "cards", i, "title", v)} />
                <Field label="설명" value={card.desc} onChange={(v) => setCard("trust", "cards", i, "desc", v)} textarea />
              </div>
            </div>
          ))}
          <Field label="하단 안심 배너" value={c.trust.note} onChange={(v) => setSection("trust", "note", v)} textarea />
        </Card>

        <Card title="파이널 CTA 본문">
          <Field label="설명" value={c.final.desc} onChange={(v) => setSection("final", "desc", v)} />
          {c.final.chips.map((chip, i) => (
            <Field
              key={i}
              label={`칩 ${i + 1}`}
              value={chip}
              onChange={(v) => setStrArr("final", "chips", i, v)}
            />
          ))}
          <Field label="프라이버시 한 줄" value={c.final.privacy} onChange={(v) => setSection("final", "privacy", v)} textarea />
        </Card>

        <Card title="슬로건">
          <Field label="슬로건" value={c.slogan} onChange={(v) => setC((p) => ({ ...p, slogan: v }))} />
        </Card>
      </div>

      {/* 저장 바 */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/85 px-4 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <p className="text-[12px] text-muted-foreground">
            변경은 저장 후 즉시 랜딩에 반영돼요.
          </p>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-[15px] font-semibold text-primary-foreground transition active:scale-[0.97] disabled:opacity-60"
          >
            <Save className="size-[18px]" aria-hidden />
            {saving ? "저장 중…" : "저장하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
