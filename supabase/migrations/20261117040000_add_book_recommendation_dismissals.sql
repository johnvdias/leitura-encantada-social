-- Permite dispensar uma recomendação de amigas ("não me interessa") sem
-- adicionar o livro à estante - sem isso ela voltaria a aparecer pra sempre,
-- já que FriendRecommendations recalcula a lista na hora a partir dos livros
-- das amigas, sem guardar estado nenhum.
CREATE TABLE public.book_recommendation_dismissals (
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  book_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, book_key)
);

ALTER TABLE public.book_recommendation_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own dismissals"
ON public.book_recommendation_dismissals
FOR SELECT
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can create their own dismissals"
ON public.book_recommendation_dismissals
FOR INSERT
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own dismissals"
ON public.book_recommendation_dismissals
FOR DELETE
USING ((SELECT auth.uid()) = user_id);
