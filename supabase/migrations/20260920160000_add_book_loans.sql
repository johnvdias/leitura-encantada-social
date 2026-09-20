-- Empréstimo de livros entre usuárias (a mesma relação de amizade que já
-- controla a visibilidade da estante em `books` é o que permite ver o livro
-- para pedir emprestado).
create table if not exists public.book_loans (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  borrower_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled', 'returned')),
  message text,
  requested_at timestamptz not null default now(),
  responded_at timestamptz,
  returned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists book_loans_book_id_idx on public.book_loans(book_id);
create index if not exists book_loans_owner_id_idx on public.book_loans(owner_id);
create index if not exists book_loans_borrower_id_idx on public.book_loans(borrower_id);
create index if not exists book_loans_status_idx on public.book_loans(status);

alter table public.book_loans enable row level security;

create policy "Users can view their own loans"
on public.book_loans for select
using (auth.uid() = owner_id or auth.uid() = borrower_id);

create policy "Users can request a loan"
on public.book_loans for insert
with check (auth.uid() = borrower_id);

create policy "Participants can update their loans"
on public.book_loans for update
using (auth.uid() = owner_id or auth.uid() = borrower_id)
with check (auth.uid() = owner_id or auth.uid() = borrower_id);

-- O owner_id nunca vem do cliente: é resolvido a partir do dono real do
-- livro, o que impede forjar um pedido em nome de outro dono.
create or replace function public.set_book_loan_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
begin
  select user_id into v_owner_id from public.books where id = new.book_id;

  if v_owner_id is null then
    raise exception 'Livro não encontrado.';
  end if;

  if v_owner_id = new.borrower_id then
    raise exception 'Você não pode pedir emprestado um livro que já é seu.';
  end if;

  new.owner_id := v_owner_id;
  new.status := 'pending';
  new.responded_at := null;
  new.returned_at := null;
  return new;
end;
$$;

drop trigger if exists trg_set_book_loan_owner on public.book_loans;
create trigger trg_set_book_loan_owner
before insert on public.book_loans
for each row execute function public.set_book_loan_owner();

-- Só permite as transições de status esperadas, feitas pelo lado certo do
-- empréstimo (quem empresta aceita/recusa, quem pede cancela, qualquer um
-- registra a devolução de um empréstimo já aceito).
create or replace function public.enforce_book_loan_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.book_id <> old.book_id or new.borrower_id <> old.borrower_id or new.owner_id <> old.owner_id then
    raise exception 'Não é permitido alterar livro, dono ou solicitante do empréstimo.';
  end if;

  if old.status = new.status then
    return new;
  end if;

  if old.status = 'pending' and new.status = 'accepted' and auth.uid() = old.owner_id then
    new.responded_at := now();
  elsif old.status = 'pending' and new.status = 'declined' and auth.uid() = old.owner_id then
    new.responded_at := now();
  elsif old.status = 'pending' and new.status = 'cancelled' and auth.uid() = old.borrower_id then
    new.responded_at := now();
  elsif old.status = 'accepted' and new.status = 'returned' and auth.uid() in (old.owner_id, old.borrower_id) then
    new.returned_at := now();
  else
    raise exception 'Transição de status de empréstimo inválida.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_book_loan_transition on public.book_loans;
create trigger trg_enforce_book_loan_transition
before update on public.book_loans
for each row execute function public.enforce_book_loan_transition();

-- Funções de trigger não devem ser chamadas diretamente via RPC.
revoke execute on function public.set_book_loan_owner() from public, anon, authenticated;
revoke execute on function public.enforce_book_loan_transition() from public, anon, authenticated;

-- Nova categoria de notificação ("loans"), ativa por padrão para todo mundo.
alter table public.profiles
  alter column notification_preferences set default '{"likes": true, "comments": true, "friends": true, "nudges": true, "achievements": true, "loans": true}'::jsonb;

update public.profiles
  set notification_preferences = notification_preferences || '{"loans": true}'::jsonb
  where not (notification_preferences ? 'loans');
