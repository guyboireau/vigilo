-- ============================================================
-- Cidar — Modules Extensions : AccessLens + StyleGuard
-- ============================================================

-- ── Accessibility Audits (AccessLens) ─────────────────────────

create table public.accessibility_audits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  url text not null,
  title text,
  wcag_version text not null default '2.1',
  conformance_level text not null default 'AA' check (conformance_level in ('A', 'AA', 'AAA')),
  total_issues integer not null default 0,
  score integer not null default 100, -- 0-100
  issues jsonb not null default '[]'::jsonb,
  -- issues: [{ type: 'contrast', severity: 'critical', wcag: '1.4.3', message: '...', selector: '...' }, ...]
  screenshot_url text,
  created_at timestamptz default now() not null
);

alter table public.accessibility_audits enable row level security;

create policy "accessibility_audits: self/org read"
  on public.accessibility_audits for select
  using (
    auth.uid() = user_id
    or (org_id is not null and public.is_org_member(org_id))
  );

create policy "accessibility_audits: self/org insert"
  on public.accessibility_audits for insert
  with check (
    auth.uid() = user_id
    or (org_id is not null and public.is_org_member(org_id))
  );

create policy "accessibility_audits: self/org delete"
  on public.accessibility_audits for delete
  using (
    auth.uid() = user_id
    or (org_id is not null and public.is_org_member(org_id))
  );

create index accessibility_audits_user_id_idx on public.accessibility_audits(user_id);
create index accessibility_audits_org_id_idx on public.accessibility_audits(org_id);
create index accessibility_audits_project_id_idx on public.accessibility_audits(project_id);
create index accessibility_audits_created_at_idx on public.accessibility_audits(created_at desc);

-- ── Style Guides (StyleGuard) ─────────────────────────────────

create table public.style_guides (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  rules jsonb not null default '{}'::jsonb,
  -- rules: {
  --   tense: boolean,
  --   tone: boolean,
  --   terminology: boolean,
  --   punctuation: boolean,
  --   capitalization: boolean,
  --   repetition: boolean,
  --   passive_voice: boolean,
  --   jargon: boolean,
  --   custom_terms: [{ wrong: 'e-mail', right: 'email' }, ...]
  -- }
  is_default boolean not null default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.style_guides enable row level security;

create policy "style_guides: org members crud"
  on public.style_guides for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

create index style_guides_org_id_idx on public.style_guides(org_id);

-- ── Style Checks (StyleGuard) ─────────────────────────────────

create table public.style_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete cascade,
  style_guide_id uuid references public.style_guides(id) on delete set null,
  title text not null,
  content text not null,
  total_issues integer not null default 0,
  score integer not null default 100,
  issues jsonb not null default '[]'::jsonb,
  -- issues: [{ type: 'tense', severity: 'warning', message: '...', line: 3, column: 15 }, ...]
  created_at timestamptz default now() not null
);

alter table public.style_checks enable row level security;

create policy "style_checks: self/org read"
  on public.style_checks for select
  using (
    auth.uid() = user_id
    or (org_id is not null and public.is_org_member(org_id))
  );

create policy "style_checks: self/org insert"
  on public.style_checks for insert
  with check (
    auth.uid() = user_id
    or (org_id is not null and public.is_org_member(org_id))
  );

create policy "style_checks: self/org delete"
  on public.style_checks for delete
  using (
    auth.uid() = user_id
    or (org_id is not null and public.is_org_member(org_id))
  );

create index style_checks_user_id_idx on public.style_checks(user_id);
create index style_checks_org_id_idx on public.style_checks(org_id);
create index style_checks_guide_id_idx on public.style_checks(style_guide_id);

-- ── Triggers ──────────────────────────────────────────────────

create trigger style_guides_updated_at
  before update on public.style_guides
  for each row execute procedure public.update_updated_at();

-- Insert default style guide for existing orgs
insert into public.style_guides (org_id, name, description, rules, is_default)
select
  o.id,
  'Style Guide par défaut',
  'Règles de style recommandées pour tous les projets.',
  '{
    "tense": true,
    "tone": true,
    "terminology": true,
    "punctuation": true,
    "capitalization": true,
    "repetition": true,
    "passive_voice": false,
    "jargon": false,
    "custom_terms": [
      {"wrong": "e-mail", "right": "email"},
      {"wrong": "web site", "right": "website"},
      {"wrong": "utilisateur", "right": "user"}
    ]
  }'::jsonb,
  true
from public.organizations o;
