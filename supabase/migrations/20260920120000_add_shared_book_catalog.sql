CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Catálogo compartilhado de livros (diferente de "books", que é a estante
-- pessoal de cada usuária). Quando uma busca encontra um livro numa API
-- externa e a usuária adiciona, o livro passa a existir aqui pra sempre -
-- a próxima busca por ele (de qualquer usuária) encontra direto aqui, sem
-- precisar consultar Google Books/Open Library de novo.
CREATE TABLE public.book_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  authors text,
  isbn_10 text,
  isbn_13 text,
  publisher text,
  published_date text,
  page_count integer,
  language text,
  description text,
  cover_url text,
  source text NOT NULL DEFAULT 'manual',
  google_books_id text,
  open_library_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Só um índice único parcial por identificador (permite múltiplas linhas
-- com o campo nulo, mas nunca dois livros com o mesmo identificador
-- preenchido) - é isso que torna o catálogo à prova de duplicata.
CREATE UNIQUE INDEX book_catalog_isbn_13_key ON public.book_catalog (isbn_13) WHERE isbn_13 IS NOT NULL;
CREATE UNIQUE INDEX book_catalog_isbn_10_key ON public.book_catalog (isbn_10) WHERE isbn_10 IS NOT NULL;
CREATE UNIQUE INDEX book_catalog_google_books_id_key ON public.book_catalog (google_books_id) WHERE google_books_id IS NOT NULL;
CREATE UNIQUE INDEX book_catalog_open_library_id_key ON public.book_catalog (open_library_id) WHERE open_library_id IS NOT NULL;
CREATE INDEX book_catalog_title_trgm_idx ON public.book_catalog USING gin (title gin_trgm_ops);

ALTER TABLE public.book_catalog ENABLE ROW LEVEL SECURITY;

-- Leitura liberada pra qualquer usuária logada (é referência compartilhada,
-- não dado pessoal). Sem política de INSERT/UPDATE/DELETE pra usuária comum
-- de propósito: toda escrita passa pela função upsert_book_catalog abaixo,
-- que já resolve a deduplicação com segurança (SECURITY DEFINER).
CREATE POLICY "Qualquer usuária logada pode ver o catálogo"
ON public.book_catalog FOR SELECT
TO authenticated
USING (true);

-- Registro de cada busca de livro, pra medir se o catálogo próprio está
-- realmente reduzindo as chamadas às APIs externas ao longo do tempo.
CREATE TABLE public.book_search_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  search_type text NOT NULL,
  query text NOT NULL,
  resolved_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Sem políticas de SELECT/INSERT pra authenticated/anon de propósito: só a
-- edge function (com a service role, que ignora RLS) grava aqui. A
-- consulta pra análise é feita direto no SQL Editor do Supabase.
ALTER TABLE public.book_search_log ENABLE ROW LEVEL SECURITY;

-- Cache de resultados de busca externa, pra evitar rechamar Google
-- Books/Open Library com a mesma pesquisa mesmo quando ninguém adiciona o
-- livro (diferente do book_catalog, que só recebe livros efetivamente
-- adicionados por alguma usuária).
CREATE TABLE public.book_search_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  search_query text NOT NULL,
  normalized_query text,
  isbn text,
  provider text NOT NULL,
  external_id text,
  response_data jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX book_search_cache_normalized_query_idx ON public.book_search_cache (normalized_query);
CREATE INDEX book_search_cache_isbn_idx ON public.book_search_cache (isbn);
CREATE INDEX book_search_cache_expires_at_idx ON public.book_search_cache (expires_at);

-- Só a edge function (service role) lê/escreve aqui.
ALTER TABLE public.book_search_cache ENABLE ROW LEVEL SECURITY;

-- Deduplicação atômica: recebe os dados de um livro (de uma API externa ou
-- de cadastro manual) e devolve o id de uma linha existente do catálogo se
-- achar por algum identificador confiável (nessa ordem: ISBN-13, ISBN-10,
-- Google Books ID, Open Library ID, e por último título+autor exatos como
-- último recurso) - ou cria uma linha nova. SECURITY DEFINER: roda com o
-- dono da função, então a usuária comum não precisa de permissão de
-- INSERT/UPDATE direta na tabela (só essa função consegue escrever nela).
CREATE OR REPLACE FUNCTION public.upsert_book_catalog(
  p_title text,
  p_subtitle text DEFAULT NULL,
  p_authors text DEFAULT NULL,
  p_isbn_10 text DEFAULT NULL,
  p_isbn_13 text DEFAULT NULL,
  p_publisher text DEFAULT NULL,
  p_published_date text DEFAULT NULL,
  p_page_count integer DEFAULT NULL,
  p_language text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_cover_url text DEFAULT NULL,
  p_source text DEFAULT 'manual',
  p_google_books_id text DEFAULT NULL,
  p_open_library_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_isbn_13 IS NOT NULL THEN
    SELECT id INTO v_id FROM book_catalog WHERE isbn_13 = p_isbn_13;
  END IF;

  IF v_id IS NULL AND p_isbn_10 IS NOT NULL THEN
    SELECT id INTO v_id FROM book_catalog WHERE isbn_10 = p_isbn_10;
  END IF;

  IF v_id IS NULL AND p_google_books_id IS NOT NULL THEN
    SELECT id INTO v_id FROM book_catalog WHERE google_books_id = p_google_books_id;
  END IF;

  IF v_id IS NULL AND p_open_library_id IS NOT NULL THEN
    SELECT id INTO v_id FROM book_catalog WHERE open_library_id = p_open_library_id;
  END IF;

  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM book_catalog
    WHERE lower(title) = lower(p_title) AND lower(coalesce(authors, '')) = lower(coalesce(p_authors, ''))
    LIMIT 1;
  END IF;

  IF v_id IS NOT NULL THEN
    -- Livro já existe (achado por algum identificador ou por título+autor) -
    -- só completa campos que ainda estavam vazios, nunca sobrescreve dado
    -- que já existia.
    UPDATE book_catalog SET
      subtitle = coalesce(subtitle, p_subtitle),
      authors = coalesce(authors, p_authors),
      isbn_10 = coalesce(isbn_10, p_isbn_10),
      isbn_13 = coalesce(isbn_13, p_isbn_13),
      publisher = coalesce(publisher, p_publisher),
      published_date = coalesce(published_date, p_published_date),
      page_count = coalesce(page_count, p_page_count),
      language = coalesce(language, p_language),
      description = coalesce(description, p_description),
      cover_url = coalesce(cover_url, p_cover_url),
      google_books_id = coalesce(google_books_id, p_google_books_id),
      open_library_id = coalesce(open_library_id, p_open_library_id),
      updated_at = now()
    WHERE id = v_id;
    RETURN v_id;
  END IF;

  INSERT INTO book_catalog (
    title, subtitle, authors, isbn_10, isbn_13, publisher, published_date,
    page_count, language, description, cover_url, source, google_books_id, open_library_id
  ) VALUES (
    p_title, p_subtitle, p_authors, p_isbn_10, p_isbn_13, p_publisher, p_published_date,
    p_page_count, p_language, p_description, p_cover_url, p_source, p_google_books_id, p_open_library_id
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_book_catalog TO authenticated;
