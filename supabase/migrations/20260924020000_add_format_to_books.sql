-- Formato em que a leitura acontece: físico, Kindle ou audiobook. Fica em
-- 'physical' por padrão pros livros já cadastrados (formato mais comum).
alter table public.books
  add column if not exists format text not null default 'physical'
    check (format in ('physical', 'kindle', 'audiobook'));

comment on column public.books.format is
  'Formato do livro: physical (físico), kindle ou audiobook.';
