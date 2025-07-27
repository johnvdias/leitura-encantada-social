-- Habilita a RLS na tabela de desafios, caso ainda não esteja.
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- Remove qualquer política de DELETE existente para evitar conflitos.
DROP POLICY IF EXISTS "Creator can delete their own challenges" ON public.challenges;

-- Cria a política que permite ao criador do desafio excluí-lo.
CREATE POLICY "Creator can delete their own challenges" 
ON public.challenges
FOR DELETE 
USING (auth.uid() = creator_id);

-- Comentário para documentar a política.
COMMENT ON POLICY "Creator can delete their own challenges" ON public.challenges 
IS 'Garante que apenas o usuário que criou o desafio pode excluí-lo.';
