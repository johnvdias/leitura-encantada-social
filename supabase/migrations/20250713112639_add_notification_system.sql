-- Remove políticas problemáticas que causam recursão infinita
DROP POLICY IF EXISTS "Users can view club members" ON public.club_members;
DROP POLICY IF EXISTS "Users can leave clubs" ON public.club_members;

-- Criar políticas simplificadas sem recursão
CREATE POLICY "Users can view all club members"
ON public.club_members
FOR SELECT
USING (true);

CREATE POLICY "Users can leave their own memberships"
ON public.club_members
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Club creators can remove members"
ON public.club_members
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.clubs 
    WHERE clubs.id = club_members.club_id 
    AND clubs.creator_id = auth.uid()
  )
);

-- Criar função para automaticamente adicionar criador como membro
CREATE OR REPLACE FUNCTION public.add_club_creator_as_member()
RETURNS TRIGGER AS $$
BEGIN
  -- Adiciona o criador do clube como membro automaticamente
  INSERT INTO public.club_members (club_id, user_id, role)
  VALUES (NEW.id, NEW.creator_id, 'admin');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para executar a função após inserir um clube
CREATE TRIGGER add_creator_as_member_trigger
AFTER INSERT ON public.clubs
FOR EACH ROW
EXECUTE FUNCTION public.add_club_creator_as_member();