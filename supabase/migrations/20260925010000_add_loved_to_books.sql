-- "Amei esse livro": uma marcação além das 5 estrelas, pro coraçãozinho que
-- fica depois delas na estante.
ALTER TABLE public.books ADD COLUMN loved boolean NOT NULL DEFAULT false;
