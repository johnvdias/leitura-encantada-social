-- O linter de performance do Supabase apontou 80 políticas de RLS que
-- chamam auth.uid() de um jeito que o Postgres reavalia LINHA POR LINHA em
-- vez de uma vez só por consulta. Envolver a chamada em "(select ...)"
-- transforma isso num initplan avaliado uma única vez - mesmo resultado,
-- bem mais rápido em tabelas grandes. Não muda nenhuma regra de acesso,
-- só a forma como a expressão é escrita.
ALTER POLICY "Users can create their own achievements" ON public.achievements
WITH CHECK (
((select auth.uid()) = user_id)
);

ALTER POLICY "Users can view their own achievements and friends achievements" ON public.achievements
USING (
(((select auth.uid()) = user_id) OR (EXISTS ( SELECT 1
   FROM friendships
  WHERE ((friendships.status = 'accepted'::text) AND (((friendships.requester_id = (select auth.uid())) AND (friendships.addressee_id = achievements.user_id)) OR ((friendships.addressee_id = (select auth.uid())) AND (friendships.requester_id = achievements.user_id)))))))
);

ALTER POLICY "Users can delete their own quotes" ON public.book_quotes
USING (
((select auth.uid()) = user_id)
);

ALTER POLICY "Users can create their own quotes" ON public.book_quotes
WITH CHECK (
((select auth.uid()) = user_id)
);

ALTER POLICY "Users can view their own quotes" ON public.book_quotes
USING (
((select auth.uid()) = user_id)
);

ALTER POLICY "Users can update their own quotes" ON public.book_quotes
USING (
((select auth.uid()) = user_id)
);

ALTER POLICY "Users can delete their own books" ON public.books
USING (
((select auth.uid()) = user_id)
);

ALTER POLICY "Users can create their own books" ON public.books
WITH CHECK (
((select auth.uid()) = user_id)
);

ALTER POLICY "Club current book is viewable by club members" ON public.books
USING (
(EXISTS ( SELECT 1
   FROM clubs c
  WHERE ((c.current_book_id = books.id) AND ((c.creator_id = (select auth.uid())) OR (EXISTS ( SELECT 1
           FROM club_members cm
          WHERE ((cm.club_id = c.id) AND (cm.user_id = (select auth.uid())) AND (cm.status = 'approved'::text))))))))
);

ALTER POLICY "Users can view their own books and friends books" ON public.books
USING (
(((select auth.uid()) = user_id) OR (EXISTS ( SELECT 1
   FROM friendships
  WHERE ((friendships.status = 'accepted'::text) AND (((friendships.requester_id = (select auth.uid())) AND (friendships.addressee_id = books.user_id)) OR ((friendships.addressee_id = (select auth.uid())) AND (friendships.requester_id = books.user_id)))))))
);

ALTER POLICY "Users can update their own books" ON public.books
USING (
((select auth.uid()) = user_id)
);

ALTER POLICY "Users can remove their own participation" ON public.challenge_participants
USING (
((select auth.uid()) = user_id)
);

ALTER POLICY "Self or challenge creator can add participants" ON public.challenge_participants
WITH CHECK (
(((select auth.uid()) = user_id) OR (EXISTS ( SELECT 1
   FROM challenges ch
  WHERE ((ch.id = challenge_participants.challenge_id) AND (ch.creator_id = (select auth.uid()))))))
);

ALTER POLICY "Participants can view challenge rosters" ON public.challenge_participants
USING (
(((select auth.uid()) = user_id) OR is_challenge_creator(challenge_id, (select auth.uid())) OR is_challenge_participant(challenge_id, (select auth.uid())))
);

ALTER POLICY "Users can update their own participation" ON public.challenge_participants
USING (
((select auth.uid()) = user_id)
)
WITH CHECK (
((select auth.uid()) = user_id)
);

ALTER POLICY "Creator can delete their own challenges" ON public.challenges
USING (
((select auth.uid()) = creator_id)
);

ALTER POLICY "Allow users to create challenges" ON public.challenges
WITH CHECK (
((select auth.uid()) = creator_id)
);

