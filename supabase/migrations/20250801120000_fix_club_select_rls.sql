-- Remove a política de SELECT anterior da tabela de clubes, que estava causando um loop de RLS.
DROP POLICY IF EXISTS "Allow members to view clubs" ON public.clubs;

-- Cria uma nova política de SELECT, mais segura e eficiente.
-- Esta política evita o erro de servidor interno (500) ao quebrar a recursão de RLS.
CREATE POLICY "Allow view for public clubs and approved members of private clubs"
ON public.clubs FOR SELECT
USING (
  -- Permite a visualização se o clube não for privado.
  (is_private = false)
  OR
  -- Ou permite a visualização se o usuário for um membro aprovado do clube.
  (EXISTS (
    SELECT 1
    FROM public.club_members
    WHERE club_members.club_id = clubs.id AND club_members.user_id = auth.uid() AND club_members.status = 'approved'
  ))
);
