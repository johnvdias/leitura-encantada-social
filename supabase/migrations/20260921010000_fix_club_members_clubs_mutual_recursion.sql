-- A política nova de club_members (SELECT) consulta "clubs" pra saber
-- se auth.uid() é a criadora do clube; a política de "clubs" (SELECT)
-- consulta "club_members" de volta pra saber se auth.uid() é membro.
-- Isso forma um ciclo entre as duas tabelas (A consulta B, B consulta A)
-- que não existia antes porque a política antiga de club_members nunca
-- consultava "clubs". Resultado: "infinite recursion detected in policy".
-- Fecha o ciclo envolvendo a checagem de "é criadora do clube" também
-- numa função SECURITY DEFINER (plpgsql, não inlinável), do mesmo jeito
-- que já foi feito pra "é membro aprovado".
create or replace function public.is_club_creator(p_club_id uuid, p_user_id uuid)
returns boolean
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
begin
  return exists (
    select 1 from public.clubs
    where id = p_club_id and creator_id = p_user_id
  );
end;
$$;

revoke execute on function public.is_club_creator(uuid, uuid) from public, anon;
grant execute on function public.is_club_creator(uuid, uuid) to authenticated;

drop policy if exists "Members can view their club roster" on public.club_members;
create policy "Members can view their club roster"
on public.club_members for select
using (
  auth.uid() = user_id
  or public.is_club_creator(club_id, auth.uid())
  or (
    status = 'approved'
    and public.is_approved_club_member(club_id, auth.uid())
  )
);
