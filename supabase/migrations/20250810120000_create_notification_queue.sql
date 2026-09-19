-- Tabela para enfileirar as notificações a serem enviadas
CREATE TABLE public.notification_queue (
    id bigserial PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    target_user_id uuid NOT NULL,
    payload jsonb NOT NULL,
    processed_at timestamp with time zone
);

-- Habilita RLS
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

-- Permite que usuários autenticados insiram na fila
CREATE POLICY "Allow authenticated users to insert"
ON public.notification_queue
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Função RPC que o cliente irá chamar
CREATE OR REPLACE FUNCTION public.send_nudge_notification_rpc(
    p_recipient_id uuid,
    p_title text,
    p_body text,
    p_tag text
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.notification_queue(target_user_id, payload)
    VALUES (
        p_recipient_id,
        jsonb_build_object(
            'title', p_title,
            'body', p_body,
            'tag', p_tag
        )
    );
END;
$$;

-- Função de gatilho que invoca a Função Edge
CREATE OR REPLACE FUNCTION public.trigger_send_push_notification()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Invoca a Função Edge 'send-push-notification' de forma assíncrona
    -- passando o payload da nova linha inserida.
    PERFORM net.http_post(
        url := 'https://bvhkqcuhdpbtjvwmebcq.supabase.co/functions/v1/send-push-notification',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('request.jwt.claim', true)
        ),
        body := jsonb_build_object(
            'targetUserId', NEW.target_user_id,
            'title', NEW.payload->>'title',
            'body', NEW.payload->>'body',
            'tag', NEW.payload->>'tag'
        )
    );
    
    RETURN NEW;
END;
$$;

-- O gatilho que é acionado a cada nova inserção na fila
CREATE TRIGGER on_notification_queued
AFTER INSERT
ON public.notification_queue
FOR EACH ROW
EXECUTE FUNCTION public.trigger_send_push_notification();
