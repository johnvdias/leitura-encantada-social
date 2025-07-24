
-- Criar foreign key constraint entre posts.user_id e profiles.user_id
ALTER TABLE public.posts 
ADD CONSTRAINT fk_posts_user_id 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(user_id) 
ON DELETE CASCADE;

-- Criar índice na coluna user_id da tabela posts para melhor performance
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);

-- Criar índice na coluna book_id da tabela posts para melhor performance (já que é usado nas queries)
CREATE INDEX IF NOT EXISTS idx_posts_book_id ON public.posts(book_id);

-- Criar índice na coluna created_at da tabela posts para ordenação
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);

-- Adicionar constraint para garantir que post_type tenha valores válidos
ALTER TABLE public.posts 
ADD CONSTRAINT check_post_type 
CHECK (post_type IN ('general', 'review', 'recommendation', 'progress', 'quote'));

-- Adicionar constraint para garantir que visibility tenha valores válidos
ALTER TABLE public.posts 
ADD CONSTRAINT check_visibility 
CHECK (visibility IN ('public', 'friends', 'private'));
