-- Permite marcar um post pra um clube específico (opcional), pra alimentar
-- a aba "Clubes" do feed com conteúdo realmente ligado ao clube, e não
-- qualquer post público de quem por acaso é membro de um clube junto.
alter table public.posts
  add column if not exists club_id uuid references public.clubs(id) on delete set null;

create index if not exists posts_club_id_idx on public.posts(club_id);

-- Só permite marcar um post pra um clube do qual a própria autora é
-- membro aprovada (ou criadora).
create or replace function public.enforce_post_club_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.club_id is not null then
    if not exists (
      select 1 from public.clubs c where c.id = new.club_id and c.creator_id = new.user_id
    ) and not exists (
      select 1 from public.club_members cm
      where cm.club_id = new.club_id and cm.user_id = new.user_id and cm.status = 'approved'
    ) then
      raise exception 'Você precisa ser membro do clube pra marcar um post nele.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_post_club_membership on public.posts;
create trigger trg_enforce_post_club_membership
before insert or update on public.posts
for each row execute function public.enforce_post_club_membership();

revoke execute on function public.enforce_post_club_membership() from public, anon, authenticated;
