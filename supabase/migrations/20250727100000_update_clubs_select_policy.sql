-- Remove a política de visualização de clubes antiga, se existir, para evitar conflitos.
DROP POLICY IF EXISTS "Users can view public clubs and their clubs" ON public.clubs;

-- Cria uma nova política de visualização para a tabela de clubes.
CREATE POLICY "Users can view public clubs and joined clubs"
ON public.clubs
FOR SELECT
USING (
  -- Permite ver se o clube NÃO é privado.
  is_private = false
  OR
  -- Ou permite ver se o usuário é membro do clube.
  (EXISTS (
    SELECT 1
    FROM public.club_members
    WHERE club_members.club_id = clubs.id AND club_members.user_id = auth.uid()
  ))
);

-- Comentário para documentar a nova lógica da política.
COMMENT ON POLICY "Users can view public clubs and joined clubs" ON public.clubs
IS 'Permite que usuários vejam todos os clubes públicos ou os clubes privados dos quais são membros.';
