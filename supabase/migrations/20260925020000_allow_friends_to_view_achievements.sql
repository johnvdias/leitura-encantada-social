-- A aba "Conquistas" no perfil de uma amiga sempre vinha vazia: a política
-- de SELECT em achievements só deixava a própria usuária ver suas
-- conquistas, sem exceção pra amigas - diferente de "books", que já tinha
-- essa exceção pra amigas com amizade aceita.
CREATE POLICY "Users can view their own achievements and friends achievements"
ON public.achievements
FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.friendships
    WHERE friendships.status = 'accepted'
      AND (
        (friendships.requester_id = auth.uid() AND friendships.addressee_id = achievements.user_id)
        OR (friendships.addressee_id = auth.uid() AND friendships.requester_id = achievements.user_id)
      )
  )
);

DROP POLICY "Users can view their own achievements" ON public.achievements;
