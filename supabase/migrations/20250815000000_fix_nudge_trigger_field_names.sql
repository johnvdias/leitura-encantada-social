-- Fix nudge trigger function to use correct field names
-- The table uses receiver_id and sender_id, not nudged_user_id and nudger_user_id

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

  -- Create the payload for the 'send-push-notification' function
  -- Fixed: Use NEW.receiver_id instead of NEW.nudged_user_id
  -- Fixed: Use NEW.sender_id instead of NEW.nudger_user_id
  payload := jsonb_build_object(
    'targetUserId', NEW.receiver_id,
    'title', (SELECT username FROM profiles WHERE id = NEW.sender_id) || ' te cutucou! 👋',
    'body', 'Que tal compartilhar sua leitura atual no feed?',
    'tag', 'nudge-' || NEW.id
  );

  -- Call the Edge Function using the ANONYMOUS KEY for proper authorization
  PERFORM net.http_post(
    url := 'https://bvhkqcuhdpbtjvwmebcq.supabase.co/functions/v1/send-push-notification',
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

COMMENT ON FUNCTION public.handle_new_nudge() IS 'Fixed field names: uses receiver_id and sender_id instead of nudged_user_id and nudger_user_id';
