-- 1) Funções SECURITY DEFINER que só deveriam rodar via trigger (nunca
-- chamadas pela API) ainda tinham EXECUTE liberado pra anon/authenticated.
revoke execute on function public.add_club_creator_as_member() from public, anon, authenticated;
revoke execute on function public.handle_new_nudge() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- 2) queue_notification_and_send() e remove_club_member(uuid, uuid) não
-- têm trigger nem são chamadas pelo frontend (a remoção de membro do
-- clube já é feita por DELETE direto, coberto por RLS) - código morto,
-- mas por segurança revoga o EXECUTE já que são SECURITY DEFINER.
revoke execute on function public.queue_notification_and_send() from public, anon, authenticated;
revoke execute on function public.remove_club_member(uuid, uuid) from public, anon, authenticated;

-- 3) club_members estava com SELECT liberado pra "qualquer usuária
-- autenticada" (auth.role() = 'authenticated'), então quem soubesse/
-- adivinhasse o id de um clube PRIVADO conseguia ver a lista completa de
-- membros (inclusive pedidos pendentes com nome e foto) sem ser membro.
-- A tentativa anterior de restringir isso (migration
-- 20260919151500) foi revertida por causar recursão infinita, já que a
-- política consultava a própria tabela club_members. A correção usa uma
-- função SECURITY DEFINER pra checar aprovação sem reacionar a RLS.
create or replace function public.is_approved_club_member(p_club_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.club_members
    where club_id = p_club_id and user_id = p_user_id and status = 'approved'
  );
$$;

revoke execute on function public.is_approved_club_member(uuid, uuid) from public, anon;
grant execute on function public.is_approved_club_member(uuid, uuid) to authenticated;

drop policy if exists "Allow authenticated users to view members" on public.club_members;

create policy "Members can view their club roster"
on public.club_members for select
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.clubs
    where clubs.id = club_members.club_id and clubs.creator_id = auth.uid()
  )
  or (
    status = 'approved'
    and public.is_approved_club_member(club_members.club_id, auth.uid())
  )
);
