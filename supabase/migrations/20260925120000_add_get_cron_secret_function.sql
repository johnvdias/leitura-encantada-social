-- Expõe um segredo do Vault por nome, só pra service_role. Usado pela edge
-- function send-daily-goal-reminders pra validar que a chamada veio do
-- pg_cron (ela não tem sessão de usuária pra autenticar da forma normal).
-- O valor do segredo em si ('cron_daily_reminder_secret') foi criado direto
-- no banco via vault.create_secret() - nunca fica em texto claro em nenhum
-- arquivo deste repositório.
CREATE OR REPLACE FUNCTION public.get_cron_secret(secret_name text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = secret_name;
$$;

REVOKE ALL ON FUNCTION public.get_cron_secret(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_cron_secret(text) TO service_role;
