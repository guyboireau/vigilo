-- ============================================================
-- Plans & Subscriptions
-- ============================================================

-- Plan definitions (static reference table)
create table public.plans (
  id text primary key,
  name text not null,
  price_monthly integer not null default 0,
  max_projects integer not null default 3,
  max_monitors integer not null default 2,
  max_status_pages integer not null default 0,
  max_members integer not null default 1,
  alerts_email boolean not null default true,
  alerts_slack boolean not null default false,
  alerts_discord boolean not null default false,
  stripe_price_id text
);

insert into public.plans (id, name, price_monthly, max_projects, max_monitors, max_status_pages, max_members, alerts_email, alerts_slack, alerts_discord) values
  ('free',   'Free',   0,   3,  2,  0,  1, true,  false, false),
  ('solo',   'Solo',   900, 10, 10, 1,  1, true,  false, false),
  ('agency', 'Agency', 2900, -1, -1, -1, 10, true, true, true);

-- -1 = unlimited

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null unique references public.organizations(id) on delete cascade,
  plan_id text not null default 'free' references public.plans(id),
  stripe_customer_id text,
  stripe_subscription_id text unique,
  stripe_price_id text,
  status text not null default 'active' check (status in ('active', 'past_due', 'canceled', 'trialing', 'incomplete')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.subscriptions enable row level security;

create policy "subscriptions: org members read"
  on public.subscriptions for select
  using (public.is_org_member(org_id));

-- Only service_role can write subscriptions (via webhook)
create policy "subscriptions: service role write"
  on public.subscriptions for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Indexes
create index subscriptions_org_id_idx on public.subscriptions(org_id);
create index subscriptions_stripe_customer_id_idx on public.subscriptions(stripe_customer_id);
create index subscriptions_stripe_subscription_id_idx on public.subscriptions(stripe_subscription_id);

-- Auto-create free subscription when org is created
create or replace function public.handle_new_org_subscription()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.subscriptions (org_id, plan_id)
  values (new.id, 'free');
  return new;
end;
$$;

create trigger on_organization_created_subscription
  after insert on public.organizations
  for each row execute procedure public.handle_new_org_subscription();

-- Updated_at trigger
create or replace function public.update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute procedure public.update_updated_at();

-- ============================================================
-- View: org with current plan limits
-- ============================================================
create view public.org_with_plan as
select
  o.id,
  o.name,
  o.slug,
  o.owner_id,
  o.created_at,
  s.plan_id,
  s.status as subscription_status,
  s.stripe_customer_id,
  s.stripe_subscription_id,
  s.current_period_end,
  s.cancel_at_period_end,
  p.price_monthly,
  p.max_projects,
  p.max_monitors,
  p.max_status_pages,
  p.max_members,
  p.alerts_slack,
  p.alerts_discord
from public.organizations o
left join public.subscriptions s on s.org_id = o.id
left join public.plans p on p.id = s.plan_id;
