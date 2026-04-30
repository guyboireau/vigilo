-- ============================================================
-- Cidar — Initial Schema
-- ============================================================

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  avatar_url text,
  created_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "profiles: self read"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: self update"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Linked Accounts (provider tokens stored server-side)
-- ============================================================
create table public.linked_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('github', 'gitlab', 'vercel', 'cloudflare')),
  access_token text not null,
  username text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now() not null,
  unique (user_id, provider)
);

alter table public.linked_accounts enable row level security;

create policy "linked_accounts: self crud"
  on public.linked_accounts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- Projects
-- ============================================================
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  github_owner text,
  github_repo text,
  gitlab_namespace text,
  gitlab_project text,
  vercel_project_id text,
  cloudflare_zone_id text,
  cloudflare_worker_name text,
  enabled boolean default true not null,
  created_at timestamptz default now() not null
);

alter table public.projects enable row level security;

create policy "projects: self crud"
  on public.projects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index projects_user_id_idx on public.projects(user_id);

-- ============================================================
-- Health Checks
-- ============================================================
create table public.health_checks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  github_status text check (github_status in ('success','failure','warning','no_ci','not_found','error','running','unknown')),
  github_data jsonb,
  gitlab_status text check (gitlab_status in ('success','failure','warning','no_ci','not_found','error','running','unknown')),
  gitlab_data jsonb,
  vercel_status text check (vercel_status in ('success','failure','warning','no_ci','not_found','error','running','unknown')),
  vercel_data jsonb,
  cloudflare_status text check (cloudflare_status in ('success','failure','warning','no_ci','not_found','error','running','unknown')),
  cloudflare_data jsonb,
  overall_status text generated always as (
    case
      when github_status = 'failure' or vercel_status = 'failure'
        or gitlab_status = 'failure' or cloudflare_status = 'failure' then 'failure'
      when github_status = 'warning' or vercel_status = 'warning'
        or gitlab_status = 'warning' or cloudflare_status = 'warning' then 'warning'
      when github_status = 'running' or vercel_status = 'running'
        or gitlab_status = 'running' or cloudflare_status = 'running' then 'running'
      when github_status is null and vercel_status is null
        and gitlab_status is null and cloudflare_status is null then 'unknown'
      else 'success'
    end
  ) stored,
  checked_at timestamptz default now() not null
);

alter table public.health_checks enable row level security;

create policy "health_checks: self read"
  on public.health_checks for select
  using (auth.uid() = user_id);

create policy "health_checks: self insert"
  on public.health_checks for insert
  with check (auth.uid() = user_id);

create index health_checks_project_id_idx on public.health_checks(project_id);
create index health_checks_user_id_checked_at_idx on public.health_checks(user_id, checked_at desc);

-- View: latest check per project (for dashboard)
create view public.projects_with_latest_check as
select
  p.*,
  hc.id as check_id,
  hc.github_status,
  hc.github_data,
  hc.gitlab_status,
  hc.gitlab_data,
  hc.vercel_status,
  hc.vercel_data,
  hc.cloudflare_status,
  hc.cloudflare_data,
  hc.overall_status,
  hc.checked_at
from public.projects p
left join lateral (
  select * from public.health_checks hc2
  where hc2.project_id = p.id
  order by hc2.checked_at desc
  limit 1
) hc on true;
