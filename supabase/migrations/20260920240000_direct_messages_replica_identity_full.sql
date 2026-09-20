-- Realtime precisa da linha completa (não só a PK) pra avaliar a RLS
-- em eventos de UPDATE (ex: marcar read_at). Sem isso, quem enviou a
-- mensagem não recebe o evento de "lida" em tempo real.
alter table public.direct_messages replica identity full;
