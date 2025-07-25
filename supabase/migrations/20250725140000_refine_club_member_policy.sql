-- Remove a política de INSERT anterior em club_members.
DROP POLICY IF EXISTS "Allow authenticated users to become members" ON public.club_members;

-- Cria uma nova política de INSERT que é explícita:
-- Um usuário só pode inserir uma linha na tabela club_members
-- se o user_id que está sendo inserido for o seu próprio user_id (auth.uid()).
-- Isso previne que um usuário adicione outros usuários a um clube,
-- mas permite que ele se junte a um clube, que é exatamente o que o trigger e a UI fazem.
CREATE POLICY "Allow users to add themselves to clubs"
ON public.club_members FOR INSERT
WITH CHECK (auth.uid() = user_id);