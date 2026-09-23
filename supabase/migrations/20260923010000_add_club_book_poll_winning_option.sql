-- Pra mostrar qual opção foi sorteada depois de fechado (sem precisar
-- inferir por título/autor), guarda o id da opção sorteada direto.
alter table public.club_book_polls
  add column if not exists winning_option_id uuid references public.club_book_poll_options(id);
