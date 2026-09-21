-- Mesmo ciclo do club_members/clubs, só que em mais dois pares de
-- tabelas: schedule_participants <-> group_reading_schedules e
-- challenge_participants <-> challenges. Ambas as políticas "pai"
-- (group_reading_schedules, challenges) já consultavam a tabela de
-- participantes de volta, e minhas políticas novas passaram a
-- consultar a tabela "pai" também - fechando o ciclo. Mesma solução:
-- função SECURITY DEFINER (plpgsql) pra checar "é a criadora" sem
-- reacionar a RLS da tabela pai.
create or replace function public.is_schedule_creator(p_schedule_id uuid, p_user_id uuid)
returns boolean
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
begin
  return exists (
    select 1 from public.group_reading_schedules
    where id = p_schedule_id and creator_id = p_user_id
  );
end;
$$;

revoke execute on function public.is_schedule_creator(uuid, uuid) from public, anon;
grant execute on function public.is_schedule_creator(uuid, uuid) to authenticated;

drop policy if exists "Participants can view schedule rosters" on public.schedule_participants;
create policy "Participants can view schedule rosters"
on public.schedule_participants for select
using (
  auth.uid() = user_id
  or public.is_schedule_creator(schedule_id, auth.uid())
  or public.is_schedule_participant(schedule_id, auth.uid())
);

create or replace function public.is_challenge_creator(p_challenge_id uuid, p_user_id uuid)
returns boolean
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
begin
  return exists (
    select 1 from public.challenges
    where id = p_challenge_id and creator_id = p_user_id
  );
end;
$$;

revoke execute on function public.is_challenge_creator(uuid, uuid) from public, anon;
grant execute on function public.is_challenge_creator(uuid, uuid) to authenticated;

drop policy if exists "Participants can view challenge rosters" on public.challenge_participants;
create policy "Participants can view challenge rosters"
on public.challenge_participants for select
using (
  auth.uid() = user_id
  or public.is_challenge_creator(challenge_id, auth.uid())
  or public.is_challenge_participant(challenge_id, auth.uid())
);
