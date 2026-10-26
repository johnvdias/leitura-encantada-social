-- Autoriza a notificar toda atividade do clube (post marcado pro clube,
-- discussão/anúncio, sorteio/votação criado ou resolvido, cronograma
-- iniciado) pras integrantes aprovadas (ou a criadora, que nem sempre tem
-- linha própria em club_members - ver RLS de club_book_polls). Mesma
-- estrutura das outras branches desse CASE.
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
    WHEN 'comment_like' THEN (EXISTS ( SELECT 1
       FROM (post_comments pc
         JOIN comment_likes cl ON (cl.comment_id = pc.id))
      WHERE ((pc.post_id = notifications.related_id) AND (pc.user_id = notifications.user_id) AND (cl.user_id = (select auth.uid())))))
    WHEN 'mention' THEN (EXISTS ( SELECT 1
       FROM post_comments pc
      WHERE ((pc.post_id = notifications.related_id) AND (pc.user_id = (select auth.uid())))))
    WHEN 'club_post' THEN (EXISTS ( SELECT 1
       FROM (posts p
         JOIN clubs c ON (c.id = p.club_id))
      WHERE (p.id = notifications.related_id)
        AND (p.user_id = (select auth.uid()))
        AND (
          c.creator_id = notifications.user_id
          OR EXISTS ( SELECT 1 FROM club_members cm
            WHERE (cm.club_id = c.id) AND (cm.user_id = notifications.user_id) AND (cm.status = 'approved'::text))
        )))
    WHEN 'club_discussion' THEN (EXISTS ( SELECT 1
       FROM (club_discussions d
         JOIN clubs c ON (c.id = d.club_id))
      WHERE (d.club_id = notifications.related_id)
        AND (d.user_id = (select auth.uid()))
        AND (
          c.creator_id = notifications.user_id
          OR EXISTS ( SELECT 1 FROM club_members cm
            WHERE (cm.club_id = c.id) AND (cm.user_id = notifications.user_id) AND (cm.status = 'approved'::text))
        )))
    WHEN 'club_poll' THEN (EXISTS ( SELECT 1
       FROM clubs c
      WHERE (c.id = notifications.related_id)
        AND (c.creator_id = (select auth.uid()))
        AND (
          c.creator_id = notifications.user_id
          OR EXISTS ( SELECT 1 FROM club_members cm
            WHERE (cm.club_id = c.id) AND (cm.user_id = notifications.user_id) AND (cm.status = 'approved'::text))
        )))
    WHEN 'club_schedule' THEN (EXISTS ( SELECT 1
       FROM clubs c
      WHERE (c.id = notifications.related_id)
        AND (c.creator_id = (select auth.uid()))
        AND (
          c.creator_id = notifications.user_id
          OR EXISTS ( SELECT 1 FROM club_members cm
            WHERE (cm.club_id = c.id) AND (cm.user_id = notifications.user_id) AND (cm.status = 'approved'::text))
        )))
    ELSE false
  END
);
