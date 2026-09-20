-- Biblioteca Encantada: uma estante de EPUBs curada (domínio público /
-- autorizados) que qualquer usuária logada pode navegar e baixar, com
-- upload restrito a administradoras.

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

create table if not exists public.library_books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null,
  description text,
  genre text,
  cover_url text,
  file_path text not null,
  file_size_bytes integer,
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists library_books_created_at_idx on public.library_books(created_at desc);

alter table public.library_books enable row level security;

create policy "Authenticated users can view the library"
on public.library_books for select
using (auth.role() = 'authenticated');

create policy "Admins can add library books"
on public.library_books for insert
with check (
  exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true)
);

create policy "Admins can update library books"
on public.library_books for update
using (
  exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true)
);

create policy "Admins can delete library books"
on public.library_books for delete
using (
  exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true)
);

-- Bucket privado: arquivo só é acessível via signed URL gerada sob demanda,
-- não por link público direto.
insert into storage.buckets (id, name, public, file_size_limit)
values ('library-epubs', 'library-epubs', false, 104857600)
on conflict (id) do nothing;

create policy "Authenticated users can download library epubs"
on storage.objects for select
using (bucket_id = 'library-epubs' and auth.role() = 'authenticated');

create policy "Admins can upload library epubs"
on storage.objects for insert
with check (
  bucket_id = 'library-epubs'
  and exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true)
);

create policy "Admins can update library epub files"
on storage.objects for update
using (
  bucket_id = 'library-epubs'
  and exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true)
);

create policy "Admins can delete library epub files"
on storage.objects for delete
using (
  bucket_id = 'library-epubs'
  and exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true)
);
