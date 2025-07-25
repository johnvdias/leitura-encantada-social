-- Remove todas as políticas existentes para clubs e club_members para começar do zero.
DROP POLICY IF EXISTS "Users can view public clubs and their clubs" ON public.clubs;
DROP POLICY IF EXISTS "Creators can update their clubs" ON public.clubs;
DROP POLICY IF EXISTS "Creators can delete their clubs" ON public.clubs;
DROP POLICY IF EXISTS "Users can view club members" ON public.club_members;
DROP POLICY IF EXISTS "Users can view all club members" ON public.club_members;
DROP POLICY IF EXISTS "Users can join clubs" ON public.club_members;
DROP POLICY IF EXISTS "Users can leave clubs" ON public.club_members;
DROP POLICY IF EXISTS "Users can leave their own memberships" ON public.club_members;
DROP POLICY IF EXISTS "Club creators can remove members" ON public.club_members;

-- =============================================
-- NOVAS POLÍTICAS PARA A TABELA 'clubs'
-- =============================================

-- 1. SELECT: Permite que qualquer usuário veja clubes públicos, ou clubes dos quais ele é membro.
CREATE POLICY "Allow view for public or member"
ON public.clubs FOR SELECT
USING (
    (is_private = false) OR
    (EXISTS (
        SELECT 1 FROM public.club_members
        WHERE club_members.club_id = clubs.id AND club_members.user_id = auth.uid()
    ))
);

-- 2. INSERT: Permite que qualquer usuário autenticado crie um novo clube.
-- (A lógica de que o criador se torna membro é tratada no frontend).
CREATE POLICY "Allow insert for authenticated users"
ON public.clubs FOR INSERT
WITH CHECK (auth.role() = 'authenticated');


-- 3. UPDATE: Apenas o criador do clube pode atualizá-lo.
CREATE POLICY "Allow update for creators"
ON public.clubs FOR UPDATE
USING (auth.uid() = creator_id);


-- 4. DELETE: Apenas o criador do clube pode deletá-lo.
CREATE POLICY "Allow delete for creators"
ON public.clubs FOR DELETE
USING (auth.uid() = creator_id);


-- =============================================
-- NOVAS POLÍTICAS PARA A TABELA 'club_members'
-- =============================================

-- 1. SELECT: Permite que membros de um clube vejam outros membros do mesmo clube.
CREATE POLICY "Allow members to view fellow members"
ON public.club_members FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.club_members as viewer_membership
        WHERE viewer_membership.club_id = club_members.club_id AND viewer_membership.user_id = auth.uid()
    )
);

-- 2. INSERT: Um usuário só pode se adicionar a um clube (não pode adicionar outros).
CREATE POLICY "Allow users to join clubs"
ON public.club_members FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 3. DELETE: Um usuário pode sair de um clube (deletar sua própria entrada),
-- OU o criador do clube pode remover qualquer membro.
CREATE POLICY "Allow members to leave or creators to remove"
ON public.club_members FOR DELETE
USING (
    (auth.uid() = user_id) OR
    (EXISTS (
        SELECT 1 FROM public.clubs
        WHERE clubs.id = club_members.club_id AND clubs.creator_id = auth.uid()
    ))
);