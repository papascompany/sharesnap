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
