-- Um post público podia ser visto por qualquer pessoa (RLS de `posts` já
-- permite isso), mas o livro referenciado nele só aparecia pra quem já era
-- amiga aceita da autora do post (RLS de `books` restrita a dono/amigas).
-- Isso fazia o join `books(title, author)` do feed voltar nulo pra
-- estranhas, escondendo justamente a informação de qual livro foi
-- compartilhado. Libera título/autora de um livro quando ele está
-- referenciado em pelo menos um post público - não expõe nada além disso.
create policy "Books referenced in public posts are viewable by everyone"
on public.books for select
using (
  exists (
    select 1 from public.posts
    where posts.book_id = books.id
      and posts.visibility = 'public'
  )
);
