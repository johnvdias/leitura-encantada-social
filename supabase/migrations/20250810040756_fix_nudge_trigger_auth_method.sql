-- Recreate the nudge trigger function and the trigger itself to use the correct authentication.
-- This specifically fixes the trigger created in the `update_trigger_to_use_vault.sql` migration.
-- Problem: The original trigger used the `service_role_key` for Authorization, which prevents the
--          called Edge Function from loading secrets from the Supabase Vault.
-- Solution: This migration updates the function to fetch the `anon_key` from the Vault and use it
--           for both the 'apikey' and 'Authorization' headers, enabling Vault access.

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
  payload := jsonb_build_object(
    'targetUserId', NEW.nudged_user_id,
    'title', (SELECT username FROM profiles WHERE id = NEW.nudger_user_id) || ' te cutucou! 👋',
    'body', 'Que tal compartilhar sua leitura atual no feed?',
    'tag', 'nudge-' || NEW.id
  );

  -- Call the Edge Function using the ANONYMOUS KEY for proper authorization
  PERFORM net.http_post(
    url := 'https://bvhkqcuhdpbtjvwmebcq.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_key, -- Use the anon key here
        'apikey', anon_key                   -- And also here
    ),
    body := payload
  );

  RETURN NEW;
END;
$$;

-- Drop the old trigger if it exists
DROP TRIGGER IF EXISTS on_nudge_created ON public.nudges;

-- Recreate the trigger to use the updated function
CREATE TRIGGER on_nudge_created
AFTER INSERT ON public.nudges
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_nudge();

COMMENT ON FUNCTION public.handle_new_nudge() IS 'Uses anon_key for auth, allowing the send-push-notification function to access Vault secrets.';
