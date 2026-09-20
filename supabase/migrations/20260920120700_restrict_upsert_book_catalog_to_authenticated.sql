-- Por padrão o Postgres libera EXECUTE pra PUBLIC (que inclui o papel
-- "anon") na criação da função, mesmo já tendo um GRANT explícito pra
-- authenticated - o advisor de segurança confirmou isso. Sem essa revogação,
-- qualquer pessoa não logada poderia inserir lixo no catálogo compartilhado.
REVOKE EXECUTE ON FUNCTION public.upsert_book_catalog(
  text, text, text, text, text, text, text, integer, text, text, text, text, text, text, text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.upsert_book_catalog(
  text, text, text, text, text, text, text, integer, text, text, text, text, text, text, text
) TO authenticated;
