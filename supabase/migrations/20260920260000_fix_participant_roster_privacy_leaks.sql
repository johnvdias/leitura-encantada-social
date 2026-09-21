-- Mesmo padrão de bug do club_members corrigido na migration anterior:
-- essas 3 tabelas de "participantes" tinham SELECT liberado pra
-- "qualquer usuária autenticada" (auth.role() = 'authenticated'), então
-- quem soubesse/adivinhasse um challenge_id/schedule_id conseguia ver a
-- lista completa de participantes (progresso, status de convite) mesmo
-- sem fazer parte do desafio/cronograma - mesmo a tabela "pai"
-- (challenges, group_reading_schedules) sendo corretamente restrita.

-- challenge_participants: precisa de função SECURITY DEFINER porque a
-- política referencia a própria tabela (recursão se fosse subquery direta).
create or replace function public.is_challenge_participant(p_challenge_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.challenge_participants
    where challenge_id = p_challenge_id and user_id = p_user_id
  );
$$;

revoke execute on function public.is_challenge_participant(uuid, uuid) from public, anon;
grant execute on function public.is_challenge_participant(uuid, uuid) to authenticated;

drop policy if exists "Participants can view challenge rosters" on public.challenge_participants;
create policy "Participants can view challenge rosters"
on public.challenge_participants for select
using (
  auth.uid() = user_id
  or exists (select 1 from public.challenges ch where ch.id = challenge_participants.challenge_id and ch.creator_id = auth.uid())
  or public.is_challenge_participant(challenge_id, auth.uid())
);

-- schedule_participants (cronogramas entre amigas): mesmo caso, função
-- SECURITY DEFINER pra evitar recursão.
create or replace function public.is_schedule_participant(p_schedule_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.schedule_participants
    where schedule_id = p_schedule_id and user_id = p_user_id
  );
$$;

revoke execute on function public.is_schedule_participant(uuid, uuid) from public, anon;
grant execute on function public.is_schedule_participant(uuid, uuid) to authenticated;

drop policy if exists "Participants can view schedule rosters" on public.schedule_participants;
create policy "Participants can view schedule rosters"
on public.schedule_participants for select
using (
  auth.uid() = user_id
  or exists (select 1 from public.group_reading_schedules grs where grs.id = schedule_participants.schedule_id and grs.creator_id = auth.uid())
  or public.is_schedule_participant(schedule_id, auth.uid())
);

-- club_schedule_participants (cronogramas de clube): não precisa de
-- função auxiliar - dá pra checar via club_reading_schedules -> clubs /
-- club_members, que são tabelas diferentes (sem risco de recursão).
drop policy if exists "Club members can view schedule rosters" on public.club_schedule_participants;
create policy "Club members can view schedule rosters"
on public.club_schedule_participants for select
using (
  exists (
    select 1 from public.club_reading_schedules crs
    join public.club_members cm on cm.club_id = crs.club_id
    where crs.id = club_schedule_participants.club_schedule_id
      and cm.user_id = auth.uid()
      and cm.status = 'approved'
  )
  or exists (
    select 1 from public.club_reading_schedules crs
    join public.clubs c on c.id = crs.club_id
    where crs.id = club_schedule_participants.club_schedule_id
      and c.creator_id = auth.uid()
  )
);
