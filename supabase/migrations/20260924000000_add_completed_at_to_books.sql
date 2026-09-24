-- Data (opcional) em que a leitura do livro foi concluída, escolhida pela
-- usuária. Quando não informada, o app trata como sendo a data em que o
-- livro foi marcado como lido (fallback calculado no client, não aqui).
alter table public.books
  add column if not exists completed_at date;

comment on column public.books.completed_at is
  'Data em que a leitura foi concluída, escolhida pela usuária (opcional). Usada pela retrospectiva pra agrupar por mês/ano com precisão.';
