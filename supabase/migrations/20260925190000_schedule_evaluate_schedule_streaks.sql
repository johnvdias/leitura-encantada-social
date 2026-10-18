-- 02:50 UTC = 23:50 BRT, mesmo horário das outras avaliações diárias.
SELECT cron.schedule(
  'evaluate-schedule-streaks',
  '50 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://bvhkqcuhdpbtjvwmebcq.supabase.co/functions/v1/evaluate-schedule-streaks',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', public.get_cron_secret('cron_daily_reminder_secret')
    ),
    body := jsonb_build_object('trigger', 'cron'),
    timeout_milliseconds := 30000
  );
  $$
);
