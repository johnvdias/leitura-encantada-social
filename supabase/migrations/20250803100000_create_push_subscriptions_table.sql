-- Tabela para armazenar as inscrições de notificações push
CREATE TABLE public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    subscription JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilita a segurança de nível de linha
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Índice para consultas rápidas de user_id
CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

-- Políticas de Segurança (RLS)
-- Permite que usuários leiam apenas suas próprias inscrições
CREATE POLICY "Allow users to read their own subscriptions"
ON public.push_subscriptions FOR SELECT
USING (auth.uid() = user_id);

-- Permite que usuários insiram inscrições apenas para si mesmos
CREATE POLICY "Allow users to insert their own subscriptions"
ON public.push_subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Permite que usuários excluam apenas suas próprias inscrições
CREATE POLICY "Allow users to delete their own subscriptions"
ON public.push_subscriptions FOR DELETE
USING (auth.uid() = user_id);

-- Concede todas as permissões na nova tabela para o role 'service_role',
-- que será usado pela nossa função de backend para buscar as inscrições.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO service_role;
