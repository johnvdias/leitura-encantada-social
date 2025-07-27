-- Adiciona a coluna current_book_id na tabela clubs
ALTER TABLE public.clubs
ADD COLUMN current_book_id UUID REFERENCES public.books(id) ON DELETE SET NULL;

-- Adiciona um comentário para a nova coluna
COMMENT ON COLUMN public.clubs.current_book_id IS 'O livro que está sendo lido atualmente pelo clube.';

-- Recria a política de UPDATE para garantir que a nova coluna possa ser atualizada
DROP POLICY IF EXISTS "Allow update for creators" ON public.clubs;

CREATE POLICY "Allow update for creators"
ON public.clubs FOR UPDATE
USING (auth.uid() = creator_id)
WITH CHECK (auth.uid() = creator_id);
