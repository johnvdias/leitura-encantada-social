-- A publicação supabase_realtime existia mas estava vazia: nenhuma tabela
-- tinha sido adicionada a ela. Isso significa que os canais 'postgres_changes'
-- já usados em useFeed.ts e useNotifications.ts nunca recebiam eventos de
-- verdade em produção - a inscrição no WebSocket funcionava, mas o Postgres
-- nunca publicava as mudanças porque as tabelas não estavam na publicação.
--
-- Adiciona as tabelas que precisam aparecer pros usuários sem recarregar a
-- página: posts e notifications (que já tinham código torcendo por isso) e
-- post_comments, post_likes, club_discussions (novos assinantes adicionados
-- agora nos hooks correspondentes).
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.club_discussions;
