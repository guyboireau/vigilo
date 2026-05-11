-- Fix overall_status generated column to include 'error' status
-- The previous definition did not treat 'error' as a failure state,
-- causing projects with API errors to show as 'success'.

-- 1. Drop dependent views first

drop view if exists public.projects_with_latest_check;

-- 2. Recreate the generated column with corrected logic
alter table public.health_checks
  drop column if exists overall_status;

alter table public.health_checks
  add column overall_status text generated always as (
    case
      when github_status = 'failure' or github_status = 'error'
        or vercel_status = 'failure' or vercel_status = 'error'
        or gitlab_status = 'failure' or gitlab_status = 'error'
        or cloudflare_status = 'failure' or cloudflare_status = 'error'
        then 'failure'
      when github_status = 'warning' or vercel_status = 'warning'
        or gitlab_status = 'warning' or cloudflare_status = 'warning'
        then 'warning'
      when github_status = 'running' or vercel_status = 'running'
        or gitlab_status = 'running' or cloudflare_status = 'running'
        then 'running'
      when github_status is null and vercel_status is null
        and gitlab_status is null and cloudflare_status is null
        then 'unknown'
      else 'success'
    end
  ) stored;

-- 3. Recreate the view

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

-- 4. Re-apply RLS and grants on the view
alter view public.projects_with_latest_check owner to postgres;

grant select on public.projects_with_latest_check to authenticated;
grant select on public.projects_with_latest_check to anon;
