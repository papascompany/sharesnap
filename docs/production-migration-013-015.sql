-- ShareSnap 프로덕션 통합 마이그레이션 (013~015)
-- Supabase 대시보드 > SQL Editor에 전체 붙여넣기 후 RUN (한 번에 적용, idempotent)
-- 생성: 2026-07-11
--
-- [전제] 001~012가 이미 적용된 운영 DB. 아래 기존 객체에 의존한다:
--        public.set_updated_at()   (001) — profiles updated_at 트리거
--        public.is_room_member()   (006) — 공동주문 RPC 권한 검사
--        storage 버킷 photos/thumbnails (007)
--        public.join_room_via_share_code() (008) — 014에서 재정의
--
-- [내용]
--   013 삭제 파기 정책 — 삭제 사진의 공개 썸네일 잔존(P0-D) + 유령 draft 인화주문
--   014 악용 방어 상한 + 콘텐츠 신고 + 방장 모더레이션
--   015 profiles(작성자 표시) + 배송 추적 컬럼 + 공동주문 RPC
--
-- [멱등] 전 구간 if exists/if not exists/or replace/on conflict — 여러 번 실행해도 안전.
-- [권한] storage.objects 정책(013)과 auth.users 트리거(015)는 대시보드 SQL Editor의
--        postgres 역할로 실행해야 통과한다. (CLI/일반 커넥션에서는 권한 오류 가능)
-- [검증] 파일 맨 아래 "적용 검증" 쿼리 결과가 모두 ok 여야 정상.


-- ============================================================
-- 013_delete_policies_cleanup.sql
-- ============================================================

-- 1) thumbnails 버킷 DELETE 정책 — 본인 폴더(파일 경로 첫 세그먼트=uid)만 삭제 허용
--    (007의 thumbnails_user_write와 동일한 foldername[1]=uid 패턴)
--    이 정책이 있어야 photoService.deletePhoto의 Storage 삭제가 실제로 통과된다.
--    ※ 방장이 '타인' 사진을 삭제하는 경로는 service_role 서버 라우트로 일원화(코드에서 처리).
drop policy if exists "thumbnails_user_delete" on storage.objects;
create policy "thumbnails_user_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'thumbnails'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 2) print_orders — 본인 소유 + draft 상태만 DELETE 허용
--    printOrderService의 '항목 저장 실패 시 주문 롤백 delete'가 정책상 통과되도록.
--    draft 한정이라 결제/진행 주문 이력 보존 원칙은 유지된다.
drop policy if exists "print_orders_owner_draft_delete" on public.print_orders;
create policy "print_orders_owner_draft_delete" on public.print_orders
  for delete to authenticated
  using (user_id = auth.uid() and status = 'draft');


-- ============================================================
-- 014_growth_safety.sql
-- ============================================================

-- 1) join_room_via_share_code — 방 인원 상한(100명) 검사 추가
--    오픈채팅 유포 등으로 무한 참여하는 것을 security definer 내부에서 차단(클라 우회 불가).
--    기존 멤버 재입장은 상한 무관(멱등 유지).
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

-- 2) reports — 콘텐츠 신고(사진). 신고 접수 창구·처리 절차의 최소 이행선.
--    생성=로그인 사용자 본인, 조회=본인 것만(관리자는 service_role로 전체 조회).
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

-- 3) photo_comments — 방장(방 소유자)이 자신의 방 코멘트를 삭제할 수 있는 정책 추가
--    (006은 본인 삭제만 허용 → 방장 모더레이션 불가)
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


-- ============================================================
-- 015_profiles_tracking.sql
-- ============================================================

-- 1) profiles — auth.users 파생 표시용 프로필(닉네임/아바타)
--    카카오 로그인 시 raw_user_meta_data(name·avatar_url)가 채워지고,
--    매직링크 사용자는 이메일 로컬파트를 기본 닉네임으로 사용한다.
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

-- 2) 주문 배송 추적 — 택배사/송장번호(관리자가 shipped 전이 시 입력)
alter table public.photobook_orders
  add column if not exists tracking_carrier text,
  add column if not exists tracking_number text;

alter table public.print_orders
  add column if not exists tracking_carrier text,
  add column if not exists tracking_number text;

