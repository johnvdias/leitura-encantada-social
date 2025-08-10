-- Recreate the trigger function to use the correct authentication for calling Edge Functions.
-- Problem: Using the service_role_key for Authorization prevents the Edge Function from loading secrets from the Vault.
-- Solution: Use the anon_key for both the 'apikey' and 'Authorization' headers. This allows the
--           Edge Function runtime to correctly access secrets like VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.

CREATE OR REPLACE FUNCTION public.queue_notification_and_send()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  anon_key TEXT; -- We only need the anon key for this operation
  payload JSONB;
BEGIN
  -- Retrieve the anon key from the Supabase Vault
  SELECT decrypted_secret INTO anon_key FROM vault.decrypted_secrets WHERE name = 'SUPABASE_ANON_KEY';

  -- Check if the anon key was found
  IF anon_key IS NULL THEN
    RAISE EXCEPTION 'SUPABASE_ANON_KEY not found in Supabase Vault. Please ensure it is added.';
  END IF;

  -- Build the JSON payload for the Edge Function
  payload := jsonb_build_object(
    'targetUserId', NEW.user_id,
    'title', NEW.title,
    'body', NEW.body,
    'tag', NEW.tag
  );

  -- Call the Edge Function using the ANONYMOUS KEY for authorization.
  -- This is crucial for the function to be able to access secrets from the Vault.
  PERFORM net.http_post(
    url := 'https://qsqshakcihzsvxjrpzsc.supabase.co/functions/v1/send-push-notification',
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

COMMENT ON FUNCTION public.queue_notification_and_send() IS 'Uses the anon_key for auth to allow the target Edge Function to access Vault secrets.';
