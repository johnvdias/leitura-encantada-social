-- Agenda os dois lembretes diários de meta de leitura (edge function
-- send-daily-goal-reminders): um no fim da tarde (ainda dá tempo) e um
-- pouco antes da virada do dia (última chamada). Horários em UTC - o app é
-- majoritariamente usado em horário de Brasília (fixo em UTC-3).
-- timeout_milliseconds em 30s porque o primeiro disparo da function (cold
-- start) pode passar dos 5s padrão do pg_net.
SELECT cron.schedule(
  'daily-goal-reminder-evening',
  '0 23 * * *', -- 23:00 UTC = 20:00 BRT
  $$
  SELECT net.http_post(
    url := 'https://bvhkqcuhdpbtjvwmebcq.supabase.co/functions/v1/send-daily-goal-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', public.get_cron_secret('cron_daily_reminder_secret')
    ),
    body := jsonb_build_object('stage', 'evening'),
    timeout_milliseconds := 30000
  );
  $$
);

SELECT cron.schedule(
  'daily-goal-reminder-final',
  '0 2 * * *', -- 02:00 UTC = 23:00 BRT (da noite anterior)
  $$
  SELECT net.http_post(
    url := 'https://bvhkqcuhdpbtjvwmebcq.supabase.co/functions/v1/send-daily-goal-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', public.get_cron_secret('cron_daily_reminder_secret')
    ),
    body := jsonb_build_object('stage', 'final'),
    timeout_milliseconds := 30000
  );
  $$
);
