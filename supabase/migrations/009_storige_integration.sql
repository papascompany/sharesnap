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
