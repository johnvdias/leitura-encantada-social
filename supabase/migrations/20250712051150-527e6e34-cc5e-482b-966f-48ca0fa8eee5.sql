
-- Adicionar campos de avaliação e notas aos livros existentes
ALTER TABLE public.books 
ADD COLUMN rating INTEGER CHECK (rating >= 1 AND rating <= 5),
ADD COLUMN personal_notes TEXT,
ADD COLUMN tags TEXT[];

-- Criar tabela de posts do feed
CREATE TABLE public.posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  post_type TEXT NOT NULL DEFAULT 'general' CHECK (post_type IN ('general', 'progress', 'review', 'recommendation')),
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'friends', 'private')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de curtidas
CREATE TABLE public.post_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Criar tabela de comentários
CREATE TABLE public.post_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de clubes de leitura
CREATE TABLE public.clubs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_book_id UUID REFERENCES public.books(id),
  is_private BOOLEAN NOT NULL DEFAULT false,
  max_members INTEGER DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de membros dos clubes
CREATE TABLE public.club_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('creator', 'moderator', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(club_id, user_id)
);

-- Criar tabela de discussões dos clubes
CREATE TABLE public.club_discussions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_announcement BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de amizades/seguidores
CREATE TABLE public.friendships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(requester_id, addressee_id),
  CHECK (requester_id != addressee_id)
);

-- Criar tabela de conquistas
CREATE TABLE public.achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  description TEXT,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB
);

-- Criar tabela de notificações
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  related_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para posts
CREATE POLICY "Users can view public posts and friends posts" ON public.posts
FOR SELECT USING (
  visibility = 'public' OR 
  user_id = auth.uid() OR
  (visibility = 'friends' AND EXISTS (
    SELECT 1 FROM public.friendships 
    WHERE (requester_id = auth.uid() AND addressee_id = posts.user_id AND status = 'accepted')
    OR (addressee_id = auth.uid() AND requester_id = posts.user_id AND status = 'accepted')
  ))
);

CREATE POLICY "Users can create their own posts" ON public.posts
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" ON public.posts
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" ON public.posts
FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para curtidas
CREATE POLICY "Users can view all likes" ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "Users can create their own likes" ON public.post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own likes" ON public.post_likes FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para comentários
CREATE POLICY "Users can view comments on visible posts" ON public.post_comments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.posts 
    WHERE posts.id = post_comments.post_id 
    AND (
      posts.visibility = 'public' OR 
      posts.user_id = auth.uid() OR
      (posts.visibility = 'friends' AND EXISTS (
        SELECT 1 FROM public.friendships 
        WHERE (requester_id = auth.uid() AND addressee_id = posts.user_id AND status = 'accepted')
        OR (addressee_id = auth.uid() AND requester_id = posts.user_id AND status = 'accepted')
      ))
    )
  )
);

CREATE POLICY "Users can create comments" ON public.post_comments
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON public.post_comments
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON public.post_comments
FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para clubes
CREATE POLICY "Users can view public clubs and their clubs" ON public.clubs
FOR SELECT USING (
  is_private = false OR 
  creator_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.club_members WHERE club_id = clubs.id AND user_id = auth.uid())
);

CREATE POLICY "Users can create clubs" ON public.clubs
FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their clubs" ON public.clubs
FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete their clubs" ON public.clubs
FOR DELETE USING (auth.uid() = creator_id);

-- Políticas RLS para membros dos clubes
CREATE POLICY "Users can view club members" ON public.club_members
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.clubs WHERE id = club_members.club_id AND (is_private = false OR creator_id = auth.uid()))
  OR user_id = auth.uid()
);

CREATE POLICY "Users can join clubs" ON public.club_members
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave clubs" ON public.club_members
FOR DELETE USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.clubs WHERE id = club_id AND creator_id = auth.uid()));

-- Políticas RLS para discussões dos clubes
CREATE POLICY "Club members can view discussions" ON public.club_discussions
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.club_members WHERE club_id = club_discussions.club_id AND user_id = auth.uid())
);

CREATE POLICY "Club members can create discussions" ON public.club_discussions
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (SELECT 1 FROM public.club_members WHERE club_id = club_discussions.club_id AND user_id = auth.uid())
);

CREATE POLICY "Users can update their discussions" ON public.club_discussions
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their discussions" ON public.club_discussions
FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para amizades
CREATE POLICY "Users can view their friendships" ON public.friendships
FOR SELECT USING (requester_id = auth.uid() OR addressee_id = auth.uid());

CREATE POLICY "Users can create friendship requests" ON public.friendships
FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update friendship status" ON public.friendships
FOR UPDATE USING (requester_id = auth.uid() OR addressee_id = auth.uid());

CREATE POLICY "Users can delete their friendships" ON public.friendships
FOR DELETE USING (requester_id = auth.uid() OR addressee_id = auth.uid());

-- Políticas RLS para conquistas
CREATE POLICY "Users can view their own achievements" ON public.achievements
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create achievements" ON public.achievements
FOR INSERT WITH CHECK (true);

-- Políticas RLS para notificações
CREATE POLICY "Users can view their own notifications" ON public.notifications
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON public.notifications
FOR INSERT WITH CHECK (true);

-- Criar índices para performance
CREATE INDEX idx_posts_user_id ON public.posts(user_id);
CREATE INDEX idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX idx_post_likes_post_id ON public.post_likes(post_id);
CREATE INDEX idx_post_comments_post_id ON public.post_comments(post_id);
CREATE INDEX idx_club_members_club_id ON public.club_members(club_id);
CREATE INDEX idx_club_members_user_id ON public.club_members(user_id);
CREATE INDEX idx_friendships_users ON public.friendships(requester_id, addressee_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id, is_read);

-- Trigger para atualizar updated_at em posts
CREATE TRIGGER update_posts_updated_at
BEFORE UPDATE ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para atualizar updated_at em comentários
CREATE TRIGGER update_post_comments_updated_at
BEFORE UPDATE ON public.post_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para atualizar updated_at em clubes
CREATE TRIGGER update_clubs_updated_at
BEFORE UPDATE ON public.clubs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para atualizar updated_at em discussões
CREATE TRIGGER update_club_discussions_updated_at
BEFORE UPDATE ON public.club_discussions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para atualizar updated_at em amizades
CREATE TRIGGER update_friendships_updated_at
BEFORE UPDATE ON public.friendships
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
