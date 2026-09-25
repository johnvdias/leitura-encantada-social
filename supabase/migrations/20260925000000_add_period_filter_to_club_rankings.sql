-- Adiciona filtro de período (opcional) ao ranking do clube, permitindo
-- restringir os cálculos a um mês ou ano específico em vez de sempre
-- considerar todo o histórico. Sem os parâmetros, o comportamento
-- continua idêntico ao de antes (todo o período).
DROP FUNCTION IF EXISTS public.get_club_rankings(uuid);

CREATE OR REPLACE FUNCTION public.get_club_rankings(
  p_club_id uuid,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
      and (p_start_date is null or coalesce(b.completed_at, b.updated_at::date) >= p_start_date)
      and (p_end_date is null or coalesce(b.completed_at, b.updated_at::date) < p_end_date)
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
$function$;