ALTER POLICY "Creator or participants can view challenges" ON public.challenges
USING (
(((select auth.uid()) = creator_id) OR (EXISTS ( SELECT 1
   FROM challenge_participants cp
  WHERE ((cp.challenge_id = challenges.id) AND (cp.user_id = (select auth.uid()))))))
);

ALTER POLICY "Creator can update their own challenges" ON public.challenges
USING (
((select auth.uid()) = creator_id)
)
WITH CHECK (
((select auth.uid()) = creator_id)
);

ALTER POLICY "Poll creator can add options while open" ON public.club_book_poll_options
WITH CHECK (
(EXISTS ( SELECT 1
   FROM club_book_polls p
  WHERE ((p.id = club_book_poll_options.poll_id) AND (p.created_by = (select auth.uid())) AND (p.status = 'open'::text))))
);

ALTER POLICY "Club members can view poll options" ON public.club_book_poll_options
USING (
(EXISTS ( SELECT 1
   FROM club_book_polls p
  WHERE ((p.id = club_book_poll_options.poll_id) AND ((EXISTS ( SELECT 1
           FROM clubs c
          WHERE ((c.id = p.club_id) AND (c.creator_id = (select auth.uid()))))) OR (EXISTS ( SELECT 1
           FROM club_members cm
          WHERE ((cm.club_id = p.club_id) AND (cm.user_id = (select auth.uid())) AND (cm.status = 'approved'::text))))))))
);

ALTER POLICY "Club creator can create polls" ON public.club_book_polls
WITH CHECK (
(((select auth.uid()) = created_by) AND (EXISTS ( SELECT 1
   FROM clubs c
  WHERE ((c.id = club_book_polls.club_id) AND (c.creator_id = (select auth.uid()))))))
);

ALTER POLICY "Club members can view polls" ON public.club_book_polls
USING (
((EXISTS ( SELECT 1
   FROM clubs c
  WHERE ((c.id = club_book_polls.club_id) AND (c.creator_id = (select auth.uid()))))) OR (EXISTS ( SELECT 1
   FROM club_members cm
  WHERE ((cm.club_id = club_book_polls.club_id) AND (cm.user_id = (select auth.uid())) AND (cm.status = 'approved'::text)))))
);

ALTER POLICY "Club creator can update polls" ON public.club_book_polls
USING (
(EXISTS ( SELECT 1
   FROM clubs c
  WHERE ((c.id = club_book_polls.club_id) AND (c.creator_id = (select auth.uid())))))
)
WITH CHECK (
(EXISTS ( SELECT 1
   FROM clubs c
  WHERE ((c.id = club_book_polls.club_id) AND (c.creator_id = (select auth.uid())))))
);

ALTER POLICY "Users can delete their discussions" ON public.club_discussions
USING (
((select auth.uid()) = user_id)
);

ALTER POLICY "Club members can create discussions" ON public.club_discussions
WITH CHECK (
(((select auth.uid()) = user_id) AND (EXISTS ( SELECT 1
   FROM club_members
  WHERE ((club_members.club_id = club_discussions.club_id) AND (club_members.user_id = (select auth.uid())) AND (club_members.status = 'approved'::text)))))
);

ALTER POLICY "Club members can view discussions" ON public.club_discussions
USING (
(EXISTS ( SELECT 1
   FROM club_members
  WHERE ((club_members.club_id = club_discussions.club_id) AND (club_members.user_id = (select auth.uid())) AND (club_members.status = 'approved'::text))))
);

ALTER POLICY "Users can update their discussions" ON public.club_discussions
USING (
((select auth.uid()) = user_id)
);

ALTER POLICY "Allow members to leave or creators to remove" ON public.club_members
USING (
(((select auth.uid()) = user_id) OR (EXISTS ( SELECT 1
   FROM clubs
  WHERE ((clubs.id = club_members.club_id) AND (clubs.creator_id = (select auth.uid()))))))
);

