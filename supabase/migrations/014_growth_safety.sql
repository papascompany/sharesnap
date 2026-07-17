-- 014_growth_safety.sql
-- 감사(docs/service-flow-audit.md) P1 대응 — 악용 방어 상한 + 콘텐츠 신고 + 방장 모더레이션
-- ⚠ 운영 Supabase SQL Editor 수동 적용(MCP 토큰 계정 밖).

-- ============================================================
-- 1) join_room_via_share_code — 방 인원 상한(ROOM_MAX_MEMBERS=100) 검사 추가
--    오픈채팅 유포 등으로 무한 참여하는 것을 security definer 내부에서 차단(클라 우회 불가).
--    기존 멤버 재입장은 상한 무관(멱등 유지).
-- ============================================================
create or replace function public.join_room_via_share_code(p_share_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_id uuid;
  v_count int;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select id into v_room_id
  from public.rooms
  where share_code = p_share_code;

  if v_room_id is null then
    raise exception 'INVALID_SHARE_CODE';
  end if;

  -- 신규 참여만 상한 검사(이미 멤버면 통과 — 재입장 멱등)
  if not exists (
    select 1 from public.room_members
    where room_id = v_room_id and user_id = auth.uid()
  ) then
    select count(*) into v_count
    from public.room_members
    where room_id = v_room_id;
    if v_count >= 100 then
      raise exception 'ROOM_FULL';
    end if;
  end if;

  insert into public.room_members (room_id, user_id, role)
  values (v_room_id, auth.uid(), 'member')
  on conflict (room_id, user_id) do nothing;

  return v_room_id;
end;
$$;

revoke all on function public.join_room_via_share_code(text) from public;
grant execute on function public.join_room_via_share_code(text) to authenticated;

-- ============================================================
-- 2) reports — 콘텐츠 신고(사진). 신고 접수 창구·처리 절차의 최소 이행선.
--    생성=로그인 사용자 본인, 조회=본인 것만(관리자는 service_role로 전체 조회).
-- ============================================================
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  photo_id uuid references public.photos(id) on delete set null,
  room_id uuid references public.rooms(id) on delete set null,
  reason text not null,
  detail text,
  status text not null default 'pending' check (status in ('pending', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);

create index if not exists reports_status_idx on public.reports (status, created_at desc);
create index if not exists reports_reporter_idx on public.reports (reporter_id, created_at desc);

alter table public.reports enable row level security;

drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports
  for insert to authenticated
  with check (reporter_id = auth.uid());

drop policy if exists reports_select_own on public.reports;
create policy reports_select_own on public.reports
  for select to authenticated
  using (reporter_id = auth.uid());
-- 관리자 조회/상태변경/삭제는 정책 없음 → service_role(서버)만 가능.

-- ============================================================
-- 3) photo_comments — 방장(방 소유자)이 자신의 방 코멘트를 삭제할 수 있는 정책 추가
--    (006은 본인 삭제만 허용 → 방장 모더레이션 불가)
-- ============================================================
drop policy if exists photo_comments_owner_delete on public.photo_comments;
create policy photo_comments_owner_delete on public.photo_comments
  for delete using (
    exists (
      select 1
      from public.photos p
      join public.rooms r on r.id = p.room_id
      where p.id = photo_comments.photo_id
        and r.owner_id = auth.uid()
    )
  );
