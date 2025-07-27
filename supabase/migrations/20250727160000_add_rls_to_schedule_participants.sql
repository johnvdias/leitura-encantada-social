-- Habilita a RLS na tabela de participantes do cronograma, se ainda não estiver.
ALTER TABLE public.schedule_participants ENABLE ROW LEVEL SECURITY;

-- Remove qualquer política de SELECT existente para evitar conflitos.
DROP POLICY IF EXISTS "Users can view their own schedule participations" ON public.schedule_participants;

-- Cria a política que permite a um usuário ver seus próprios registros de participação.
CREATE POLICY "Users can view their own schedule participations"
ON public.schedule_participants
FOR SELECT
USING (auth.uid() = user_id);

-- Comentário para documentar a política.
COMMENT ON POLICY "Users can view their own schedule participations" ON public.schedule_participants
IS 'Garante que os usuários só possam ver os registros de participação em cronogramas aos quais eles pertencem.';
