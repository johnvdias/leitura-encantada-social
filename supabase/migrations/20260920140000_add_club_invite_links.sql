-- Hoje um clube privado só aparece pra quem já é membro (RLS bloqueia
-- SELECT de quem não é), então nem um link direto pro clube funcionava pra
-- convidar alguém de fora. Um código de convite + duas funções
-- SECURITY DEFINER resolvem isso sem abrir a visibilidade geral do clube.
ALTER TABLE public.clubs ADD COLUMN invite_code text;
CREATE UNIQUE INDEX clubs_invite_code_key ON public.clubs (invite_code) WHERE invite_code IS NOT NULL;

-- Só a própria criadora do clube pode gerar/renovar o código.
CREATE FUNCTION public.regenerate_club_invite_code(p_club_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM clubs WHERE id = p_club_id AND creator_id = auth.uid()) THEN
    RAISE EXCEPTION 'Apenas a criadora do clube pode gerar o convite';
  END IF;

  v_code := substr(md5(random()::text || clock_timestamp()::text), 1, 10);
  UPDATE clubs SET invite_code = v_code WHERE id = p_club_id;
  RETURN v_code;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.regenerate_club_invite_code(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.regenerate_club_invite_code(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.regenerate_club_invite_code(uuid) TO authenticated;

-- Quem tem o código entra direto como membro aprovada (o próprio link já é
-- a aprovação - quem manda o convite decidiu compartilhar com aquela
-- pessoa). Idempotente: usar o link de novo não duplica nem rebaixa quem
-- já é membro.
CREATE FUNCTION public.join_club_by_invite_code(p_invite_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_club_id uuid;
  v_existing_status text;
BEGIN
  SELECT id INTO v_club_id FROM clubs WHERE invite_code = p_invite_code;
  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'Convite inválido ou expirado';
  END IF;

  SELECT status INTO v_existing_status FROM club_members WHERE club_id = v_club_id AND user_id = auth.uid();

  IF v_existing_status IS NULL THEN
    INSERT INTO club_members (club_id, user_id, status, role) VALUES (v_club_id, auth.uid(), 'approved', 'member');
  ELSIF v_existing_status = 'pending' THEN
    UPDATE club_members SET status = 'approved' WHERE club_id = v_club_id AND user_id = auth.uid();
  END IF;

  RETURN v_club_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.join_club_by_invite_code(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.join_club_by_invite_code(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.join_club_by_invite_code(text) TO authenticated;
