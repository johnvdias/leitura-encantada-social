-- Criar tabela de avaliações e resenhas
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  title TEXT,
  spoiler_warning BOOLEAN DEFAULT false,
  tags TEXT[],
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, book_id)
);

-- Criar tabela de likes em resenhas
CREATE TABLE IF NOT EXISTS review_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, review_id)
);

-- Criar tabela de citações
CREATE TABLE IF NOT EXISTS quotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  quote_text TEXT NOT NULL,
  page_number INTEGER,
  chapter TEXT,
  notes TEXT,
  is_public BOOLEAN DEFAULT true,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Criar tabela de anotações
CREATE TABLE IF NOT EXISTS annotations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  annotation_text TEXT NOT NULL,
  page_number INTEGER,
  chapter TEXT,
  annotation_type TEXT DEFAULT 'note' CHECK (annotation_type IN ('note', 'highlight', 'bookmark')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Criar tabela de progresso de leitura detalhado
CREATE TABLE IF NOT EXISTS reading_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  pages_read INTEGER NOT NULL,
  session_duration_minutes INTEGER,
  reading_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Criar tabela de metas de leitura
CREATE TABLE IF NOT EXISTS reading_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  year INTEGER DEFAULT EXTRACT(year FROM CURRENT_DATE),
  target_books INTEGER DEFAULT 12,
  target_pages INTEGER,
  current_books INTEGER DEFAULT 0,
  current_pages INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, year)
);

-- Criar tabela de atividades do feed
CREATE TABLE IF NOT EXISTS activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('book_added', 'book_finished', 'review_posted', 'quote_shared', 'goal_completed', 'joined_club')),
  related_id UUID, -- ID do livro, resenha, etc.
  content TEXT,
  metadata JSONB,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Criar tabela de listas personalizadas
CREATE TABLE IF NOT EXISTS book_lists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  cover_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Criar tabela de itens das listas
CREATE TABLE IF NOT EXISTS book_list_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id UUID REFERENCES book_lists(id) ON DELETE CASCADE,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  notes TEXT,
  UNIQUE(list_id, book_id)
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_list_items ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança para reviews
CREATE POLICY "Users can view public reviews" ON reviews FOR SELECT USING (true);
CREATE POLICY "Users can manage their own reviews" ON reviews FOR ALL USING (auth.uid() = user_id);

-- Políticas de segurança para review_likes
CREATE POLICY "Users can view review likes" ON review_likes FOR SELECT USING (true);
CREATE POLICY "Users can manage their own likes" ON review_likes FOR ALL USING (auth.uid() = user_id);

-- Políticas de segurança para quotes
CREATE POLICY "Users can view public quotes" ON quotes FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "Users can manage their own quotes" ON quotes FOR ALL USING (auth.uid() = user_id);

-- Políticas de segurança para annotations
CREATE POLICY "Users can manage their own annotations" ON annotations FOR ALL USING (auth.uid() = user_id);

-- Políticas de segurança para reading_sessions
CREATE POLICY "Users can manage their own reading sessions" ON reading_sessions FOR ALL USING (auth.uid() = user_id);

-- Políticas de segurança para reading_goals
CREATE POLICY "Users can view reading goals" ON reading_goals FOR SELECT USING (true);
CREATE POLICY "Users can manage their own goals" ON reading_goals FOR ALL USING (auth.uid() = user_id);

-- Políticas de segurança para activities
CREATE POLICY "Users can view public activities" ON activities FOR SELECT USING (is_public = true);
CREATE POLICY "Users can manage their own activities" ON activities FOR ALL USING (auth.uid() = user_id);

-- Políticas de segurança para book_lists
CREATE POLICY "Users can view public lists" ON book_lists FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "Users can manage their own lists" ON book_lists FOR ALL USING (auth.uid() = user_id);

-- Políticas de segurança para book_list_items
CREATE POLICY "Users can view list items based on list access" ON book_list_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM book_lists 
    WHERE book_lists.id = book_list_items.list_id 
    AND (book_lists.is_public = true OR book_lists.user_id = auth.uid())
  )
);
CREATE POLICY "Users can manage items in their own lists" ON book_list_items FOR ALL USING (
  EXISTS (
    SELECT 1 FROM book_lists 
    WHERE book_lists.id = book_list_items.list_id 
    AND book_lists.user_id = auth.uid()
  )
);

-- Índices para performance
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_book_id ON reviews(book_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_quotes_user_id ON quotes(user_id);
CREATE INDEX idx_quotes_book_id ON quotes(book_id);
CREATE INDEX idx_activities_user_id ON activities(user_id);
CREATE INDEX idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX idx_reading_sessions_user_id ON reading_sessions(user_id);
CREATE INDEX idx_reading_sessions_date ON reading_sessions(reading_date);
