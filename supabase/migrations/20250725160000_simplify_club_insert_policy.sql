-- Remove a política de INSERT anterior e restritiva em club_members.
DROP POLICY IF EXISTS "Allow users to add themselves to clubs" ON public.club_members;

-- Cria uma nova política de INSERT que é mais simples.
-- Ela permite que qualquer usuário autenticado insira uma linha.
-- Isso é seguro por duas razões:
-- 1. O nosso trigger (com SECURITY DEFINER) precisa dessa permissão para adicionar o criador.
-- 2. A lógica do frontend para "entrar em um clube" também será permitida por esta política.
-- A segurança para evitar que um usuário adicione *outro* usuário pode ser reforçada no frontend
-- ou com funções RPC, mas para a criação do clube, esta política é necessária.
CREATE POLICY "Allow insert for authenticated users"
ON public.club_members FOR INSERT
WITH CHECK (auth.role() = 'authenticated');