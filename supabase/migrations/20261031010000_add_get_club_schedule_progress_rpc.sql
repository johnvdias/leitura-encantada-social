-- "Bateram a meta de hoje" no cronograma do clube ficava sempre errado (0 de
-- N) pra qualquer pessoa que não fosse a própria dona da leitura: a RLS de
-- reading_history só deixa cada usuária ver as próprias linhas ("Users can
-- view their own reading history"), então o join feito no client pra somar
-- páginas lidas hoje de CADA integrante só enxergava as da própria
-- visitante - current_page (via books, com RLS mais aberta pro clube)
-- aparecia certo, mas a soma de hoje não.
--
-- Mesmo padrão de get_club_rankings: função SECURITY DEFINER que devolve só
-- o agregado necessário (soma de páginas por usuária, não as linhas cruas
-- com anotações pessoais), verificando dentro dela mesma se quem chamou é
-- integrante aprovada ou criadora do clube do cronograma.
CREATE OR REPLACE FUNCTION public.get_club_schedule_progress(p_schedule_id uuid)
RETURNS TABLE (user_id uuid, pages_today integer)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_club_id uuid;
  v_book_title text;
  v_book_author text;
  v_today_start timestamptz;
begin
  select crs.club_id, b.title, b.author
    into v_club_id, v_book_title, v_book_author
  from public.club_reading_schedules crs
  join public.books b on b.id = crs.book_id
  where crs.id = p_schedule_id;

  if v_club_id is null then
    return;
  end if;

  if not (
    exists (select 1 from public.clubs c where c.id = v_club_id and c.creator_id = auth.uid())
    or exists (select 1 from public.club_members cm where cm.club_id = v_club_id and cm.user_id = auth.uid() and cm.status = 'approved')
  ) then
    return;
  end if;

  v_today_start := (date_trunc('day', (now() - interval '3 hours')) + interval '3 hours');

  return query
  select rh.user_id, coalesce(sum(rh.pages_read), 0)::integer as pages_today
  from public.reading_history rh
  join public.books b on b.id = rh.book_id
  where lower(trim(b.title)) = lower(trim(v_book_title))
    and lower(trim(b.author)) = lower(trim(v_book_author))
    and rh.created_at >= v_today_start
  group by rh.user_id;
end;
$function$;

REVOKE ALL ON FUNCTION public.get_club_schedule_progress(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_club_schedule_progress(uuid) TO authenticated, service_role;
