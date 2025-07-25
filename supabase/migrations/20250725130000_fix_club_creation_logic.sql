-- Recria a função que adiciona o criador ao clube com privilégios de segurança elevados.
-- A cláusula SECURITY DEFINER faz com que a função execute com os privilégios do usuário que a DEFINIU,
-- e não do usuário que a INVOCOU, bypassando assim as políticas RLS para esta operação específica.
CREATE OR REPLACE FUNCTION public.add_club_creator_as_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.club_members (club_id, user_id, role)
  VALUES (NEW.id, NEW.creator_id, 'admin');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garante que o trigger que usa a função está ativo.
-- (Pode ser redundante se já existir, mas garante o estado correto).
DROP TRIGGER IF EXISTS add_creator_as_member_trigger ON public.clubs;
CREATE TRIGGER add_creator_as_member_trigger
AFTER INSERT ON public.clubs
FOR EACH ROW
EXECUTE FUNCTION public.add_club_creator_as_member();

-- Remove a política de INSERT anterior em club_members para evitar conflitos.
DROP POLICY IF EXISTS "Allow users to join clubs" ON public.club_members;

-- Cria uma nova política de INSERT que é mais permissiva e confia na lógica do frontend/backend
-- para inserir apenas as linhas corretas (um usuário se auto-adicionando).
CREATE POLICY "Allow authenticated users to become members"
ON public.club_members FOR INSERT
WITH CHECK (auth.role() = 'authenticated');