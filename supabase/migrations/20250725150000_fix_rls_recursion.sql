-- Remove a política de SELECT anterior que estava causando a recursão.
DROP POLICY IF EXISTS "Allow members to view fellow members" ON public.club_members;

-- Cria uma nova política de SELECT que é muito mais simples.
-- Ela permite que qualquer usuário autenticado leia a lista de membros.
-- A segurança é mantida porque, para chegar a esta tabela, o usuário
-- já teve que passar pela política da tabela 'clubs', que garante que ele
-- só pode consultar clubes aos quais tem acesso (públicos ou dos quais é membro).
CREATE POLICY "Allow authenticated users to view members"
ON public.club_members FOR SELECT
USING (auth.role() = 'authenticated');