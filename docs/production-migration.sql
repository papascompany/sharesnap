-- ShareSnap 프로덕션 통합 마이그레이션 (001~010)
-- Supabase 대시보드 > SQL Editor에 전체 붙여넣기 후 RUN (한 번에 적용, idempotent)
-- 생성: 2026-06-20

-- ============================================================
-- 001_create_rooms.sql
-- ============================================================
-- 001_create_rooms.sql
-- 공유방(rooms) + 멤버(room_members) 테이블

-- uuid 생성 확장
create extension if not exists "pgcrypto";

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  share_code text not null unique,
  owner_id uuid not null references auth.users(id) on delete cascade,
  cover_url text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rooms_owner_id_idx on public.rooms (owner_id);
create index if not exists rooms_settings_gin on public.rooms using gin (settings);

create table if not exists public.room_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member')),
  nickname text,
  joined_at timestamptz not null default now(),
  unique (room_id, user_id)
);

create index if not exists room_members_user_idx on public.room_members (user_id);
create index if not exists room_members_room_idx on public.room_members (room_id);

-- updated_at 자동 갱신 트리거 함수
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists rooms_set_updated_at on public.rooms;
create trigger rooms_set_updated_at
before update on public.rooms
for each row execute procedure public.set_updated_at();

-- ============================================================
-- 002_create_messages_photos.sql
-- ============================================================
-- 002_create_messages_photos.sql
-- messages (채팅) + photos + photo_comments

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  thumbnail_path text,
  medium_path text,
  original_filename text,
  width integer,
  height integer,
  file_size integer,
  taken_at timestamptz,
  is_selected_for_book boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists photos_room_created_idx on public.photos (room_id, created_at desc);
create index if not exists photos_room_taken_idx on public.photos (room_id, taken_at desc);
create index if not exists photos_user_idx on public.photos (user_id);
create index if not exists photos_selected_idx on public.photos (room_id) where is_selected_for_book;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'text' check (type in ('text','photo','system')),
  content text,
  photo_id uuid references public.photos(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists messages_room_created_idx on public.messages (room_id, created_at desc);

create table if not exists public.photo_comments (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references public.photos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists photo_comments_photo_idx on public.photo_comments (photo_id, created_at);

-- ============================================================
-- 003_create_photobook.sql
-- ============================================================
-- 003_create_photobook.sql
-- photobook_orders + photobook_pages

create table if not exists public.photobook_orders (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  book_size text not null check (book_size in ('A4','A5','210x210')),
  page_count integer not null default 0,
  status text not null default 'draft' check (status in (
    'draft','editing','confirmed','generating_pdf','pdf_ready',
    'ordered','paid','printing','shipped','delivered'
  )),
  cover_data jsonb,
  pdf_path text,
  preview_path text,
  total_price integer,
  quantity integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists photobook_orders_room_idx on public.photobook_orders (room_id);
create index if not exists photobook_orders_user_idx on public.photobook_orders (user_id, created_at desc);
create index if not exists photobook_orders_status_idx on public.photobook_orders (status);

drop trigger if exists photobook_orders_set_updated_at on public.photobook_orders;
create trigger photobook_orders_set_updated_at
before update on public.photobook_orders
for each row execute procedure public.set_updated_at();

create table if not exists public.photobook_pages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.photobook_orders(id) on delete cascade,
  page_index integer not null,
  fabric_data jsonb not null default '{}'::jsonb,
  preview_url text,
  updated_at timestamptz not null default now(),
  unique (order_id, page_index)
);

create index if not exists photobook_pages_order_idx on public.photobook_pages (order_id, page_index);

drop trigger if exists photobook_pages_set_updated_at on public.photobook_pages;
create trigger photobook_pages_set_updated_at
before update on public.photobook_pages
for each row execute procedure public.set_updated_at();

-- ============================================================
-- 004_create_print_orders.sql
-- ============================================================
-- 004_create_print_orders.sql
-- 사진 인화 주문

create table if not exists public.print_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  room_id uuid references public.rooms(id) on delete set null,
  status text not null default 'draft' check (status in (
    'draft','confirmed','paid','printing','shipped','delivered'
  )),
  total_price integer not null,
  shipping_address jsonb not null,
  recipient_name text not null,
  recipient_phone text not null,
  memo text,
  created_at timestamptz not null default now()
);

create index if not exists print_orders_user_idx on public.print_orders (user_id, created_at desc);
create index if not exists print_orders_status_idx on public.print_orders (status);

create table if not exists public.print_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.print_orders(id) on delete cascade,
  photo_id uuid not null references public.photos(id) on delete restrict,
  paper_size text not null,
  paper_type text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price integer not null
);

