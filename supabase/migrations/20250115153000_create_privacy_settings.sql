-- Criar tabela de configurações de privacidade
CREATE TABLE user_privacy_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  profile_visibility TEXT DEFAULT 'public' CHECK (profile_visibility IN ('public', 'friends', 'private')),
  show_reading_activity BOOLEAN DEFAULT TRUE,
  show_statistics BOOLEAN DEFAULT TRUE,
  show_achievements BOOLEAN DEFAULT TRUE,
  allow_friend_requests BOOLEAN DEFAULT TRUE,
  email_notifications BOOLEAN DEFAULT TRUE,
  app_notifications BOOLEAN DEFAULT TRUE,
  reading_recommendations BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índice para otimizar consultas
CREATE INDEX idx_privacy_settings_user_id ON user_privacy_settings(user_id);

-- Habilitar RLS
ALTER TABLE user_privacy_settings ENABLE ROW LEVEL SECURITY;

-- Política para usuários poderem ver apenas suas próprias configurações
CREATE POLICY "Users can view own privacy settings" ON user_privacy_settings
  FOR SELECT USING (auth.uid() = user_id);

-- Política para usuários poderem atualizar apenas suas próprias configurações
CREATE POLICY "Users can update own privacy settings" ON user_privacy_settings
  FOR ALL USING (auth.uid() = user_id);
