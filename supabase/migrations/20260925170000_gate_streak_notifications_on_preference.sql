-- Respeita a preferência "duo_streak" antes de notificar convite/aceite de
-- ofensiva em dupla, mesmo padrão usado pelas outras notificações sociais.
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
  v_friend_prefs jsonb;
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

  SELECT notification_preferences INTO v_friend_prefs FROM public.profiles WHERE user_id = p_friend_id;
  IF (v_friend_prefs ->> 'duo_streak') IS DISTINCT FROM 'false' THEN
    INSERT INTO public.notifications (user_id, type, title, content, related_id)
    SELECT p_friend_id, 'streak_invite',
           coalesce(p.display_name, 'Uma amiga') || ' quer começar uma ofensiva em dupla com você! 🔥',
           'Leiam juntas todo dia e mantenham o fogo aceso. Topa?',
           v_caller
    FROM public.profiles p WHERE p.user_id = v_caller;
  END IF;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_to_streak_partnership(p_partnership_id uuid, p_accept boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_row public.streak_partnerships;
  v_inviter_prefs jsonb;
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

    SELECT notification_preferences INTO v_inviter_prefs FROM public.profiles WHERE user_id = v_row.requested_by;
    IF (v_inviter_prefs ->> 'duo_streak') IS DISTINCT FROM 'false' THEN
      INSERT INTO public.notifications (user_id, type, title, content, related_id)
      SELECT v_row.requested_by, 'streak_accepted',
             coalesce(p.display_name, 'Sua amiga') || ' aceitou a ofensiva em dupla! 🔥',
             'Agora é ler todo dia pra manter o fogo aceso juntas!',
             v_caller
      FROM public.profiles p WHERE p.user_id = v_caller;
    END IF;
  ELSE
    UPDATE public.streak_partnerships
    SET status = 'ended', updated_at = now()
    WHERE id = p_partnership_id;
  END IF;
END;
$$;
