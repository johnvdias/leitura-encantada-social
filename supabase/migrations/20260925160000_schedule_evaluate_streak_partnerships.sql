-- 02:50 UTC = 23:50 BRT: perto o suficiente da virada do dia pra dar a
-- última chance, mas ainda dentro do mesmo dia BRT que está sendo avaliado.
SELECT cron.schedule(
  'evaluate-streak-partnerships',
  '50 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://bvhkqcuhdpbtjvwmebcq.supabase.co/functions/v1/evaluate-streak-partnerships',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', public.get_cron_secret('cron_daily_reminder_secret')
    ),
    body := jsonb_build_object('trigger', 'cron'),
    timeout_milliseconds := 30000
  );
  $$
);
