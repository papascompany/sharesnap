-- 008_join_funnel.sql
-- 참여 퍼널용 security definer RPC 2종 (docs/ux-flows.md §1.3)
-- P0-1 수정: rooms_select RLS가 멤버만 허용 → 비로그인/비멤버는 share_code로 방 조회 불가
--   → anon에게도 열린 미리보기 RPC + 멱등 참여 RPC로 해결

-- 1) 방 미리보기 (anon 허용 — share_code 자체가 비밀이므로 room id는 노출하지 않음)
drop function if exists public.get_room_preview(text);
create or replace function public.get_room_preview(p_share_code text)
returns table (
  name text,
  description text,
  cover_url text,
  member_count bigint,
  photo_count bigint,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.name,
    r.description,
    r.cover_url,
    (select count(*) from public.room_members m where m.room_id = r.id),
    (select count(*) from public.photos p where p.room_id = r.id),
    r.created_at
  from public.rooms r
  where r.share_code = p_share_code;
$$;

revoke all on function public.get_room_preview(text) from public;
grant execute on function public.get_room_preview(text) to anon, authenticated;

-- 2) share_code로 참여 (멱등 — 이미 멤버면 그냥 room id 반환)
drop function if exists public.join_room_via_share_code(text);
create or replace function public.join_room_via_share_code(p_share_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_id uuid;
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

  -- unique (room_id, user_id) 제약 기반 멱등 참여
  insert into public.room_members (room_id, user_id, role)
  values (v_room_id, auth.uid(), 'member')
  on conflict (room_id, user_id) do nothing;

  return v_room_id;
end;
$$;

revoke all on function public.join_room_via_share_code(text) from public;
grant execute on function public.join_room_via_share_code(text) to authenticated;
