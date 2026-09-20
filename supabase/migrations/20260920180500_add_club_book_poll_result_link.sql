alter table public.club_book_polls
  add column if not exists claimed_by_current_book_id uuid references public.books(id) on delete set null;
