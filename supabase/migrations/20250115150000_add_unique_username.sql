-- Adicionar campo username na tabela profiles
ALTER TABLE profiles 
ADD COLUMN username TEXT UNIQUE;

-- Criar índice para otimizar buscas por username
CREATE INDEX idx_profiles_username ON profiles(username);

-- Atualizar usernames existentes para evitar conflitos (opcional)
-- Gerar usernames baseados no display_name ou email
UPDATE profiles 
SET username = LOWER(REPLACE(COALESCE(display_name, SPLIT_PART(user_id, '-', 1)), ' ', '_'))
WHERE username IS NULL;

-- Garantir que todos os usernames sejam únicos
UPDATE profiles 
SET username = username || '_' || EXTRACT(EPOCH FROM NOW())::TEXT
WHERE username IN (
  SELECT username 
  FROM profiles 
  GROUP BY username 
  HAVING COUNT(*) > 1
);
