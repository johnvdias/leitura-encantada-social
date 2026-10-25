-- 18:00 UTC = 15:00 BRT: lembrete leve do meio da tarde, antes dos
-- existentes às 20h (evening) e 23h (final).
SELECT cron.schedule(
  'daily-goal-reminder-afternoon',
  '0 18 * * *',
  $$
  SELECT net.http_post(
    url := 'https://bvhkqcuhdpbtjvwmebcq.supabase.co/functions/v1/send-daily-goal-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', public.get_cron_secret('cron_daily_reminder_secret')
    ),
    body := jsonb_build_object('stage', 'afternoon'),
    timeout_milliseconds := 30000
  );
  $$
);
