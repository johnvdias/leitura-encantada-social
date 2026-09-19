-- =============================================
-- 1. FIX INFINITE RECURSION ON club_members
-- A leftover, buggy policy from before the codebase's earlier
-- "fix_rls_recursion" migration (20250725150000) had crept back in: it
-- queried club_members from within a club_members policy AND compared a
-- column to itself instead of to the outer row
-- (club_members_1.club_id = club_members_1.club_id), which made every
-- query touching club_members fail with
-- "infinite recursion detected in policy for relation club_members" -
-- breaking club pages entirely. "Allow authenticated users to view
-- members" already covers this correctly (see the original migration's
-- own reasoning: access is really gated by the clubs table's policy).
-- =============================================
DROP POLICY IF EXISTS "Allow approved members to see other members" ON public.club_members;
DROP POLICY IF EXISTS "Allow users to request to join a club" ON public.club_members;
DROP POLICY IF EXISTS "Allow creator or user to delete membership" ON public.club_members;
DROP POLICY IF EXISTS "Allow view for public clubs and approved members of private clu" ON public.clubs;

-- =============================================
-- 2. CHALLENGES: creator couldn't see their own new challenge
-- Only participants could SELECT challenges, but the creator isn't a
-- participant until the challenge_participants insert immediately after -
-- which itself needs to see the challenges row to pass its own policy.
-- =============================================
DROP POLICY IF EXISTS "Allow participants to view challenges" ON public.challenges;
CREATE POLICY "Creator or participants can view challenges"
ON public.challenges FOR SELECT
USING (
  auth.uid() = creator_id
  OR EXISTS (SELECT 1 FROM public.challenge_participants cp WHERE cp.challenge_id = challenges.id AND cp.user_id = auth.uid())
);

-- =============================================
-- 3. NUDGES: the push-notification trigger could abort the nudge itself
-- handle_new_nudge() raised a hard EXCEPTION when the SUPABASE_ANON_KEY
-- vault secret was missing, which aborted the entire nudge INSERT (the
-- trigger runs in the same transaction). That secret was never actually
-- set, so every nudge was failing in production. Also fixes a real bug:
-- it looked up the sender by "profiles.id = NEW.sender_id" but
-- sender_id holds the auth user id, i.e. profiles.user_id - so the
-- notification title was always "NULL te cutucou!".
--
-- Seed the vault secret with the project's anon key (the same public
-- value already shipped in src/integrations/supabase/client.ts - not a
-- new exposure). If the anon key is ever rotated, re-run this insert
-- with the new value.
-- =============================================
SELECT vault.create_secret(
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2aGtxY3VoZHBidGp2d21lYmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3NzYxODUsImV4cCI6MjEwNTM1MjE4NX0.6MRIF5bHOpTnulXLD9KIwriKyUs12mxCfPmpqIMegEk',
  'SUPABASE_ANON_KEY',
  'Anon key used by DB triggers to call the send-push-notification Edge Function'
)
WHERE NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'SUPABASE_ANON_KEY');

CREATE OR REPLACE FUNCTION public.handle_new_nudge()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  anon_key TEXT;
  sender_username TEXT;
  payload JSONB;
BEGIN
  BEGIN
    SELECT decrypted_secret INTO anon_key FROM vault.decrypted_secrets WHERE name = 'SUPABASE_ANON_KEY';

    IF anon_key IS NULL THEN
      RAISE WARNING 'SUPABASE_ANON_KEY not found in Supabase Vault; skipping push notification for nudge %', NEW.id;
    ELSE
      SELECT username INTO sender_username FROM public.profiles WHERE user_id = NEW.sender_id;

      payload := jsonb_build_object(
        'targetUserId', NEW.receiver_id,
        'title', coalesce(sender_username, 'Alguém') || ' te cutucou! 👋',
        'body', 'Que tal compartilhar sua leitura atual no feed?',
        'tag', 'nudge-' || NEW.id
      );

      PERFORM net.http_post(
        url := 'https://bvhkqcuhdpbtjvwmebcq.supabase.co/functions/v1/send-push-notification',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || anon_key,
            'apikey', anon_key
        ),
        body := payload
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Push notification dispatch failed for nudge %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_nudge() IS 'Fires the push notification Edge Function for a new nudge. Never blocks the nudge insert itself: any failure (missing vault secret, network error) is caught and logged as a WARNING.';
