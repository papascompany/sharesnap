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
