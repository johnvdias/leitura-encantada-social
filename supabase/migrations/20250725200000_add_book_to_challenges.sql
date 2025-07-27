-- Adiciona uma nova coluna 'book_id' à tabela de desafios.
-- Esta coluna é opcional (pode ser NULL), permitindo desafios genéricos e desafios baseados em livros.
ALTER TABLE public.challenges
ADD COLUMN book_id UUID REFERENCES public.books(id) ON DELETE SET NULL;

-- Adiciona um comentário para documentar o propósito da nova coluna.
COMMENT ON COLUMN public.challenges.book_id IS 'O livro específico associado a este desafio, se houver.';
