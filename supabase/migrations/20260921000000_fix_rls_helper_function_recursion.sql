-- BUG CRÍTICO na correção anterior: as funções is_approved_club_member,
-- is_challenge_participant e is_schedule_participant foram criadas como
-- "language sql", que o planner do Postgres pode INLINAR direto na
-- consulta de fora - quando isso acontece, o SECURITY DEFINER perde o
-- efeito (deixa de rodar com o bypass de RLS do dono da função) e a
-- policy volta a consultar a própria tabela sob RLS normal, causando
-- de novo "infinite recursion detected in policy". Reescrevendo como
-- "language plpgsql", que o planner NUNCA inlina, resolve de vez -
-- esse é o padrão recomendado pela própria documentação do Supabase
-- pra esse tipo de função auxiliar de RLS.
create or replace function public.is_approved_club_member(p_club_id uuid, p_user_id uuid)
returns boolean
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
begin
  return exists (
    select 1 from public.club_members
    where club_id = p_club_id and user_id = p_user_id and status = 'approved'
  );
end;
$$;

create or replace function public.is_challenge_participant(p_challenge_id uuid, p_user_id uuid)
returns boolean
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
begin
  return exists (
    select 1 from public.challenge_participants
    where challenge_id = p_challenge_id and user_id = p_user_id
  );
end;
$$;

create or replace function public.is_schedule_participant(p_schedule_id uuid, p_user_id uuid)
returns boolean
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
begin
  return exists (
    select 1 from public.schedule_participants
    where schedule_id = p_schedule_id and user_id = p_user_id
  );
end;
$$;
