-- Active pg_cron + pg_net (déjà dispo sur Supabase)
-- Vérification auto tous les jours à 7h Paris (6h UTC)

select cron.schedule(
  'vigilo-daily-healthcheck',
  '0 6 * * *',
  $$
  select net.http_post(
    url     := 'https://glvdyenokrgfzrdlgcvz.supabase.co/functions/v1/health-check',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body    := '{"run_all": true}'::jsonb
  );
  $$
);
