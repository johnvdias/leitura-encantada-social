-- O linter de performance apontou tabelas com mais de uma política
-- permissiva pra mesma ação/papel - o Postgres avalia TODAS e junta com
-- OR, então ter 3 políticas de SELECT em vez de 1 com os 3 critérios
-- unidos por OR custa 3 avaliações por linha em vez de 1. Consolida sem
-- mudar quem enxerga o quê.

-- books: SELECT (própria estante OU amigas OU livro atual de clube OU
-- referenciado em post público)
DROP POLICY IF EXISTS "Books referenced in public posts are viewable by everyone" ON public.books;
DROP POLICY IF EXISTS "Club current book is viewable by club members" ON public.books;
DROP POLICY IF EXISTS "Users can view their own books and friends books" ON public.books;

CREATE POLICY "Books are viewable by owner, friends, club, or public posts"
ON public.books
FOR SELECT
USING (
  ((select auth.uid()) = user_id)
  OR (EXISTS (
    SELECT 1 FROM friendships
    WHERE friendships.status = 'accepted'
      AND (
        (friendships.requester_id = (select auth.uid()) AND friendships.addressee_id = books.user_id)
        OR (friendships.addressee_id = (select auth.uid()) AND friendships.requester_id = books.user_id)
      )
  ))
  OR (EXISTS (
    SELECT 1 FROM clubs c
    WHERE c.current_book_id = books.id
      AND (
        c.creator_id = (select auth.uid())
        OR EXISTS (
          SELECT 1 FROM club_members cm
          WHERE cm.club_id = c.id AND cm.user_id = (select auth.uid()) AND cm.status = 'approved'
        )
      )
  ))
  OR (EXISTS (
    SELECT 1 FROM posts
    WHERE posts.book_id = books.id AND posts.visibility = 'public'
  ))
);

-- club_members: INSERT (a própria pessoa entrando como pendente OU a
-- criadora do clube adicionando alguém diretamente)
DROP POLICY IF EXISTS "Allow users to add themselves to clubs" ON public.club_members;
DROP POLICY IF EXISTS "Club creator can add members directly" ON public.club_members;

CREATE POLICY "Users can join as pending or club creator adds directly"
ON public.club_members
FOR INSERT
WITH CHECK (
  ((select auth.uid()) = user_id AND status = 'pending')
  OR (EXISTS (
    SELECT 1 FROM clubs c
    WHERE c.id = club_members.club_id AND c.creator_id = (select auth.uid())
  ))
);

-- club_members: SELECT (o próprio registro, a criadora vendo tudo,
-- membros aprovados vendo outros membros aprovados, ou o roster de um
-- clube público)
DROP POLICY IF EXISTS "Approved members of public clubs are visible to everyone" ON public.club_members;
DROP POLICY IF EXISTS "Members can view their club roster" ON public.club_members;

CREATE POLICY "Club roster visible to self, creator, members, or public club"
ON public.club_members
FOR SELECT
USING (
  ((select auth.uid()) = user_id)
  OR is_club_creator(club_id, (select auth.uid()))
  OR (status = 'approved' AND is_approved_club_member(club_id, (select auth.uid())))
  OR (status = 'approved' AND is_club_public(club_id))
);
