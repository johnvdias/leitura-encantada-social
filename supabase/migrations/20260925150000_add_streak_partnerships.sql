-- Ofensiva em dupla estilo Duolingo (#7 da lista de ideias): duas amigas
-- compartilham uma sequência de dias - ambas precisam bater a meta diária
-- de leitura pra manter o fogo 🔥 aceso. "Gelinhos" ❄️ (freezes_available)
-- perdoam um dia perdido por uma das duas sem quebrar a sequência.
CREATE TABLE public.streak_partnerships (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references public.profiles(user_id) on delete cascade,
  user_b_id uuid not null references public.profiles(user_id) on delete cascade,
  requested_by uuid not null references public.profiles(user_id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','active','ended')),
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  freezes_available integer not null default 1,
  last_extended_date date,
  last_evaluated_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint streak_partnerships_distinct_users check (user_a_id <> user_b_id),
  -- Par canônico (sempre o menor uuid em user_a_id) evita linhas duplicadas
  -- pra mesma dupla em ordens diferentes.
  constraint streak_partnerships_ordered_pair check (user_a_id < user_b_id)
);

CREATE UNIQUE INDEX streak_partnerships_pair_idx ON public.streak_partnerships (user_a_id, user_b_id);
CREATE INDEX streak_partnerships_user_a_idx ON public.streak_partnerships (user_a_id);
CREATE INDEX streak_partnerships_user_b_idx ON public.streak_partnerships (user_b_id);
CREATE INDEX streak_partnerships_active_idx ON public.streak_partnerships (status) WHERE status = 'active';

ALTER TABLE public.streak_partnerships ENABLE ROW LEVEL SECURITY;

-- Só leitura direta pelas participantes. Toda escrita passa pelas funções
-- SECURITY DEFINER abaixo (sem policy de INSERT/UPDATE/DELETE = bloqueado
-- por padrão pro client), seguindo o mesmo padrão de join_club_by_invite_code.
CREATE POLICY "Participants can view their partnerships"
ON public.streak_partnerships FOR SELECT
USING ((select auth.uid()) = user_a_id OR (select auth.uid()) = user_b_id);

CREATE OR REPLACE FUNCTION public.request_streak_partnership(p_friend_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_user_a uuid;
  v_user_b uuid;
  v_id uuid;
  v_status text;
BEGIN
  IF v_caller IS NULL OR p_friend_id IS NULL OR v_caller = p_friend_id THEN
    RAISE EXCEPTION 'Convite inválido';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
      AND ((requester_id = v_caller AND addressee_id = p_friend_id)
        OR (requester_id = p_friend_id AND addressee_id = v_caller))
  ) THEN
    RAISE EXCEPTION 'Só é possível convidar amigas';
  END IF;

  IF v_caller < p_friend_id THEN
    v_user_a := v_caller; v_user_b := p_friend_id;
  ELSE
    v_user_a := p_friend_id; v_user_b := v_caller;
  END IF;

  SELECT id, status INTO v_id, v_status
  FROM public.streak_partnerships
  WHERE user_a_id = v_user_a AND user_b_id = v_user_b;

  IF v_id IS NOT NULL THEN
    IF v_status IN ('pending', 'active') THEN
      RAISE EXCEPTION 'Já existe uma ofensiva em dupla com essa amiga';
    END IF;

    UPDATE public.streak_partnerships
    SET status = 'pending',
        requested_by = v_caller,
        current_streak = 0,
        longest_streak = 0,
        freezes_available = 1,
        last_extended_date = NULL,
        last_evaluated_date = NULL,
        updated_at = now()
    WHERE id = v_id;
  ELSE
    INSERT INTO public.streak_partnerships (user_a_id, user_b_id, requested_by)
    VALUES (v_user_a, v_user_b, v_caller)
    RETURNING id INTO v_id;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, content, related_id)
  SELECT p_friend_id, 'streak_invite',
         coalesce(p.display_name, 'Uma amiga') || ' quer começar uma ofensiva em dupla com você! 🔥',
         'Leiam juntas todo dia e mantenham o fogo aceso. Topa?',
         v_caller
  FROM public.profiles p WHERE p.user_id = v_caller;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.request_streak_partnership(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_streak_partnership(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.respond_to_streak_partnership(p_partnership_id uuid, p_accept boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_row public.streak_partnerships;
BEGIN
  SELECT * INTO v_row FROM public.streak_partnerships WHERE id = p_partnership_id;

  IF v_row IS NULL OR v_row.status <> 'pending' THEN
    RAISE EXCEPTION 'Convite não encontrado ou já respondido';
  END IF;

  IF v_caller <> v_row.user_a_id AND v_caller <> v_row.user_b_id THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  IF v_caller = v_row.requested_by THEN
    RAISE EXCEPTION 'Quem convidou não pode responder o próprio convite';
  END IF;

  IF p_accept THEN
    UPDATE public.streak_partnerships
    SET status = 'active', updated_at = now()
    WHERE id = p_partnership_id;

    INSERT INTO public.notifications (user_id, type, title, content, related_id)
    SELECT v_row.requested_by, 'streak_accepted',
           coalesce(p.display_name, 'Sua amiga') || ' aceitou a ofensiva em dupla! 🔥',
           'Agora é ler todo dia pra manter o fogo aceso juntas!',
           v_caller
    FROM public.profiles p WHERE p.user_id = v_caller;
  ELSE
    UPDATE public.streak_partnerships
    SET status = 'ended', updated_at = now()
    WHERE id = p_partnership_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.respond_to_streak_partnership(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_to_streak_partnership(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.end_streak_partnership(p_partnership_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_row public.streak_partnerships;
BEGIN
  SELECT * INTO v_row FROM public.streak_partnerships WHERE id = p_partnership_id;

  IF v_row IS NULL THEN
    RAISE EXCEPTION 'Ofensiva não encontrada';
  END IF;

  IF v_caller <> v_row.user_a_id AND v_caller <> v_row.user_b_id THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  UPDATE public.streak_partnerships
  SET status = 'ended', updated_at = now()
  WHERE id = p_partnership_id;
END;
$$;

REVOKE ALL ON FUNCTION public.end_streak_partnership(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.end_streak_partnership(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_streak_partnership_progress(p_partnership_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_row public.streak_partnerships;
  v_today_start timestamptz;
  v_goal_a int;
  v_goal_b int;
  v_pages_a int;
  v_pages_b int;
BEGIN
  SELECT * INTO v_row FROM public.streak_partnerships WHERE id = p_partnership_id;

  IF v_row IS NULL OR (v_caller <> v_row.user_a_id AND v_caller <> v_row.user_b_id) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  -- Fuso de Brasília (fixo em UTC-3, sem horário de verão) - mesma
  -- convenção usada no lembrete diário (send-daily-goal-reminders).
  v_today_start := (date_trunc('day', (now() AT TIME ZONE 'America/Sao_Paulo')) AT TIME ZONE 'America/Sao_Paulo');

  SELECT coalesce(reading_goal, 10) INTO v_goal_a FROM public.profiles WHERE user_id = v_row.user_a_id;
  SELECT coalesce(reading_goal, 10) INTO v_goal_b FROM public.profiles WHERE user_id = v_row.user_b_id;

  SELECT coalesce(sum(pages_read), 0) INTO v_pages_a
  FROM public.reading_history WHERE user_id = v_row.user_a_id AND created_at >= v_today_start;

  SELECT coalesce(sum(pages_read), 0) INTO v_pages_b
  FROM public.reading_history WHERE user_id = v_row.user_b_id AND created_at >= v_today_start;

  RETURN jsonb_build_object(
    'user_a_id', v_row.user_a_id,
    'user_b_id', v_row.user_b_id,
    'user_a_pages_today', v_pages_a,
    'user_a_goal', v_goal_a,
    'user_a_met_goal', v_pages_a >= v_goal_a,
    'user_b_pages_today', v_pages_b,
    'user_b_goal', v_goal_b,
    'user_b_met_goal', v_pages_b >= v_goal_b
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_streak_partnership_progress(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_streak_partnership_progress(uuid) TO authenticated;
