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