ALTER POLICY "Allow users to add themselves to clubs" ON public.club_members
WITH CHECK (
(((select auth.uid()) = user_id) AND (status = 'pending'::text))
);

ALTER POLICY "Club creator can add members directly" ON public.club_members
WITH CHECK (
(EXISTS ( SELECT 1
   FROM clubs c
  WHERE ((c.id = club_members.club_id) AND (c.creator_id = (select auth.uid())))))
);

ALTER POLICY "Members can view their club roster" ON public.club_members
USING (
(((select auth.uid()) = user_id) OR is_club_creator(club_id, (select auth.uid())) OR ((status = 'approved'::text) AND is_approved_club_member(club_id, (select auth.uid()))))
);

ALTER POLICY "Allow club creator to update member status" ON public.club_members
USING (
(EXISTS ( SELECT 1
   FROM clubs
  WHERE ((clubs.id = club_members.club_id) AND (clubs.creator_id = (select auth.uid())))))
);

ALTER POLICY "Club creator can delete schedules" ON public.club_reading_schedules
USING (
((select auth.uid()) = creator_id)
);

ALTER POLICY "Club creator can create schedules" ON public.club_reading_schedules
WITH CHECK (
(((select auth.uid()) = creator_id) AND (EXISTS ( SELECT 1
   FROM clubs c
  WHERE ((c.id = club_reading_schedules.club_id) AND (c.creator_id = (select auth.uid()))))))
);

ALTER POLICY "Club members can view club schedules" ON public.club_reading_schedules
USING (
(EXISTS ( SELECT 1
   FROM club_members cm
  WHERE ((cm.club_id = club_reading_schedules.club_id) AND (cm.user_id = (select auth.uid())) AND (cm.status = 'approved'::text))))
);

ALTER POLICY "Schedule creator can enroll club members" ON public.club_schedule_participants
WITH CHECK (
(EXISTS ( SELECT 1
   FROM club_reading_schedules crs
  WHERE ((crs.id = club_schedule_participants.club_schedule_id) AND (crs.creator_id = (select auth.uid())))))
);

ALTER POLICY "Club members can view schedule rosters" ON public.club_schedule_participants
USING (
((EXISTS ( SELECT 1
   FROM (club_reading_schedules crs
     JOIN club_members cm ON ((cm.club_id = crs.club_id)))
  WHERE ((crs.id = club_schedule_participants.club_schedule_id) AND (cm.user_id = (select auth.uid())) AND (cm.status = 'approved'::text)))) OR (EXISTS ( SELECT 1
   FROM (club_reading_schedules crs
     JOIN clubs c ON ((c.id = crs.club_id)))
  WHERE ((crs.id = club_schedule_participants.club_schedule_id) AND (c.creator_id = (select auth.uid()))))))
);

ALTER POLICY "Allow delete for creators" ON public.clubs
USING (
((select auth.uid()) = creator_id)
);

ALTER POLICY "Users can create clubs" ON public.clubs
WITH CHECK (
((select auth.uid()) = creator_id)
);

ALTER POLICY "Allow view for public, members, and creator" ON public.clubs
USING (
((is_private = false) OR (creator_id = (select auth.uid())) OR (EXISTS ( SELECT 1
   FROM club_members
  WHERE ((club_members.club_id = clubs.id) AND (club_members.user_id = (select auth.uid()))))))
);

ALTER POLICY "Allow update for creators" ON public.clubs
USING (
((select auth.uid()) = creator_id)
)
WITH CHECK (
((select auth.uid()) = creator_id)
);

ALTER POLICY "Sender can delete their own messages" ON public.direct_messages
USING (
((select auth.uid()) = sender_id)
);

ALTER POLICY "Friends can send direct messages" ON public.direct_messages
WITH CHECK (
(((select auth.uid()) = sender_id) AND (EXISTS ( SELECT 1
   FROM friendships f
  WHERE ((f.status = 'accepted'::text) AND (((f.requester_id = (select auth.uid())) AND (f.addressee_id = direct_messages.recipient_id)) OR ((f.addressee_id = (select auth.uid())) AND (f.requester_id = direct_messages.recipient_id)))))))
);