create index if not exists print_order_items_order_idx on public.print_order_items (order_id);

-- ============================================================
-- 005_create_editor_resources.sql
-- ============================================================
-- 005_create_editor_resources.sql
-- 편집기 리소스 (폰트/클립아트/배경/템플릿)

create table if not exists public.editor_resources (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('font','clipart','background','template')),
  name text not null,
  storage_path text not null,
  preview_url text,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists editor_resources_category_active_idx
  on public.editor_resources (category, is_active, sort_order);

-- ============================================================
-- 006_create_rls_policies.sql
-- ============================================================
-- 006_create_rls_policies.sql
-- 전체 테이블 RLS 활성화 + 정책 정의

-- 헬퍼: 사용자가 방의 멤버인지 확인
create or replace function public.is_room_member(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.room_members
    where room_id = p_room_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.is_room_owner(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.rooms
    where id = p_room_id
      and owner_id = auth.uid()
  );
$$;

-- ===== rooms =====
alter table public.rooms enable row level security;

drop policy if exists rooms_select on public.rooms;
create policy rooms_select on public.rooms
  for select using (
    public.is_room_member(id)
    or owner_id = auth.uid()
  );

drop policy if exists rooms_insert on public.rooms;
create policy rooms_insert on public.rooms
  for insert with check (owner_id = auth.uid());

drop policy if exists rooms_update on public.rooms;
create policy rooms_update on public.rooms
  for update using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists rooms_delete on public.rooms;
create policy rooms_delete on public.rooms
  for delete using (owner_id = auth.uid());

-- ===== room_members =====
alter table public.room_members enable row level security;

drop policy if exists room_members_select on public.room_members;
create policy room_members_select on public.room_members
  for select using (public.is_room_member(room_id));

drop policy if exists room_members_insert on public.room_members;
create policy room_members_insert on public.room_members
  for insert with check (user_id = auth.uid()); -- 본인만 참여 가능

drop policy if exists room_members_delete on public.room_members;
create policy room_members_delete on public.room_members
  for delete using (
    user_id = auth.uid()
    or public.is_room_owner(room_id)
  );

-- ===== photos =====
alter table public.photos enable row level security;

drop policy if exists photos_select on public.photos;
create policy photos_select on public.photos
  for select using (public.is_room_member(room_id));

drop policy if exists photos_insert on public.photos;
create policy photos_insert on public.photos
  for insert with check (
    user_id = auth.uid() and public.is_room_member(room_id)
  );

drop policy if exists photos_update on public.photos;
create policy photos_update on public.photos
  for update using (
    user_id = auth.uid() or public.is_room_owner(room_id)
  );

drop policy if exists photos_delete on public.photos;
create policy photos_delete on public.photos
  for delete using (
    user_id = auth.uid() or public.is_room_owner(room_id)
  );

-- ===== messages =====
alter table public.messages enable row level security;

drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages
  for select using (public.is_room_member(room_id));

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert with check (
    user_id = auth.uid() and public.is_room_member(room_id)
  );

drop policy if exists messages_delete on public.messages;
create policy messages_delete on public.messages
  for delete using (
    user_id = auth.uid() or public.is_room_owner(room_id)
  );

-- ===== photo_comments =====
alter table public.photo_comments enable row level security;

drop policy if exists photo_comments_select on public.photo_comments;
create policy photo_comments_select on public.photo_comments
  for select using (
    exists (
      select 1 from public.photos p
      where p.id = photo_comments.photo_id
        and public.is_room_member(p.room_id)
    )
  );

drop policy if exists photo_comments_insert on public.photo_comments;
create policy photo_comments_insert on public.photo_comments
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.photos p
      where p.id = photo_id
        and public.is_room_member(p.room_id)
    )
  );

drop policy if exists photo_comments_delete on public.photo_comments;
create policy photo_comments_delete on public.photo_comments
  for delete using (user_id = auth.uid());

-- ===== photobook_orders =====
alter table public.photobook_orders enable row level security;

drop policy if exists photobook_orders_select on public.photobook_orders;
create policy photobook_orders_select on public.photobook_orders
  for select using (
    user_id = auth.uid() or public.is_room_owner(room_id)
  );

drop policy if exists photobook_orders_insert on public.photobook_orders;
create policy photobook_orders_insert on public.photobook_orders
  for insert with check (
    user_id = auth.uid() and public.is_room_member(room_id)
  );

