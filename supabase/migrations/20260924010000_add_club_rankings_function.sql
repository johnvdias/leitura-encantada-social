-- Ranking do clube (maiores leitoras, autoras mais lidas, gêneros e livros
-- mais favoritados). A tabela `books` é privada por padrão (só dono, amigos
-- ou o livro atual do clube são visíveis via RLS), então pra agregar dados
-- de TODAS as integrantes aprovadas do clube sem abrir a tabela inteira,
-- usamos uma função SECURITY DEFINER que só devolve agregados (nunca
-- personal_notes, tags ou outros campos privados) e só pra quem já é
-- integrante aprovada (ou criadora) do clube em questão.
create or replace function public.get_club_rankings(p_club_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path to 'public', 'pg_temp'
as $$
declare
  result jsonb;
begin
  if not (
    public.is_approved_club_member(p_club_id, auth.uid())
    or public.is_club_creator(p_club_id, auth.uid())
  ) then
    raise exception 'not authorized';
  end if;

  with member_ids as (
    select user_id from public.club_members
    where club_id = p_club_id and status = 'approved'
  ),
  completed_books as (
    select b.user_id, b.title, b.author, b.genre, b.pages, b.rating, b.cover_url
    from public.books b
    join member_ids m on m.user_id = b.user_id
    where b.reading_status = 'completed'
  ),
  reader_stats as (
    select cb.user_id, count(*) as completed_count, coalesce(sum(cb.pages), 0) as total_pages
    from completed_books cb
    group by cb.user_id
    order by completed_count desc, total_pages desc
    limit 5
  ),
  top_readers as (
    select jsonb_agg(jsonb_build_object(
      'user_id', rs.user_id,
      'display_name', p.display_name,
      'avatar_url', p.avatar_url,
      'completed_count', rs.completed_count,
      'total_pages', rs.total_pages
    ) order by rs.completed_count desc) as data
    from reader_stats rs
    join public.profiles p on p.user_id = rs.user_id
  ),
  author_stats as (
    select author, count(*) as cnt
    from completed_books
    where author is not null and author <> ''
    group by author
    order by cnt desc
    limit 5
  ),
  top_authors as (
    select jsonb_agg(jsonb_build_object('author', author, 'count', cnt) order by cnt desc) as data
    from author_stats
  ),
  genre_stats as (
    select genre, count(*) as cnt
    from completed_books
    where genre is not null and genre <> ''
    group by genre
    order by cnt desc
    limit 5
  ),
  top_genres as (
    select jsonb_agg(jsonb_build_object('genre', genre, 'count', cnt) order by cnt desc) as data
    from genre_stats
  ),
  book_groups as (
    select
      lower(trim(title)) || '|' || lower(trim(coalesce(author, ''))) as book_key,
      (array_agg(title order by (cover_url is not null) desc))[1] as title,
      (array_agg(author order by (cover_url is not null) desc))[1] as author,
      (array_agg(cover_url order by (cover_url is not null) desc))[1] as cover_url,
      count(*) filter (where rating >= 4) as lovers_count,
      avg(rating) as avg_rating
    from completed_books
    where rating is not null
    group by 1
    having count(*) filter (where rating >= 4) > 0
    order by lovers_count desc, avg_rating desc
    limit 5
  ),
  top_books as (
    select jsonb_agg(jsonb_build_object(
      'title', title,
      'author', author,
      'cover_url', cover_url,
      'lovers_count', lovers_count,
      'avg_rating', round(avg_rating::numeric, 1)
    ) order by lovers_count desc) as data
    from book_groups
  ),
  totals as (
    select
      count(*) as total_books,
      coalesce(sum(pages), 0) as total_pages,
      (select count(*) from member_ids) as member_count
    from completed_books
  )
  select jsonb_build_object(
    'top_readers', coalesce((select data from top_readers), '[]'::jsonb),
    'top_authors', coalesce((select data from top_authors), '[]'::jsonb),
    'top_genres', coalesce((select data from top_genres), '[]'::jsonb),
    'top_books', coalesce((select data from top_books), '[]'::jsonb),
    'total_books', (select total_books from totals),
    'total_pages', (select total_pages from totals),
    'member_count', (select member_count from totals)
  ) into result;

  return result;
end;
$$;

revoke execute on function public.get_club_rankings(uuid) from public, anon;
grant execute on function public.get_club_rankings(uuid) to authenticated;
