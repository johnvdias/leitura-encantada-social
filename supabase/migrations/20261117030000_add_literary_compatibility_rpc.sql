-- "Compatibilidade literária": % de afinidade entre duas amigas com base nos
-- livros concluídos em comum (índice de Jaccard: comuns / união), igual à
-- ideia vista no vídeo do app concorrente. Só funciona entre amigas aceitas -
-- é a mesma barreira de privacidade que livros já têm (RLS de "books" só
-- libera a estante pra dona, amigas aceitas, clube do livro atual ou posts
-- públicos), e essa função roda com privilégio elevado pra poder comparar as
-- duas estantes de uma vez sem dar mais acesso do que isso.
CREATE OR REPLACE FUNCTION public.get_literary_compatibility(p_other_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  result jsonb;
  caller uuid := auth.uid();
begin
  if caller is null or caller = p_other_user_id then
    raise exception 'invalid request';
  end if;

  if not exists (
    select 1 from public.friendships
    where status = 'accepted'
      and (
        (requester_id = caller and addressee_id = p_other_user_id)
        or (addressee_id = caller and requester_id = p_other_user_id)
      )
  ) then
    raise exception 'not authorized';
  end if;

  with mine as (
    select distinct lower(trim(title)) || '|' || lower(trim(coalesce(author, ''))) as book_key
    from public.books
    where user_id = caller and reading_status = 'completed'
  ),
  theirs as (
    select distinct lower(trim(title)) || '|' || lower(trim(coalesce(author, ''))) as book_key
    from public.books
    where user_id = p_other_user_id and reading_status = 'completed'
  ),
  stats as (
    select
      (select count(*) from mine) as mine_count,
      (select count(*) from theirs) as theirs_count,
      (select count(*) from mine join theirs using (book_key)) as common_count
  )
  select jsonb_build_object(
    'common_books', common_count,
    'my_total', mine_count,
    'their_total', theirs_count,
    'percentage', case
      when (mine_count + theirs_count - common_count) <= 0 then 0
      else round(100.0 * common_count / (mine_count + theirs_count - common_count))::int
    end
  ) into result
  from stats;

  return result;
end;
$function$;
