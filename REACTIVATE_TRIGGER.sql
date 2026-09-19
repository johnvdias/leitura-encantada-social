-- 🔄 QUERY PARA REATIVAR PUSH NOTIFICATIONS NO TRIGGER
-- Execute esta query no SQL Editor do Supabase após fazer deploy da função

CREATE OR REPLACE FUNCTION public.handle_new_nudge()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  anon_key TEXT;
  payload JSONB;
BEGIN
  -- Retrieve the ANONYMOUS KEY from the Supabase Vault.
  SELECT decrypted_secret INTO anon_key FROM vault.decrypted_secrets WHERE name = 'SUPABASE_ANON_KEY';

  IF anon_key IS NULL THEN
    RAISE EXCEPTION 'CRITICAL: SUPABASE_ANON_KEY not found in Supabase Vault.';
  END IF;

  -- Create the payload for the send-push-notification function
  payload := jsonb_build_object(
    'targetUserId', NEW.receiver_id,
    'title', (SELECT username FROM profiles WHERE user_id = NEW.sender_id) || ' te cutucou! 👋',
    'body', 'Que tal compartilhar sua leitura atual no feed?',
    'tag', 'nudge-' || NEW.id
  );

  -- Call the Edge Function
  PERFORM net.http_post(
    url := 'https://qsqshakcihzsvxjrpzsc.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_key,
        'apikey', anon_key
    ),
    body := payload
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_nudge() IS 'Push notifications reativadas - função funcionando!';
