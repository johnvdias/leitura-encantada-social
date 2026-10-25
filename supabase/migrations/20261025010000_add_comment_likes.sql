CREATE TABLE public.comment_likes (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.post_comments(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint comment_likes_unique unique (comment_id, user_id)
);

CREATE INDEX comment_likes_comment_id_idx ON public.comment_likes (comment_id);
CREATE INDEX comment_likes_user_id_idx ON public.comment_likes (user_id);

ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own comment likes"
ON public.comment_likes FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own comment likes"
ON public.comment_likes FOR DELETE
USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view comment likes on visible posts"
ON public.comment_likes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM post_comments pc
    JOIN posts p ON p.id = pc.post_id
    WHERE pc.id = comment_likes.comment_id
      AND (
        p.visibility = 'public'
        OR p.user_id = (select auth.uid())
        OR (p.visibility = 'friends' AND EXISTS (
          SELECT 1 FROM friendships
          WHERE status = 'accepted'
            AND ((requester_id = (select auth.uid()) AND addressee_id = p.user_id)
              OR (addressee_id = (select auth.uid()) AND requester_id = p.user_id))
        ))
      )
  )
);

-- Permite notificar quando um comentário é curtido, mesma estrutura das
-- outras branches desse CASE (ver 'like').
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
    ELSE false
  END
);
