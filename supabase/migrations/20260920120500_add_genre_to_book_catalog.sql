-- O fluxo atual (Google Books/Open Library) já retorna e exibe gênero;
-- adicionando aqui pra não perder esse campo pros livros que vierem do
-- catálogo próprio.
ALTER TABLE public.book_catalog ADD COLUMN genre text;
