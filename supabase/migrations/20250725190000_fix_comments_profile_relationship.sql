-- O nome da restrição pode variar, então primeiro removemos qualquer restrição antiga
-- na coluna user_id para evitar conflitos.
ALTER TABLE public.post_comments
DROP CONSTRAINT IF EXISTS post_comments_user_id_fkey;

-- Agora, adicionamos a nova e correta restrição de chave estrangeira.
-- Isso cria a "ponte" direta entre a tabela de comentários e a de perfis,
-- que é o que o Supabase precisa para entender a sua consulta.
ALTER TABLE public.post_comments
ADD CONSTRAINT post_comments_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles(user_id)
ON DELETE CASCADE;