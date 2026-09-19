-- Atualiza a função do gatilho para usar a chave de serviço do Supabase Vault

CREATE OR REPLACE FUNCTION public.trigger_send_push_notification()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    service_key text;
BEGIN
    -- Busca a chave de serviço armazenada de forma segura no Vault.
    -- O UUID 'e53a..._YOUR_KEY_UUID' corresponde à chave "service_role_key".
    -- O Supabase gerencia esse UUID automaticamente pelo nome da chave.
    SELECT decrypted_secret INTO service_key 
    FROM supabase_vault.secrets 
    WHERE name = 'service_role_key';

    IF service_key IS NULL THEN
        RAISE EXCEPTION 'Chave "service_role_key" não encontrada no Vault.';
    END IF;

    -- Invoca a Função Edge 'send-push-notification' de forma assíncrona,
    -- usando a chave de serviço para autorização.
    PERFORM net.http_post(
        url := 'https://bvhkqcuhdpbtjvwmebcq.supabase.co/functions/v1/send-push-notification',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'apikey', service_key, -- Usa a chave de serviço como apikey
            'Authorization', 'Bearer ' || service_key
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
