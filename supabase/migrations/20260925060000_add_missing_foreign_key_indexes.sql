-- O linter de performance do Supabase apontou 23 chaves estrangeiras sem
-- índice cobrindo elas - toda consulta que filtra por essas colunas (ex:
-- "buscar clubes que eu criei", "buscar minhas conquistas") faz uma
-- varredura completa da tabela em vez de usar um índice, o que fica cada
-- vez mais lento conforme a base cresce.
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON public.achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_book_search_log_user_id ON public.book_search_log(user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_user_id ON public.challenge_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_challenges_book_id ON public.challenges(book_id);
CREATE INDEX IF NOT EXISTS idx_challenges_creator_id ON public.challenges(creator_id);
CREATE INDEX IF NOT EXISTS idx_club_book_polls_claimed_by_current_book_id ON public.club_book_polls(claimed_by_current_book_id);
CREATE INDEX IF NOT EXISTS idx_club_book_polls_created_by ON public.club_book_polls(created_by);
CREATE INDEX IF NOT EXISTS idx_club_book_polls_winning_option_id ON public.club_book_polls(winning_option_id);
CREATE INDEX IF NOT EXISTS idx_club_discussions_club_id ON public.club_discussions(club_id);
CREATE INDEX IF NOT EXISTS idx_club_discussions_user_id ON public.club_discussions(user_id);
CREATE INDEX IF NOT EXISTS idx_club_reading_schedules_book_id ON public.club_reading_schedules(book_id);
CREATE INDEX IF NOT EXISTS idx_club_reading_schedules_club_id ON public.club_reading_schedules(club_id);
CREATE INDEX IF NOT EXISTS idx_club_reading_schedules_creator_id ON public.club_reading_schedules(creator_id);
CREATE INDEX IF NOT EXISTS idx_club_schedule_participants_user_id ON public.club_schedule_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_clubs_creator_id ON public.clubs(creator_id);
CREATE INDEX IF NOT EXISTS idx_clubs_current_book_id ON public.clubs(current_book_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee_id ON public.friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_group_reading_schedules_book_id ON public.group_reading_schedules(book_id);
CREATE INDEX IF NOT EXISTS idx_group_reading_schedules_creator_id ON public.group_reading_schedules(creator_id);
CREATE INDEX IF NOT EXISTS idx_nudges_receiver_id ON public.nudges(receiver_id);
CREATE INDEX IF NOT EXISTS idx_nudges_sender_id ON public.nudges(sender_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON public.post_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_schedule_participants_user_id ON public.schedule_participants(user_id);
