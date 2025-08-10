-- Reverte a arquitetura de fila de notificações, pois o Vault não está disponível.
-- A chamada será feita diretamente do cliente para a Função Edge.

-- Remove o gatilho da tabela
DROP TRIGGER IF EXISTS on_notification_queued ON public.notification_queue;

-- Remove a função do gatilho
DROP FUNCTION IF EXISTS public.trigger_send_push_notification();

-- Remove a função RPC
DROP FUNCTION IF EXISTS public.send_nudge_notification_rpc(uuid, text, text, text);

-- Remove a tabela da fila
DROP TABLE IF EXISTS public.notification_queue;
