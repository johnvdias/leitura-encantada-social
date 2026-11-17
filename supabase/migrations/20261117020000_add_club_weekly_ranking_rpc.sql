-- "Rinha de livro": placar semanal por pontos (páginas lidas na semana) entre
-- as integrantes do clube, no estilo competição com pódio. Pontos vêm de
-- TODA leitura de cada integrante na semana (não só do livro atual do
-- clube) - é um incentivo geral a ler, igual ao app que inspirou a ideia.
--
-- reading_history só é visível pra dona da própria linha (RLS "Users can
-- view their own reading history"), então uma consulta direta do cliente só
-- enxergaria a própria pontuação. Essa RPC roda com privilégio elevado e
-- devolve só o agregado (soma de páginas por integrante), depois de
-- confirmar que quem chamou é integrante aprovada ou criadora do clube -
-- mesmo padrão de get_club_rankings/get_club_schedule_progress.
CREATE OR REPLACE FUNCTION public.get_club_weekly_ranking(p_club_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  result jsonb;
  brt_offset constant interval := interval '3 hours';
  today_brt date;
  week_start_date date;
  week_start timestamptz;
  week_end timestamptz;
begin
  if not (
    public.is_approved_club_member(p_club_id, auth.uid())
    or public.is_club_creator(p_club_id, auth.uid())
  ) then
    raise exception 'not authorized';
  end if;

  -- Mesma convenção de fuso usada no resto do app: dia civil em BRT, fixo em
  -- UTC-3. Semana de segunda a domingo (isodow: segunda = 1).
  today_brt := (now() - brt_offset)::date;
  week_start_date := today_brt - (extract(isodow from today_brt::timestamp)::int - 1);
  week_start := (week_start_date::text || 'T03:00:00.000Z')::timestamptz;
  week_end := week_start + interval '7 days';

  with member_ids as (
    select user_id from public.club_members
    where club_id = p_club_id and status = 'approved'
  ),
  points as (
    select m.user_id, greatest(0, coalesce(sum(rh.pages_read), 0)) as points
    from member_ids m
    left join public.reading_history rh
      on rh.user_id = m.user_id
      and rh.created_at >= week_start
      and rh.created_at < week_end
    group by m.user_id
  ),
  ranked as (
    select p.user_id, p.points, pr.display_name, pr.avatar_url
    from points p
    join public.profiles pr on pr.user_id = p.user_id
  )
  select jsonb_build_object(
    'week_start', week_start,
    'week_end', week_end,
    'members', coalesce((select jsonb_agg(jsonb_build_object(
      'user_id', user_id,
      'display_name', display_name,
      'avatar_url', avatar_url,
      'points', points
    ) order by points desc, display_name asc) from ranked), '[]'::jsonb)
  ) into result;

  return result;
end;
$function$;