ALTER POLICY "Users can view their own conversations" ON public.direct_messages
USING (
(((select auth.uid()) = sender_id) OR ((select auth.uid()) = recipient_id))
);

ALTER POLICY "Recipient can mark messages as read" ON public.direct_messages
USING (
((select auth.uid()) = recipient_id)
)
WITH CHECK (
((select auth.uid()) = recipient_id)
);

ALTER POLICY "Users can delete their friendships" ON public.friendships
USING (
((requester_id = (select auth.uid())) OR (addressee_id = (select auth.uid())))
);

ALTER POLICY "Users can create friendship requests" ON public.friendships
WITH CHECK (
((select auth.uid()) = requester_id)
);

ALTER POLICY "Users can view their friendships" ON public.friendships
USING (
((requester_id = (select auth.uid())) OR (addressee_id = (select auth.uid())))
);

ALTER POLICY "Users can update friendship status" ON public.friendships
USING (
((requester_id = (select auth.uid())) OR (addressee_id = (select auth.uid())))
);

ALTER POLICY "Allow users to create friend schedules" ON public.group_reading_schedules
WITH CHECK (
((select auth.uid()) = creator_id)
);

ALTER POLICY "Creator or invited friends can view schedule" ON public.group_reading_schedules
USING (
(((select auth.uid()) = creator_id) OR (EXISTS ( SELECT 1
   FROM schedule_participants sp
  WHERE ((sp.schedule_id = group_reading_schedules.id) AND (sp.user_id = (select auth.uid()))))))
);

ALTER POLICY "Users can create legitimate notifications" ON public.notifications
WITH CHECK (

CASE type
    WHEN 'achievement'::text THEN ((select auth.uid()) = user_id)
    WHEN 'friend_request'::text THEN (EXISTS ( SELECT 1
       FROM friendships
      WHERE ((friendships.requester_id = (select auth.uid())) AND (friendships.addressee_id = notifications.user_id) AND (friendships.status = 'pending'::text))))
    WHEN 'friend_accepted'::text THEN (EXISTS ( SELECT 1
       FROM friendships
      WHERE ((friendships.status = 'accepted'::text) AND (((friendships.requester_id = (select auth.uid())) AND (friendships.addressee_id = notifications.user_id)) OR ((friendships.addressee_id = (select auth.uid())) AND (friendships.requester_id = notifications.user_id))))))
    WHEN 'nudge'::text THEN (EXISTS ( SELECT 1
       FROM friendships
      WHERE ((friendships.status = 'accepted'::text) AND (((friendships.requester_id = (select auth.uid())) AND (friendships.addressee_id = notifications.user_id)) OR ((friendships.addressee_id = (select auth.uid())) AND (friendships.requester_id = notifications.user_id))))))
    WHEN 'message'::text THEN (EXISTS ( SELECT 1
       FROM friendships
      WHERE ((friendships.status = 'accepted'::text) AND (((friendships.requester_id = (select auth.uid())) AND (friendships.addressee_id = notifications.user_id)) OR ((friendships.addressee_id = (select auth.uid())) AND (friendships.requester_id = notifications.user_id))))))
    WHEN 'like'::text THEN (EXISTS ( SELECT 1
       FROM (posts p
         JOIN post_likes pl ON ((pl.post_id = p.id)))
      WHERE ((p.id = notifications.related_id) AND (p.user_id = notifications.user_id) AND (pl.user_id = (select auth.uid())))))
    WHEN 'comment'::text THEN (EXISTS ( SELECT 1
       FROM (posts p
         JOIN post_comments pc ON ((pc.post_id = p.id)))
      WHERE ((p.id = notifications.related_id) AND (p.user_id = notifications.user_id) AND (pc.user_id = (select auth.uid())))))
    WHEN 'mention'::text THEN (EXISTS ( SELECT 1
       FROM post_comments pc
      WHERE ((pc.post_id = notifications.related_id) AND (pc.user_id = (select auth.uid())))))
    ELSE false
END
);

