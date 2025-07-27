-- Remove a política de visualização de clubes antiga para substituí-la pela versão corrigida.
DROP POLICY IF EXISTS "Users can view public clubs and joined clubs" ON public.clubs;
DROP POLICY IF EXISTS "Allow view for public or member" ON public.clubs;


-- Cria uma nova política de visualização que inclui o criador.
CREATE POLICY "Allow view for public, members, and creator"
ON public.clubs
FOR SELECT
USING (
  -- Condição 1: O clube é público.
  is_private = false
  OR
  -- Condição 2: O usuário logado é o criador do clube.
  creator_id = auth.uid()
  OR
  -- Condição 3: O usuário logado é membro do clube.
  (EXISTS (
    SELECT 1
    FROM public.club_members
    WHERE club_members.club_id = clubs.id AND club_members.user_id = auth.uid()
  ))
);

-- Comentário para documentar a lógica aprimorada.
COMMENT ON POLICY "Allow view for public, members, and creator" ON public.clubs
IS 'Permite a visualização de clubes se forem públicos, ou se o usuário for o criador ou um membro.';
