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
