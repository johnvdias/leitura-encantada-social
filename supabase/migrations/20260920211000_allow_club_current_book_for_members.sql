-- clubs.current_book_id aponta pra um livro pessoal (da estante de quem
-- definiu a leitura, geralmente a criadora). RLS de `books` só libera
-- dono/amiga aceita, então uma membro do clube que não é amiga de quem
-- definiu o livro não conseguia ver a "Leitura Atual" (a query .single()
-- voltava vazia) nem entrava no cálculo de "posts sobre a leitura atual"
-- do feed. Libera o livro atual pra criadora e membros aprovadas do clube.
create policy "Club current book is viewable by club members"
on public.books for select
using (
  exists (
    select 1 from public.clubs c
    where c.current_book_id = books.id
      and (
        c.creator_id = auth.uid()
        or exists (
          select 1 from public.club_members cm
          where cm.club_id = c.id and cm.user_id = auth.uid() and cm.status = 'approved'
        )
      )
  )
);
