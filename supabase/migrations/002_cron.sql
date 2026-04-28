-- PRÉREQUIS: activer pg_cron dans Supabase Dashboard → Database → Extensions → pg_cron
-- PRÉREQUIS: activer pg_net dans Supabase Dashboard → Database → Extensions → pg_net
--
-- Remplace <SERVICE_ROLE_KEY> par ta clé depuis Supabase → Project Settings → API
-- Puis exécute ce SQL dans Supabase → SQL Editor

select cron.schedule(
  'cidar-daily-healthcheck',
  '0 6 * * *',
  $$
  select net.http_post(
    url     := 'https://glvdyenokrgfzrdlgcvz.supabase.co/functions/v1/health-check',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    ),
    body    := '{"run_all": true}'::jsonb
  );
  $$
);
