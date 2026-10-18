-- Mesma mecânica de fogo/gelinho da ofensiva em dupla (streak_partnerships),
-- agora pros cronogramas de leitura em grupo - tanto entre amigas
-- (group_reading_schedules) quanto dentro de um clube (club_reading_schedules).
-- Fogo quando TODAS as participantes leem no dia; gelinho cobre quem não
-- leu (um gelinho por pessoa faltante); quebra se faltarem gelinhos.
ALTER TABLE public.group_reading_schedules
  ADD COLUMN current_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN longest_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN freezes_available integer NOT NULL DEFAULT 1,
  ADD COLUMN last_extended_date date,
  ADD COLUMN last_evaluated_date date;

ALTER TABLE public.club_reading_schedules
  ADD COLUMN current_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN longest_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN freezes_available integer NOT NULL DEFAULT 1,
  ADD COLUMN last_extended_date date,
  ADD COLUMN last_evaluated_date date;