drop policy if exists photobook_orders_update on public.photobook_orders;
create policy photobook_orders_update on public.photobook_orders
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists photobook_orders_delete on public.photobook_orders;
create policy photobook_orders_delete on public.photobook_orders
  for delete using (user_id = auth.uid());

-- ===== photobook_pages =====
alter table public.photobook_pages enable row level security;

drop policy if exists photobook_pages_all on public.photobook_pages;
create policy photobook_pages_all on public.photobook_pages
  for all using (
    exists (
      select 1 from public.photobook_orders o
      where o.id = photobook_pages.order_id
        and o.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.photobook_orders o
      where o.id = photobook_pages.order_id
        and o.user_id = auth.uid()
    )
  );

-- ===== print_orders =====
alter table public.print_orders enable row level security;

drop policy if exists print_orders_select on public.print_orders;
create policy print_orders_select on public.print_orders
  for select using (user_id = auth.uid());

drop policy if exists print_orders_insert on public.print_orders;
create policy print_orders_insert on public.print_orders
  for insert with check (user_id = auth.uid());

drop policy if exists print_orders_update on public.print_orders;
create policy print_orders_update on public.print_orders
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ===== print_order_items =====
alter table public.print_order_items enable row level security;

drop policy if exists print_order_items_all on public.print_order_items;
create policy print_order_items_all on public.print_order_items
  for all using (
    exists (
      select 1 from public.print_orders o
      where o.id = print_order_items.order_id
        and o.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.print_orders o
      where o.id = order_id
        and o.user_id = auth.uid()
    )
  );

-- ===== editor_resources =====
alter table public.editor_resources enable row level security;

drop policy if exists editor_resources_select on public.editor_resources;
create policy editor_resources_select on public.editor_resources
  for select using (is_active = true);
-- 관리자 정책은 별도 admin role 정의 후 추가

-- ============================================================
-- 007_create_storage_buckets.sql
-- ============================================================
-- 007_create_storage_buckets.sql
-- Storage 버킷 생성 + 정책
-- ⚠ Supabase Dashboard SQL 편집기에서 실행 권장 (storage.* 권한 필요)

insert into storage.buckets (id, name, public)
values
  ('photos', 'photos', false),
  ('thumbnails', 'thumbnails', true),
  ('resources', 'resources', true),
  ('pdfs', 'pdfs', false)
on conflict (id) do nothing;

-- photos: 인증된 사용자가 자신의 폴더(user-id로 시작)에만 업로드 가능
drop policy if exists "photos_user_insert" on storage.objects;
create policy "photos_user_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "photos_user_select" on storage.objects;
create policy "photos_user_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'photos');
-- 실제 접근 제어는 signedUrl로 처리

drop policy if exists "photos_user_delete" on storage.objects;
create policy "photos_user_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- thumbnails: 공개 읽기, 인증 사용자만 자신의 폴더에 쓰기
drop policy if exists "thumbnails_public_read" on storage.objects;
create policy "thumbnails_public_read" on storage.objects
  for select using (bucket_id = 'thumbnails');

drop policy if exists "thumbnails_user_write" on storage.objects;
create policy "thumbnails_user_write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'thumbnails'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- resources: 공개 읽기 (관리자가 업로드)
drop policy if exists "resources_public_read" on storage.objects;
create policy "resources_public_read" on storage.objects
  for select using (bucket_id = 'resources');

-- pdfs: 인증 사용자만 읽기 (signed URL 권장)
drop policy if exists "pdfs_user_read" on storage.objects;
create policy "pdfs_user_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'pdfs');

-- ============================================================
-- 008_join_funnel.sql
-- ============================================================
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

-- ============================================================
-- 009_storige_integration.sql
-- ============================================================
-- 009_storige_integration.sql
-- Storige 편집기 연동 (HANDOFF_sharesnap_integration_2026-06-12 §3.2, §6.3)
-- 핵심: Storige shop-session의 memberSeqno/orderSeqno는 "정수" 필수
--   → UUID 기반인 ShareSnap은 identity 채번 컬럼으로 정수 번호를 영구 발급해 매핑

-- ===== 1) photos.print_path =====
-- 인쇄용 리사이즈본 경로 (긴변 3000~4000px JPEG — 핸드오프 D1-UX 인쇄해상도 정책)
alter table public.photos
  add column if not exists print_path text;

-- ===== 2) photobook_orders — Storige 연동 컬럼 =====
-- order_no: Storige orderSeqno로 전달할 정수 주문번호 (uuid id와 별개, 영구 고정)
alter table public.photobook_orders
  add column if not exists order_no bigint generated always as identity unique;

