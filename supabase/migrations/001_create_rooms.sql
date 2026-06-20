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
