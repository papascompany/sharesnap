-- 015_profiles_tracking.sql
-- 감사(docs/service-flow-audit.md) 후속 스프린트4
--   ① profiles — "누가 올렸는지"가 어디에도 없던 단톡방 UX 정체성 결손 해소
--   ② 주문 배송 추적 컬럼 — 결제 후 경험(송장 조회) 부재 해소
-- ⚠ 운영 Supabase SQL Editor 수동 적용.

-- ============================================================
-- 1) profiles — auth.users 파생 표시용 프로필(닉네임/아바타)
--    카카오 로그인 시 raw_user_meta_data(name·avatar_url)가 채워지고,
--    매직링크 사용자는 이메일 로컬파트를 기본 닉네임으로 사용한다.
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;

-- 조회: 본인 + "나와 같은 방에 속한 사용자"만 (작성자 표시용, 무차별 조회 차단)
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (
    id = auth.uid()
    or exists (
      select 1
      from public.room_members mine
      join public.room_members theirs on theirs.room_id = mine.room_id
      where mine.user_id = auth.uid()
        and theirs.user_id = profiles.id
    )
  );

-- 수정: 본인만 (닉네임/아바타 변경)
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- 생성: 본인만 (트리거가 자동 생성하지만, 누락 시 클라이언트 보정 허용)
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated with check (id = auth.uid());

-- 신규 가입 시 프로필 자동 생성
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nickname, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'name', ''),
      nullif(new.raw_user_meta_data->>'nickname', ''),
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      '멤버'
    ),
    nullif(
      coalesce(
        new.raw_user_meta_data->>'avatar_url',
        new.raw_user_meta_data->>'picture'
      ),
      ''
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- 기존 사용자 백필(멱등)
insert into public.profiles (id, nickname, avatar_url)
select
  u.id,
  coalesce(
    nullif(u.raw_user_meta_data->>'name', ''),
    nullif(u.raw_user_meta_data->>'nickname', ''),
    nullif(u.raw_user_meta_data->>'full_name', ''),
    nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
    '멤버'
  ),
  nullif(
    coalesce(
      u.raw_user_meta_data->>'avatar_url',
      u.raw_user_meta_data->>'picture'
    ),
    ''
  )
from auth.users u
on conflict (id) do nothing;

-- ============================================================
-- 2) 주문 배송 추적 — 택배사/송장번호(관리자가 shipped 전이 시 입력)
-- ============================================================
alter table public.photobook_orders
  add column if not exists tracking_carrier text,
  add column if not exists tracking_number text;

alter table public.print_orders
  add column if not exists tracking_carrier text,
  add column if not exists tracking_number text;

-- ============================================================
-- 3) 공동주문 — "이 방의 포토북"을 멤버가 함께 보고 각자 주문
--    photobook_orders RLS는 본인·방장만 select 가능(006) → 방 멤버 열람은 RPC로 한정 제공.
-- ============================================================

/** 방의 완성 포토북 목록(같은 방 멤버만). 편집 중 주문은 제외. */
create or replace function public.list_room_photobooks(p_room_id uuid)
returns table (
  id uuid,
  user_id uuid,
  book_size text,
  page_count integer,
  status text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select o.id, o.user_id, o.book_size::text, o.page_count, o.status::text, o.created_at
  from public.photobook_orders o
  where o.room_id = p_room_id
    and public.is_room_member(p_room_id)
    and o.status in ('pdf_ready', 'ordered', 'paid', 'printing', 'shipped', 'delivered')
  order by o.created_at desc;
$$;

revoke all on function public.list_room_photobooks(uuid) from public;
grant execute on function public.list_room_photobooks(uuid) to authenticated;

/**
 * 완성 포토북 복제 주문 — 같은 방 멤버가 "나도 주문하기".
 * 편집 세션(storige_session_id)은 공유하지 않고 결과물(PDF/파일 ID)만 참조해
 * 원본 편집에 영향을 주지 않는다. 결제는 각자 진행.
 */
create or replace function public.clone_photobook_order(p_order_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_src public.photobook_orders%rowtype;
  v_new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into v_src from public.photobook_orders where id = p_order_id;
  if v_src.id is null then
    raise exception 'ORDER_NOT_FOUND';
  end if;
  if not public.is_room_member(v_src.room_id) then
    raise exception 'NOT_ROOM_MEMBER';
  end if;
  if v_src.status not in ('pdf_ready', 'ordered', 'paid', 'printing', 'shipped', 'delivered') then
    raise exception 'NOT_COMPLETED';
  end if;

  insert into public.photobook_orders (
    room_id, user_id, book_size, page_count, status,
    pdf_path, cover_file_id, content_file_id, quantity
  )
  values (
    v_src.room_id, auth.uid(), v_src.book_size, v_src.page_count, 'pdf_ready',
    v_src.pdf_path, v_src.cover_file_id, v_src.content_file_id, 1
  )
  returning id into v_new_id;

  return v_new_id;
end;
$$;

revoke all on function public.clone_photobook_order(uuid) from public;
grant execute on function public.clone_photobook_order(uuid) to authenticated;
