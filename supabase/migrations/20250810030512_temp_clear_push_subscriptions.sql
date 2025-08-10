-- This migration was applied and then the file was deleted, causing a history mismatch.
-- Recreating it to satisfy the Supabase CLI. This migration was already run
-- and cleared the push_subscriptions table.

SELECT 'This file is intentionally left with a simple select to fix migration history.';
