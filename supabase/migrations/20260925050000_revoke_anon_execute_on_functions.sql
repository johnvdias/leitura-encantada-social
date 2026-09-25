-- O linter de segurança do Supabase apontou várias funções SECURITY
-- DEFINER executáveis pelo papel "anon" (não logado), mesmo nenhuma delas
-- fazendo sentido sem sessão - todas dependem de auth.uid() ou de contexto
-- de clube/desafio/cronograma que só existe logada. A maioria já se
-- protege sozinha (auth.uid() nulo nunca bate com nada), mas revogar o
-- acesso anônimo fecha a brecha por completo, em vez de depender só da
-- lógica interna de cada função.
REVOKE EXECUTE ON FUNCTION public.get_club_rankings(uuid, date, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_club_public(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_approved_club_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_challenge_creator(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_challenge_participant(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_club_creator(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_schedule_creator(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_schedule_participant(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.join_club_by_invite_code(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.regenerate_club_invite_code(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.upsert_book_catalog(text, text, text, text, text, text, text, integer, text, text, text, text, text, text, text) FROM anon;

-- get_club_rankings e is_club_public (criadas nesta sessão) ficaram com
-- EXECUTE concedido a PUBLIC (privilégio padrão do Postgres pra funções
-- novas), que é herdado por "anon" mesmo depois de revogar dele
-- diretamente - diferente do resto do projeto, que já revoga de PUBLIC e
-- concede só a authenticated.
REVOKE EXECUTE ON FUNCTION public.get_club_rankings(uuid, date, date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_club_public(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_club_rankings(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_club_public(uuid) TO authenticated;