-- storige_session_id: Storige 편집 세션 참조 (재편집 키 — fabric_data 직저장 폐기, 참조 모델)
alter table public.photobook_orders
  add column if not exists storige_session_id text;

-- cover_file_id / content_file_id: editor.complete payload의 결과 파일 ID
alter table public.photobook_orders
  add column if not exists cover_file_id text;

alter table public.photobook_orders
  add column if not exists content_file_id text;

-- synthesis_job_id: compose-mixed 합성 잡 ID (웹훅 매칭 키)
alter table public.photobook_orders
  add column if not exists synthesis_job_id text;

-- 웹훅 수신 시 synthesis_job_id로 주문 역조회
create index if not exists photobook_orders_synthesis_job_idx
  on public.photobook_orders (synthesis_job_id);

-- ===== 3) user_storige_map — Supabase UUID ↔ Storige memberSeqno 매핑 =====
-- UUID당 1회 발급·영구 고정 (해시 변환은 충돌 위험으로 비권장 — 핸드오프 §6.3)
create table if not exists public.user_storige_map (
  user_id uuid primary key references auth.users(id) on delete cascade,
  member_no bigint generated always as identity unique,
  created_at timestamptz not null default now()
);

alter table public.user_storige_map enable row level security;

-- 본인 행만 조회/발급 가능 (갱신·삭제 정책 없음 — member_no는 영구 고정)
drop policy if exists user_storige_map_select on public.user_storige_map;
create policy user_storige_map_select on public.user_storige_map
  for select using (user_id = auth.uid());

drop policy if exists user_storige_map_insert on public.user_storige_map;
create policy user_storige_map_insert on public.user_storige_map
  for insert with check (user_id = auth.uid());

-- ============================================================
-- 010_harden_storage_rls.sql
-- ============================================================
-- 010_harden_storage_rls.sql
-- photos 버킷 SELECT(읽기) RLS 강화 — 감사 지적 대응
--
-- [배경] 007에서 photos_user_select는 "인증 사용자면 photos 버킷 전체 select 허용"이었다.
--   실제 접근 제어를 전적으로 signedUrl 발급 로직에 위임한 형태(주석: "실제 접근 제어는
--   signedUrl로 처리")라, 정책 자체로는 임의의 인증 사용자가 타인의 원본 사진을 직접
--   열람/열거할 수 있는 구멍이 있었다.
--
-- [강화] photos 버킷 원본은 "본인이 올린 폴더(첫 세그먼트 = auth.uid())"만 직접 접근 허용.
--   storage.objects RLS는 경로 기반이라 "같은 방 멤버" 검사를 정확히 하려면 path↔room
--   매핑 조인이 필요해 비용·복잡도가 크고 오설정 시 앱이 깨진다. 따라서 보수적으로
--   "본인 업로드분만 직접 접근, 타인 사진은 공개 thumbnails 버킷 또는 signedUrl 경유"
--   원칙(007 insert/delete 정책과 동일한 foldername[1]=uid 패턴)으로 좁힌다.
--
-- [현 앱 동작에 미치는 영향 = 없음]
--   업로드 경로 계약: photos 버킷에는 원본만, 경로 = {userId}/{roomId}/{photoId}.jpg
--     (photoService.uploadPhoto — userId가 첫 세그먼트). 썸네일/중간/인쇄용 리사이즈본은
--     전부 공개 thumbnails 버킷(getPublicUrl)에 올라간다.
--   • 갤러리/뷰어/포토북 externalPhotos 등 모든 "표시"는 공개 thumbnails 버킷 public URL을
--     쓰므로 이 정책의 영향을 받지 않는다(타인 사진도 정상 노출 유지).
--   • photos 버킷 원본 signedUrl(getPhotoUrl, bucket=photos)은 현재 앱에서 호출처가 없고,
--     호출되더라도 발급 주체가 본인일 때만 유효 → 본인 원본은 계속 접근 가능.
--   • upload(insert)/delete 정책은 007 그대로 유지(본인 폴더만). select만 강화한다.
--
-- ⚠ Supabase Dashboard SQL 편집기에서 실행 권장 (storage.* 권한 필요).

-- photos: 본인이 올린 폴더(첫 세그먼트 = uid)만 직접 SELECT 허용
--   (007의 "authenticated 전체 select"를 폐기하고 대체)
drop policy if exists "photos_user_select" on storage.objects;
create policy "photos_user_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
-- 타인 사진은 공개 thumbnails 버킷(getPublicUrl) 또는 소유자가 발급한 signedUrl 경유로 접근.

-- ============================================================
-- Realtime publication (채팅 messages + 사진 photos 실시간)
-- ============================================================
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.photos;
