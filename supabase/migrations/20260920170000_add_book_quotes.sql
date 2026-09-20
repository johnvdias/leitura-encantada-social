create table if not exists public.book_quotes (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  page_number integer,
  created_at timestamptz not null default now()
);

create index if not exists book_quotes_book_id_idx on public.book_quotes(book_id);
create index if not exists book_quotes_user_id_idx on public.book_quotes(user_id);

alter table public.book_quotes enable row level security;

create policy "Users can view their own quotes"
on public.book_quotes for select
using (auth.uid() = user_id);

create policy "Users can create their own quotes"
on public.book_quotes for insert
with check (auth.uid() = user_id);

create policy "Users can update their own quotes"
on public.book_quotes for update
using (auth.uid() = user_id);

create policy "Users can delete their own quotes"
on public.book_quotes for delete
using (auth.uid() = user_id);
