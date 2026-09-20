-- O Supabase concede EXECUTE em funções novas do schema public diretamente
-- pro papel "anon" via privilégios padrão do projeto - revogar de PUBLIC
-- não bastou, porque o grant é pro papel "anon" especificamente, não pro
-- pseudo-papel PUBLIC.
REVOKE EXECUTE ON FUNCTION public.upsert_book_catalog(
  text, text, text, text, text, text, text, integer, text, text, text, text, text, text, text
) FROM anon;