-- 3) 공동주문 — "이 방의 포토북"을 멤버가 함께 보고 각자 주문
--    photobook_orders RLS는 본인·방장만 select 가능(006) → 방 멤버 열람은 RPC로 한정 제공.

-- 방의 완성 포토북 목록(같은 방 멤버만). 편집 중 주문은 제외.
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

-- 완성 포토북 복제 주문 — 같은 방 멤버가 "나도 주문하기".
-- 편집 세션(storige_session_id)은 공유하지 않고 결과물(PDF/파일 ID)만 참조해
-- 원본 편집에 영향을 주지 않는다. 결제는 각자 진행.
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


-- ============================================================
-- 적용 검증 — 아래 결과가 모두 status='ok' 여야 정상
-- (SQL Editor는 마지막 SELECT 결과를 표시한다)
-- ============================================================
select item, status from (
  select 1 as ord, '013 storage thumbnails_user_delete' as item,
    case when exists (
      select 1 from pg_policies
      where schemaname = 'storage' and tablename = 'objects'
        and policyname = 'thumbnails_user_delete'
    ) then 'ok' else 'MISSING' end as status
  union all
  select 2, '013 print_orders_owner_draft_delete',
    case when exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'print_orders'
        and policyname = 'print_orders_owner_draft_delete'
    ) then 'ok' else 'MISSING' end
  union all
  select 3, '014 join RPC 인원상한(ROOM_FULL)',
    case when exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'join_room_via_share_code'
        and pg_get_functiondef(p.oid) like '%ROOM_FULL%'
    ) then 'ok' else 'OLD_VERSION' end
  union all
  select 4, '014 reports 테이블',
    case when to_regclass('public.reports') is not null then 'ok' else 'MISSING' end
  union all
  select 5, '014 photo_comments_owner_delete',
    case when exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'photo_comments'
        and policyname = 'photo_comments_owner_delete'
    ) then 'ok' else 'MISSING' end
  union all
  select 6, '015 profiles 테이블',
    case when to_regclass('public.profiles') is not null then 'ok' else 'MISSING' end
  union all
  select 7, '015 on_auth_user_created 트리거',
    case when exists (
      select 1 from pg_trigger where tgname = 'on_auth_user_created' and not tgisinternal
    ) then 'ok' else 'MISSING' end
  union all
  select 8, '015 profiles 백필(auth.users 전원)',
    case when (select count(*) from public.profiles) >= (select count(*) from auth.users)
      then 'ok' else 'PARTIAL' end
  union all
  select 9, '015 photobook_orders.tracking_number',
    case when exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'photobook_orders'
        and column_name = 'tracking_number'
    ) then 'ok' else 'MISSING' end
  union all
  select 10, '015 print_orders.tracking_number',
    case when exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'print_orders'
        and column_name = 'tracking_number'
    ) then 'ok' else 'MISSING' end
  union all
  select 11, '015 RPC list_room_photobooks',
    case when to_regprocedure('public.list_room_photobooks(uuid)') is not null
      then 'ok' else 'MISSING' end
  union all
  select 12, '015 RPC clone_photobook_order',
    case when to_regprocedure('public.clone_photobook_order(uuid)') is not null
      then 'ok' else 'MISSING' end
) v
order by ord;


-- ============================================================
-- (선택·수동) 고아 썸네일 1회 정리 — 위 검증이 모두 ok인 뒤 별도로 실행
-- 삭제된 사진의 공개 썸네일이 그동안 잔존해 있었다면 여기서 회수한다.
-- ⚠ 되돌릴 수 없다. 반드시 (a)로 대상을 확인한 뒤 (b)를 실행할 것.
-- ============================================================
--
-- (a) 정리 대상 미리보기
-- select count(*) as orphan_count
--   from storage.objects o
--   where o.bucket_id = 'thumbnails'
--     and not exists (
--       select 1 from public.photos p
--       where o.name in (p.thumbnail_path, p.medium_path, p.print_path)
--     );
--
-- (b) 확인 후 실제 삭제
-- delete from storage.objects o
--   where o.bucket_id = 'thumbnails'
--     and not exists (
--       select 1 from public.photos p
--       where o.name in (p.thumbnail_path, p.medium_path, p.print_path)
--     );
