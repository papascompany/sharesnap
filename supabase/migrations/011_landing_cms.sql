-- ============================================================
-- 011: 랜딩 CMS — 사이트 콘텐츠 저장 (key → jsonb 싱글톤)
-- ============================================================
-- 랜딩페이지의 문구/이미지를 어드민에서 편집해 DB에 저장한다.
-- 읽기: 공개(랜딩은 비로그인도 봄). 쓰기: 클라이언트 직접 금지 →
--       어드민 서버 라우트가 service_role로만 수행(ADMIN_EMAILS 검증 후).
-- idempotent(재실행 안전).

create table if not exists public.site_content (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_content enable row level security;

-- 누구나 읽기 허용(익명 포함) — 랜딩 공개 렌더용
drop policy if exists site_content_select on public.site_content;
create policy site_content_select
  on public.site_content
  for select
  using (true);

-- INSERT/UPDATE/DELETE 정책 없음 = anon/authenticated 쓰기 차단.
-- 어드민 쓰기는 service_role(RLS 우회) 서버 라우트로만 수행한다.

comment on table public.site_content is '사이트 콘텐츠(랜딩 CMS 등) key→jsonb. 읽기 공개, 쓰기는 service_role 전용.';
