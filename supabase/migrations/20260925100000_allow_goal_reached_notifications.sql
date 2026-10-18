-- Permite notificar amigas quando a usuária bate a meta diária de leitura,
-- seguindo a mesma regra de "amizade aceita" já usada para 'nudge'/'message'.
ALTER POLICY "Users can create legitimate notifications" ON public.notifications
WITH CHECK (
  CASE type
    WHEN 'achievement' THEN ((select auth.uid()) = user_id)
    WHEN 'friend_request' THEN (EXISTS ( SELECT 1
       FROM friendships
      WHERE ((friendships.requester_id = (select auth.uid())) AND (friendships.addressee_id = notifications.user_id) AND (friendships.status = 'pending'::text))))
    WHEN 'friend_accepted' THEN (EXISTS ( SELECT 1
       FROM friendships
      WHERE ((friendships.status = 'accepted'::text) AND (((friendships.requester_id = (select auth.uid())) AND (friendships.addressee_id = notifications.user_id)) OR ((friendships.addressee_id = (select auth.uid())) AND (friendships.requester_id = notifications.user_id))))))
    WHEN 'nudge' THEN (EXISTS ( SELECT 1
       FROM friendships
      WHERE ((friendships.status = 'accepted'::text) AND (((friendships.requester_id = (select auth.uid())) AND (friendships.addressee_id = notifications.user_id)) OR ((friendships.addressee_id = (select auth.uid())) AND (friendships.requester_id = notifications.user_id))))))
    WHEN 'goal_reached' THEN (EXISTS ( SELECT 1
       FROM friendships
      WHERE ((friendships.status = 'accepted'::text) AND (((friendships.requester_id = (select auth.uid())) AND (friendships.addressee_id = notifications.user_id)) OR ((friendships.addressee_id = (select auth.uid())) AND (friendships.requester_id = notifications.user_id))))))
    WHEN 'message' THEN (EXISTS ( SELECT 1
       FROM friendships
      WHERE ((friendships.status = 'accepted'::text) AND (((friendships.requester_id = (select auth.uid())) AND (friendships.addressee_id = notifications.user_id)) OR ((friendships.addressee_id = (select auth.uid())) AND (friendships.requester_id = notifications.user_id))))))
    WHEN 'like' THEN (EXISTS ( SELECT 1
       FROM (posts p
         JOIN post_likes pl ON ((pl.post_id = p.id)))
      WHERE ((p.id = notifications.related_id) AND (p.user_id = notifications.user_id) AND (pl.user_id = (select auth.uid())))))
    WHEN 'comment' THEN (EXISTS ( SELECT 1
       FROM (posts p
         JOIN post_comments pc ON ((pc.post_id = p.id)))
      WHERE ((p.id = notifications.related_id) AND (p.user_id = notifications.user_id) AND (pc.user_id = (select auth.uid())))))
    WHEN 'mention' THEN (EXISTS ( SELECT 1
       FROM post_comments pc
      WHERE ((pc.post_id = notifications.related_id) AND (pc.user_id = (select auth.uid())))))
    ELSE false
  END
);
