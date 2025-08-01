-- Adiciona a coluna 'status' para gerenciar aprovações de membros.
ALTER TABLE public.club_members
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

-- Adiciona a coluna 'role' para diferenciar o criador dos membros.
ALTER TABLE public.club_members
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member';

-- Função para garantir que o criador do clube seja sempre um membro aprovado e com a role de criador.
-- Isso previne problemas de inconsistência de dados.
CREATE OR REPLACE FUNCTION public.ensure_creator_is_approved()
RETURNS void AS $$
BEGIN
  -- Garante que o criador do clube tenha o status 'approved'.
  UPDATE public.club_members cm
  SET status = 'approved'
  FROM public.clubs c
  WHERE cm.club_id = c.id AND cm.user_id = c.creator_id;

  -- Garante que o criador do clube tenha a role 'creator'.
  UPDATE public.club_members cm
  SET role = 'creator'
  FROM public.clubs c
  WHERE cm.club_id = c.id AND cm.user_id = c.creator_id;
END;
$$ LANGUAGE plpgsql;

-- Executa a função para corrigir quaisquer dados existentes.
SELECT public.ensure_creator_is_approved();

-- Remove políticas antigas para evitar conflitos.
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.club_members;
DROP POLICY IF EXISTS "Allow users to request to join a club" ON public.club_members;
DROP POLICY IF EXISTS "Allow approved members to see other members" ON public.club_members;
DROP POLICY IF EXISTS "Allow club creator to update member status" ON public.club_members;
DROP POLICY IF EXISTS "Allow creator or user to delete membership" ON public.club_members;

-- Novas Políticas de Segurança (RLS)

-- Permite que um usuário crie uma solicitação para entrar em um clube.
CREATE POLICY "Allow users to request to join a club"
ON public.club_members FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Permite que membros aprovados vejam a lista de outros membros (aprovados ou pendentes).
CREATE POLICY "Allow approved members to see other members"
ON public.club_members FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.club_members
    WHERE club_id = club_members.club_id AND user_id = auth.uid() AND status = 'approved'
  )
);

-- Permite que o criador do clube aprove ou recuse solicitações.
CREATE POLICY "Allow club creator to update member status"
ON public.club_members FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.clubs
    WHERE id = club_members.club_id AND creator_id = auth.uid()
  )
);

-- Permite que o criador remova um membro ou que um usuário saia do clube.
CREATE POLICY "Allow creator or user to delete membership"
ON public.club_members FOR DELETE
USING (
  (user_id = auth.uid()) OR
  (EXISTS (
    SELECT 1
    FROM public.clubs
    WHERE id = club_members.club_id AND creator_id = auth.uid()
  ))
);
