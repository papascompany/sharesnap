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
