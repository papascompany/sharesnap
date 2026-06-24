-- 012_payments_checkout.sql
-- 결제(토스페이먼츠) + 체크아웃(배송지) 레이어
-- 트랙 B(상업화): photobook/print 주문 공용 payments 테이블 + 포토북 배송 컬럼

-- ============================================================
-- payments — 토스페이먼츠 결제 레코드 (포토북·인화 공용)
-- ============================================================
-- 결제의 단일 진실 소스. 클라이언트는 select만(본인), 생성/확정은 서버(service_role)만.
-- merchant_order_id = 토스에 전달하는 orderId(고유). payment_key = 토스 결제 식별자.
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- 어떤 종류의 주문에 대한 결제인지
  order_kind text not null check (order_kind in ('photobook', 'print')),
  -- 대상 주문 id (photobook_orders.id 또는 print_orders.id) — FK는 두 테이블 분기라 미설정, 앱에서 보장
  order_id uuid not null,
  provider text not null default 'toss',
  -- 토스에 보내는 주문번호(고유) — 재시도 시 같은 주문이면 재사용
  merchant_order_id text not null,
  -- 청구 금액(원). 서버가 pricing으로 산출 — 클라이언트 조작 방지
  amount integer not null check (amount >= 0),
  status text not null default 'ready' check (status in ('ready', 'paid', 'canceled', 'failed')),
  payment_key text,
  method text,
  receipt_url text,
  approved_at timestamptz,
  -- 토스 원응답 보관(분쟁/디버깅)
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists payments_merchant_order_uidx
  on public.payments (merchant_order_id);
create index if not exists payments_user_idx
  on public.payments (user_id, created_at desc);
create index if not exists payments_order_idx
  on public.payments (order_kind, order_id);
create index if not exists payments_status_idx
  on public.payments (status);

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at
before update on public.payments
for each row execute procedure public.set_updated_at();

-- RLS: 본인 결제 조회만 허용. 생성/수정은 정책 없음 → service_role(서버)만 가능.
alter table public.payments enable row level security;

drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments
  for select using (user_id = auth.uid());

-- ============================================================
-- photobook_orders — 체크아웃 배송/연락처 컬럼 추가
-- (print_orders는 004에서 이미 shipping_address/recipient_* 보유)
-- ============================================================
alter table public.photobook_orders
  add column if not exists recipient_name text,
  add column if not exists recipient_phone text,
  add column if not exists shipping_address jsonb,
  add column if not exists memo text,
  add column if not exists paid_at timestamptz;

-- print_orders — 결제 연동용 paid_at(있으면 유지)
alter table public.print_orders
  add column if not exists paid_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists print_orders_set_updated_at on public.print_orders;
create trigger print_orders_set_updated_at
before update on public.print_orders
for each row execute procedure public.set_updated_at();
