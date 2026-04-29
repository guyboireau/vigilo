-- ============================================================
-- Vigilo — Modules Extensions : Audit UX + Dev Tools
-- ============================================================

-- ── UX Audits (DarkPatternDetector) ───────────────────────────

create table public.ux_audits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  url text not null,
  title text,
  total_patterns integer not null default 0,
  severity_score integer not null default 0, -- 0-100, plus c'est bas plus c'est grave
  patterns jsonb not null default '[]'::jsonb,
  -- patterns: [{ type: 'preChecked', count: 3, severity: 'high', examples: [...] }, ...]
  screenshot_url text,
  created_at timestamptz default now() not null
);

alter table public.ux_audits enable row level security;

create policy "ux_audits: self/org read"
  on public.ux_audits for select
  using (
    auth.uid() = user_id
    or (org_id is not null and public.is_org_member(org_id))
  );

create policy "ux_audits: self/org insert"
  on public.ux_audits for insert
  with check (
    auth.uid() = user_id
    or (org_id is not null and public.is_org_member(org_id))
  );

create policy "ux_audits: self/org delete"
  on public.ux_audits for delete
  using (
    auth.uid() = user_id
    or (org_id is not null and public.is_org_member(org_id))
  );

create index ux_audits_user_id_idx on public.ux_audits(user_id);
create index ux_audits_org_id_idx on public.ux_audits(org_id);
create index ux_audits_project_id_idx on public.ux_audits(project_id);
create index ux_audits_created_at_idx on public.ux_audits(created_at desc);

-- ── Code Snippets (DevFlow) ───────────────────────────────────

create table public.code_snippets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete cascade,
  title text not null,
  code text not null,
  language text not null default 'text',
  tags text[] default '{}',
  is_public boolean not null default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.code_snippets enable row level security;

create policy "code_snippets: self/org read"
  on public.code_snippets for select
  using (
    auth.uid() = user_id
    or (org_id is not null and public.is_org_member(org_id))
    or is_public = true
  );

create policy "code_snippets: self/org insert"
  on public.code_snippets for insert
  with check (
    auth.uid() = user_id
    or (org_id is not null and public.is_org_member(org_id))
  );

create policy "code_snippets: self/org update"
  on public.code_snippets for update
  using (
    auth.uid() = user_id
    or (org_id is not null and public.is_org_member(org_id))
  );

create policy "code_snippets: self/org delete"
  on public.code_snippets for delete
  using (
    auth.uid() = user_id
    or (org_id is not null and public.is_org_member(org_id))
  );

create index code_snippets_user_id_idx on public.code_snippets(user_id);
create index code_snippets_org_id_idx on public.code_snippets(org_id);
create index code_snippets_language_idx on public.code_snippets(language);

-- ── PR Templates (DevFlow) ──────────────────────────────────

create table public.pr_templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  type text not null default 'feature' check (type in ('feature', 'bugfix', 'refactor', 'docs', 'hotfix', 'chore')),
  template text not null,
  is_default boolean not null default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (org_id, name)
);

alter table public.pr_templates enable row level security;

create policy "pr_templates: org members crud"
  on public.pr_templates for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

create index pr_templates_org_id_idx on public.pr_templates(org_id);

-- Insert default templates
insert into public.pr_templates (org_id, name, type, template, is_default)
select
  o.id,
  'Standard',
  'feature',
  '## ✨ Feature: {{title}}

### Summary
{{summary}}

### Changes
- 

### Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Self-reviewed code
',
  true
from public.organizations o;

-- ── Updated_at trigger for snippets ──────────────────────────

create trigger code_snippets_updated_at
  before update on public.code_snippets
  for each row execute procedure public.update_updated_at();

create trigger pr_templates_updated_at
  before update on public.pr_templates
  for each row execute procedure public.update_updated_at();