ALTER POLICY "Users can view their own notifications" ON public.notifications
USING (
((select auth.uid()) = user_id)
);

ALTER POLICY "Users can update their own notifications" ON public.notifications
USING (
((select auth.uid()) = user_id)
);

ALTER POLICY "Allow users to send nudges" ON public.nudges
WITH CHECK (
((select auth.uid()) = sender_id)
);

ALTER POLICY "Allow users to view nudges sent to them" ON public.nudges
USING (
((select auth.uid()) = receiver_id)
);

ALTER POLICY "Users can delete their own comments" ON public.post_comments
USING (
((select auth.uid()) = user_id)
);

ALTER POLICY "Users can create comments" ON public.post_comments
WITH CHECK (
((select auth.uid()) = user_id)
);

ALTER POLICY "Users can view comments on visible posts" ON public.post_comments
USING (
(EXISTS ( SELECT 1
   FROM posts
  WHERE ((posts.id = post_comments.post_id) AND ((posts.visibility = 'public'::text) OR (posts.user_id = (select auth.uid())) OR ((posts.visibility = 'friends'::text) AND (EXISTS ( SELECT 1
           FROM friendships
          WHERE (((friendships.requester_id = (select auth.uid())) AND (friendships.addressee_id = posts.user_id) AND (friendships.status = 'accepted'::text)) OR ((friendships.addressee_id = (select auth.uid())) AND (friendships.requester_id = posts.user_id) AND (friendships.status = 'accepted'::text))))))))))
);

ALTER POLICY "Users can update their own comments" ON public.post_comments
USING (
((select auth.uid()) = user_id)
);

ALTER POLICY "Users can delete their own likes" ON public.post_likes
USING (
((select auth.uid()) = user_id)
);

ALTER POLICY "Users can create their own likes" ON public.post_likes
WITH CHECK (
((select auth.uid()) = user_id)
);

ALTER POLICY "Users can view likes on visible posts" ON public.post_likes
USING (
(EXISTS ( SELECT 1
   FROM posts
  WHERE ((posts.id = post_likes.post_id) AND ((posts.visibility = 'public'::text) OR (posts.user_id = (select auth.uid())) OR ((posts.visibility = 'friends'::text) AND (EXISTS ( SELECT 1
           FROM friendships
          WHERE ((friendships.status = 'accepted'::text) AND (((friendships.requester_id = (select auth.uid())) AND (friendships.addressee_id = posts.user_id)) OR ((friendships.addressee_id = (select auth.uid())) AND (friendships.requester_id = posts.user_id)))))))))))
);

ALTER POLICY "Users can delete their own posts" ON public.posts
USING (
((select auth.uid()) = user_id)
);

ALTER POLICY "Users can create their own posts" ON public.posts
WITH CHECK (
((select auth.uid()) = user_id)
);

ALTER POLICY "Users can view public posts and friends posts" ON public.posts
USING (
((visibility = 'public'::text) OR (user_id = (select auth.uid())) OR ((visibility = 'friends'::text) AND (EXISTS ( SELECT 1
   FROM friendships
  WHERE (((friendships.requester_id = (select auth.uid())) AND (friendships.addressee_id = posts.user_id) AND (friendships.status = 'accepted'::text)) OR ((friendships.addressee_id = (select auth.uid())) AND (friendships.requester_id = posts.user_id) AND (friendships.status = 'accepted'::text)))))))
);

ALTER POLICY "Users can update their own posts" ON public.posts
USING (
((select auth.uid()) = user_id)
);

ALTER POLICY "Users can insert their own profile" ON public.profiles
WITH CHECK (
((select auth.uid()) = user_id)
);

ALTER POLICY "Users can update their own profile" ON public.profiles
USING (
((select auth.uid()) = user_id)
);

ALTER POLICY "Allow users to delete their own subscriptions" ON public.push_subscriptions
USING (
((select auth.uid()) = user_id)
);

ALTER POLICY "Allow users to insert their own subscriptions" ON public.push_subscriptions
WITH CHECK (
((select auth.uid()) = user_id)
);

