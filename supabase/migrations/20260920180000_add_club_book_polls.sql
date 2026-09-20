-- Votação de próximo livro do clube: a criadora propõe opções e as membros
-- aprovadas votam. Só uma votação aberta por clube por vez.
create table if not exists public.club_book_polls (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  -- Livro (da estante da criadora) que virou a leitura atual do clube ao
  -- encerrar a votação, pra exibir o resultado depois de fechada.
  claimed_by_current_book_id uuid references public.books(id) on delete set null
);

create unique index if not exists club_book_polls_one_open_per_club
  on public.club_book_polls(club_id) where status = 'open';

create table if not exists public.club_book_poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.club_book_polls(id) on delete cascade,
  title text not null,
  author text not null,
  cover_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.club_book_poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.club_book_polls(id) on delete cascade,
  option_id uuid not null references public.club_book_poll_options(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (poll_id, user_id)
);

create index if not exists club_book_poll_options_poll_id_idx on public.club_book_poll_options(poll_id);
create index if not exists club_book_poll_votes_poll_id_idx on public.club_book_poll_votes(poll_id);
create index if not exists club_book_poll_votes_option_id_idx on public.club_book_poll_votes(option_id);

alter table public.club_book_polls enable row level security;
alter table public.club_book_poll_options enable row level security;
alter table public.club_book_poll_votes enable row level security;

-- Visível pra criadora e membros aprovadas do clube.
create policy "Club members can view polls"
on public.club_book_polls for select
using (
  exists (select 1 from public.clubs c where c.id = club_book_polls.club_id and c.creator_id = auth.uid())
  or exists (
    select 1 from public.club_members cm
    where cm.club_id = club_book_polls.club_id and cm.user_id = auth.uid() and cm.status = 'approved'
  )
);

create policy "Club creator can create polls"
on public.club_book_polls for insert
with check (
  auth.uid() = created_by
  and exists (select 1 from public.clubs c where c.id = club_id and c.creator_id = auth.uid())
);

create policy "Club creator can update polls"
on public.club_book_polls for update
using (exists (select 1 from public.clubs c where c.id = club_book_polls.club_id and c.creator_id = auth.uid()))
with check (exists (select 1 from public.clubs c where c.id = club_book_polls.club_id and c.creator_id = auth.uid()));

create policy "Club members can view poll options"
on public.club_book_poll_options for select
using (
  exists (
    select 1 from public.club_book_polls p
    where p.id = club_book_poll_options.poll_id
      and (
        exists (select 1 from public.clubs c where c.id = p.club_id and c.creator_id = auth.uid())
        or exists (
          select 1 from public.club_members cm
          where cm.club_id = p.club_id and cm.user_id = auth.uid() and cm.status = 'approved'
        )
      )
  )
);

create policy "Poll creator can add options while open"
on public.club_book_poll_options for insert
with check (
  exists (
    select 1 from public.club_book_polls p
    where p.id = poll_id and p.created_by = auth.uid() and p.status = 'open'
  )
);

create policy "Club members can view poll votes"
on public.club_book_poll_votes for select
using (
  exists (
    select 1 from public.club_book_polls p
    where p.id = club_book_poll_votes.poll_id
      and (
        exists (select 1 from public.clubs c where c.id = p.club_id and c.creator_id = auth.uid())
        or exists (
          select 1 from public.club_members cm
          where cm.club_id = p.club_id and cm.user_id = auth.uid() and cm.status = 'approved'
        )
      )
  )
);

create policy "Approved members can vote while poll is open"
on public.club_book_poll_votes for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.club_book_polls p
    where p.id = poll_id and p.status = 'open'
      and (
        exists (select 1 from public.clubs c where c.id = p.club_id and c.creator_id = auth.uid())
        or exists (
          select 1 from public.club_members cm
          where cm.club_id = p.club_id and cm.user_id = auth.uid() and cm.status = 'approved'
        )
      )
  )
);

create policy "Voters can change their own vote while poll is open"
on public.club_book_poll_votes for update
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (select 1 from public.club_book_polls p where p.id = poll_id and p.status = 'open')
);

create policy "Voters can remove their own vote"
on public.club_book_poll_votes for delete
using (auth.uid() = user_id);
