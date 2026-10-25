-- Além do sorteio (modo atual), permite que a criadora escolha votação:
-- cada membra aprovada vota em uma opção, e quem fecha a votação escolhe o
-- livro com mais votos (empate decidido aleatoriamente, igual o sorteio).
ALTER TABLE public.club_book_polls
  ADD COLUMN mode text NOT NULL DEFAULT 'draw' CHECK (mode IN ('draw', 'vote'));

CREATE TABLE public.club_book_poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.club_book_polls(id) on delete cascade,
  option_id uuid not null references public.club_book_poll_options(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint club_book_poll_votes_one_per_user unique (poll_id, user_id)
);

CREATE INDEX club_book_poll_votes_poll_id_idx ON public.club_book_poll_votes (poll_id);
CREATE INDEX club_book_poll_votes_option_id_idx ON public.club_book_poll_votes (option_id);

ALTER TABLE public.club_book_poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Club members can view votes"
ON public.club_book_poll_votes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM club_book_polls p
    JOIN clubs c ON c.id = p.club_id
    WHERE p.id = club_book_poll_votes.poll_id
      AND (
        c.creator_id = (select auth.uid())
        OR EXISTS (
          SELECT 1 FROM club_members cm
          WHERE cm.club_id = p.club_id AND cm.user_id = (select auth.uid()) AND cm.status = 'approved'
        )
      )
  )
);

CREATE POLICY "Approved members can vote while poll is open"
ON public.club_book_poll_votes FOR INSERT
WITH CHECK (
  (select auth.uid()) = user_id
  AND EXISTS (
    SELECT 1 FROM club_book_polls p
    JOIN clubs c ON c.id = p.club_id
    WHERE p.id = club_book_poll_votes.poll_id
      AND p.status = 'open'
      AND p.mode = 'vote'
      AND (
        c.creator_id = (select auth.uid())
        OR EXISTS (
          SELECT 1 FROM club_members cm
          WHERE cm.club_id = p.club_id AND cm.user_id = (select auth.uid()) AND cm.status = 'approved'
        )
      )
  )
);

CREATE POLICY "Users can change their own vote while poll is open"
ON public.club_book_poll_votes FOR UPDATE
USING ((select auth.uid()) = user_id)
WITH CHECK (
  (select auth.uid()) = user_id
  AND EXISTS (SELECT 1 FROM club_book_polls p WHERE p.id = club_book_poll_votes.poll_id AND p.status = 'open')
);

CREATE POLICY "Users can retract their own vote while poll is open"
ON public.club_book_poll_votes FOR DELETE
USING (
  (select auth.uid()) = user_id
  AND EXISTS (SELECT 1 FROM club_book_polls p WHERE p.id = club_book_poll_votes.poll_id AND p.status = 'open')
);
