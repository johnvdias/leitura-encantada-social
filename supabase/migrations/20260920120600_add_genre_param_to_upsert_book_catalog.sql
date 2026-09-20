DROP FUNCTION IF EXISTS public.upsert_book_catalog(text, text, text, text, text, text, text, integer, text, text, text, text, text, text);

CREATE FUNCTION public.upsert_book_catalog(
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
  p_open_library_id text DEFAULT NULL,
  p_genre text DEFAULT NULL
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
      genre = coalesce(genre, p_genre),
      updated_at = now()
    WHERE id = v_id;
    RETURN v_id;
  END IF;

  INSERT INTO book_catalog (
    title, subtitle, authors, isbn_10, isbn_13, publisher, published_date,
    page_count, language, description, cover_url, source, google_books_id, open_library_id, genre
  ) VALUES (
    p_title, p_subtitle, p_authors, p_isbn_10, p_isbn_13, p_publisher, p_published_date,
    p_page_count, p_language, p_description, p_cover_url, p_source, p_google_books_id, p_open_library_id, p_genre
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_book_catalog(
  text, text, text, text, text, text, text, integer, text, text, text, text, text, text, text
) TO authenticated;
