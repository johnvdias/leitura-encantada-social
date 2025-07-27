-- Cria a função para remover um membro do clube.
-- A função só executa com sucesso se o requisitante for o criador do clube.
CREATE OR REPLACE FUNCTION public.remove_club_member(p_club_id UUID, p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- IMPORTANTE: Executa com os privilégios do usuário que definiu a função.
AS $$
DECLARE
  v_creator_id UUID;
BEGIN
  -- Verifica se o usuário que chama a função é o criador do clube.
  SELECT creator_id INTO v_creator_id
  FROM public.clubs
  WHERE id = p_club_id;

  IF v_creator_id != auth.uid() THEN
    RAISE EXCEPTION 'Apenas o criador do clube pode remover membros.';
  END IF;

  -- Impede que o criador se remova do clube através desta função.
  IF p_user_id = v_creator_id THEN
    RAISE EXCEPTION 'O criador do clube não pode ser removido.';
  END IF;

  -- Remove o membro do clube.
  DELETE FROM public.club_members
  WHERE club_id = p_club_id AND user_id = p_user_id;
END;
$$;

-- Comentário para documentar a função.
COMMENT ON FUNCTION public.remove_club_member(UUID, UUID) 
IS 'Remove um membro de um clube. Apenas o criador do clube pode executar esta ação.';
