-- ============================================================
-- Organizations, Members, Invitations
-- ============================================================

-- 1. CREATE TABLES FIRST (no forward references)
-- ============================================================

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  owner_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz default now() not null
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz default now() not null,
  unique (org_id, user_id)
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  token text unique not null default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  invited_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  created_at timestamptz default now() not null,
  unique (org_id, email)
);

-- 2. ADD COLUMNS TO EXISTING TABLES
-- ============================================================

alter table public.projects
  add column if not exists org_id uuid references public.organizations(id) on delete cascade;

alter table public.http_monitors
  add column if not exists org_id uuid references public.organizations(id) on delete cascade;

alter table public.status_pages
  add column if not exists org_id uuid references public.organizations(id) on delete cascade;

alter table public.linked_accounts
  add column if not exists org_id uuid references public.organizations(id) on delete cascade;

alter table public.notification_settings
  add column if not exists org_id uuid references public.organizations(id) on delete cascade;

alter table public.profiles
  add column if not exists current_org_id uuid references public.organizations(id) on delete set null;

-- 3. INDEXES
-- ============================================================

create index organizations_owner_id_idx on public.organizations(owner_id);
create index organization_members_org_id_idx on public.organization_members(org_id);
create index organization_members_user_id_idx on public.organization_members(user_id);
create index invitations_org_id_idx on public.invitations(org_id);
create index invitations_token_idx on public.invitations(token);
create index projects_org_id_idx on public.projects(org_id);
create index http_monitors_org_id_idx on public.http_monitors(org_id);

-- 4. HELPER FUNCTION (needed by RLS policies)
-- ============================================================

create or replace function public.is_org_member(p_org_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.organization_members om
    where om.org_id = p_org_id and om.user_id = auth.uid()
  ) or exists (
    select 1 from public.organizations o
    where o.id = p_org_id and o.owner_id = auth.uid()
  )
$$;

-- 5. ENABLE RLS
-- ============================================================

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.invitations enable row level security;

-- 6. RLS POLICIES
-- ============================================================

-- Organizations
create policy "organizations: members read"
  on public.organizations for select
  using (
    auth.uid() = owner_id
    or exists (
      select 1 from public.organization_members om
      where om.org_id = id and om.user_id = auth.uid()
    )
  );

create policy "organizations: owner update"
  on public.organizations for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "organizations: owner delete"
  on public.organizations for delete
  using (auth.uid() = owner_id);

-- Organization members
create policy "org_members: org members read"
  on public.organization_members for select
  using (
    exists (
      select 1 from public.organization_members om2
      where om2.org_id = org_id and om2.user_id = auth.uid()
    )
    or exists (
      select 1 from public.organizations o
      where o.id = org_id and o.owner_id = auth.uid()
    )
  );

create policy "org_members: owner/admin manage"
  on public.organization_members for all
  using (
    exists (
      select 1 from public.organization_members om2
      where om2.org_id = org_id and om2.user_id = auth.uid()
        and om2.role in ('owner', 'admin')
    )
    or exists (
      select 1 from public.organizations o
      where o.id = org_id and o.owner_id = auth.uid()
    )
  );

-- Invitations
create policy "invitations: org members read"
  on public.invitations for select
  using (
    exists (
      select 1 from public.organization_members om
      where om.org_id = org_id and om.user_id = auth.uid()
    )
    or exists (
      select 1 from public.organizations o
      where o.id = org_id and o.owner_id = auth.uid()
    )
    or (accepted_at is null and expires_at > now())
  );

create policy "invitations: owner/admin insert"
  on public.invitations for insert
  with check (
    exists (
      select 1 from public.organization_members om
      where om.org_id = org_id and om.user_id = auth.uid()
        and om.role in ('owner', 'admin')
    )
    or exists (
      select 1 from public.organizations o
      where o.id = org_id and o.owner_id = auth.uid()
    )
  );

create policy "invitations: owner/admin delete"
  on public.invitations for delete
  using (
    exists (
      select 1 from public.organization_members om
      where om.org_id = org_id and om.user_id = auth.uid()
        and om.role in ('owner', 'admin')
    )
    or exists (
      select 1 from public.organizations o
      where o.id = org_id and o.owner_id = auth.uid()
    )
  );

-- Projects: org access in addition to self
create policy "projects: org members crud"
  on public.projects for all
  using (org_id is not null and public.is_org_member(org_id))
  with check (org_id is not null and public.is_org_member(org_id));

-- HTTP monitors: org access
create policy "http_monitors: org members crud"
  on public.http_monitors for all
  using (org_id is not null and public.is_org_member(org_id))
  with check (org_id is not null and public.is_org_member(org_id));

-- Status pages: org access
create policy "status_pages: org members crud"
  on public.status_pages for all
  using (org_id is not null and public.is_org_member(org_id))
  with check (org_id is not null and public.is_org_member(org_id));

-- 7. TRIGGERS
-- ============================================================

-- Auto-create org + member on user signup
create or replace function public.handle_new_user_org()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_org_id uuid;
  v_base_slug text;
  v_slug text;
  v_counter int := 0;
begin
  v_base_slug := lower(regexp_replace(
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'workspace'),
    '[^a-z0-9]', '-', 'g'
  ));
  v_slug := v_base_slug;

  loop
    exit when not exists (select 1 from public.organizations where slug = v_slug);
    v_counter := v_counter + 1;
    v_slug := v_base_slug || '-' || v_counter;
  end loop;

  insert into public.organizations (name, slug, owner_id)
  values (
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'Mon espace') || '''s workspace',
    v_slug,
    new.id
  )
  returning id into v_org_id;

  insert into public.organization_members (org_id, user_id, role)
  values (v_org_id, new.id, 'owner');

  return new;
end;
$$;

create trigger on_auth_user_created_org
  after insert on auth.users
  for each row execute procedure public.handle_new_user_org();

-- Auto-set current_org_id after org is created
create or replace function public.set_default_org()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
  set current_org_id = new.id
  where id = new.owner_id and current_org_id is null;
  return new;
end;
$$;

create trigger on_organization_created_set_default
  after insert on public.organizations
  for each row execute procedure public.set_default_org();
