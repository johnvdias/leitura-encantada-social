-- Sequência (fogo) e gelinhos pra meta de leitura DIÁRIA pessoal, no mesmo
-- espírito do que já existe pra cronograma de clube/duo: a cada 7 dias
-- seguidos batendo a meta diária (profiles.reading_goal), ganha 1 gelinho,
-- até um limite de 4. Um dia perdido com gelinho disponível consome 1
-- gelinho e mantém a sequência; sem gelinho, a sequência zera.
--
-- Precisa ser uma coluna persistida (não calculada ao vivo) porque o
-- gelinho é estado: "consumir" um gelinho pra cobrir um dia faltante não dá
-- pra reconstruir só olhando o histórico de leitura depois - mesma razão
-- pela qual club_reading_schedules/group_reading_schedules/
-- streak_partnerships guardam current_streak/freezes_available em vez de
-- calcular na hora.
ALTER TABLE public.profiles
  ADD COLUMN reading_streak_current integer NOT NULL DEFAULT 0,
  ADD COLUMN reading_streak_longest integer NOT NULL DEFAULT 0,
  ADD COLUMN reading_streak_freezes integer NOT NULL DEFAULT 0,
  ADD COLUMN reading_streak_last_evaluated date;

-- Backfill único: inicializa a sequência ATIVA de cada pessoa (dias
-- consecutivos batendo a meta, terminando ONTEM) a partir do histórico já
-- existente, pra ninguém ver a sequência "zerar" no dia em que essa feature
-- entra no ar. HOJE fica de fora de propósito - a primeira avaliação do
-- cron de hoje à noite que decide o que acontece com o dia de hoje, sem
-- contar ele duas vezes aqui. Gelinhos concedidos retroativamente (1 a cada
-- 7 dias da sequência ativa, até o limite de 4) - ninguém tinha gelinho
-- "gasto" antes dessa coluna existir, então a sequência ativa corrente é só
-- dias que realmente bateram a meta.
WITH brt_today AS (
  SELECT (now() - interval '3 hours')::date AS d
),
goals AS (
  SELECT user_id, coalesce(reading_goal, 10) AS goal FROM public.profiles
),
daily AS (
  SELECT rh.user_id, (rh.created_at - interval '3 hours')::date AS brt_day, sum(rh.pages_read) AS pages
  FROM public.reading_history rh, brt_today
  WHERE (rh.created_at - interval '3 hours')::date < brt_today.d
  GROUP BY 1, 2
),
met AS (
  SELECT d.user_id, d.brt_day,
    d.brt_day - (row_number() OVER (PARTITION BY d.user_id ORDER BY d.brt_day))::int AS grp
  FROM daily d
  JOIN goals g ON g.user_id = d.user_id
  WHERE d.pages >= g.goal
),
streaks AS (
  SELECT user_id, max(brt_day) AS end_day, count(*) AS len
  FROM met
  GROUP BY user_id, grp
),
current_streaks AS (
  SELECT s.user_id, s.len
  FROM streaks s, brt_today
  WHERE s.end_day = brt_today.d - 1
)
UPDATE public.profiles p
SET reading_streak_current = coalesce(cs.len, 0),
    reading_streak_longest = coalesce(cs.len, 0),
    reading_streak_freezes = least(4, floor(coalesce(cs.len, 0) / 7.0))::int,
    reading_streak_last_evaluated = NULL
FROM public.profiles p2
LEFT JOIN current_streaks cs ON cs.user_id = p2.user_id
WHERE p.user_id = p2.user_id;

-- Avaliação diária às 23:50 BRT (mesmo horário de evaluate-schedule-streaks/
-- evaluate-streak-partnerships) - roda perto do fim do dia civil em BRT, não
-- logo depois da virada, pra enxergar o dia inteiro antes de decidir se a
-- meta foi batida.
SELECT cron.schedule(
  'evaluate-reading-streaks',
  '50 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://bvhkqcuhdpbtjvwmebcq.supabase.co/functions/v1/evaluate-reading-streaks',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', public.get_cron_secret('cron_daily_reminder_secret')
    ),
    body := jsonb_build_object('trigger', 'cron'),
    timeout_milliseconds := 30000
  );
  $$
);