ALTER POLICY "Allow users to read their own subscriptions" ON public.push_subscriptions
USING (
((select auth.uid()) = user_id)
);

ALTER POLICY "Users can delete their own reading history" ON public.reading_history
USING (
((select auth.uid()) = user_id)
);

ALTER POLICY "Users can create their own reading history" ON public.reading_history
WITH CHECK (
((select auth.uid()) = user_id)
);

ALTER POLICY "Users can view their own reading history" ON public.reading_history
USING (
((select auth.uid()) = user_id)
);

ALTER POLICY "Users can update their own reading history" ON public.reading_history
USING (
((select auth.uid()) = user_id)
);

ALTER POLICY "Self or schedule creator can add participants" ON public.schedule_participants
WITH CHECK (
(((select auth.uid()) = user_id) OR (EXISTS ( SELECT 1
   FROM group_reading_schedules grs
  WHERE ((grs.id = schedule_participants.schedule_id) AND (grs.creator_id = (select auth.uid()))))))
);

ALTER POLICY "Participants can view schedule rosters" ON public.schedule_participants
USING (
(((select auth.uid()) = user_id) OR is_schedule_creator(schedule_id, (select auth.uid())) OR is_schedule_participant(schedule_id, (select auth.uid())))
);

ALTER POLICY "Users can update their own invitation status" ON public.schedule_participants
USING (
((select auth.uid()) = user_id)
)
WITH CHECK (
((select auth.uid()) = user_id)
);

ALTER POLICY "Allow authenticated users to update own avatar" ON storage.objects
USING (
((select auth.uid()) = ((storage.foldername(name))[1])::uuid)
)
WITH CHECK (
((bucket_id = 'avatars'::text) AND ((select auth.uid()) = ((storage.foldername(name))[1])::uuid))
);

ALTER POLICY "Allow authenticated users to upload own avatar" ON storage.objects
WITH CHECK (
((bucket_id = 'avatars'::text) AND ((select auth.uid()) = ((storage.foldername(name))[1])::uuid))
);

ALTER POLICY "Club creator can delete club avatar" ON storage.objects
USING (
((bucket_id = 'club-avatars'::text) AND (EXISTS ( SELECT 1
   FROM clubs
  WHERE (((clubs.id)::text = (storage.foldername(objects.name))[1]) AND (clubs.creator_id = (select auth.uid()))))))
);

ALTER POLICY "Club creator can update club avatar" ON storage.objects
USING (
((bucket_id = 'club-avatars'::text) AND (EXISTS ( SELECT 1
   FROM clubs
  WHERE (((clubs.id)::text = (storage.foldername(objects.name))[1]) AND (clubs.creator_id = (select auth.uid()))))))
)
WITH CHECK (
((bucket_id = 'club-avatars'::text) AND (EXISTS ( SELECT 1
   FROM clubs
  WHERE (((clubs.id)::text = (storage.foldername(objects.name))[1]) AND (clubs.creator_id = (select auth.uid()))))))
);

ALTER POLICY "Club creator can upload club avatar" ON storage.objects
WITH CHECK (
((bucket_id = 'club-avatars'::text) AND (EXISTS ( SELECT 1
   FROM clubs
  WHERE (((clubs.id)::text = (storage.foldername(objects.name))[1]) AND (clubs.creator_id = (select auth.uid()))))))
);

ALTER POLICY "Users can delete their own avatar" ON storage.objects
USING (
((bucket_id = 'avatars'::text) AND (((select auth.uid()))::text = (storage.foldername(name))[1]))
);

ALTER POLICY "Users can update their own avatar" ON storage.objects
USING (
((bucket_id = 'avatars'::text) AND (((select auth.uid()))::text = (storage.foldername(name))[1]))
);

ALTER POLICY "Users can upload their own avatar" ON storage.objects
WITH CHECK (
((bucket_id = 'avatars'::text) AND (((select auth.uid()))::text = (storage.foldername(name))[1]))
);
