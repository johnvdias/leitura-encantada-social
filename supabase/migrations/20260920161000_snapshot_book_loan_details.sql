-- Guarda título/autor/capa no próprio pedido de empréstimo, capturados no
-- momento do pedido. Evita depender da RLS de `books` (que só libera livro
-- de amigas aceitas) pra exibir o histórico de empréstimos mais tarde, e
-- mantém o registro estável mesmo se o livro for editado depois.
alter table public.book_loans
  add column if not exists book_title text,
  add column if not exists book_author text,
  add column if not exists book_cover_url text;

create or replace function public.set_book_loan_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_title text;
  v_author text;
  v_cover_url text;
begin
  select user_id, title, author, cover_url
    into v_owner_id, v_title, v_author, v_cover_url
    from public.books where id = new.book_id;

  if v_owner_id is null then
    raise exception 'Livro não encontrado.';
  end if;

  if v_owner_id = new.borrower_id then
    raise exception 'Você não pode pedir emprestado um livro que já é seu.';
  end if;

  new.owner_id := v_owner_id;
  new.book_title := v_title;
  new.book_author := v_author;
  new.book_cover_url := v_cover_url;
  new.status := 'pending';
  new.responded_at := null;
  new.returned_at := null;
  return new;
end;
$$;
