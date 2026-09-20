-- Remove a Biblioteca Encantada: ao checar a pasta do Drive pelo conector,
-- vários arquivos eram claramente obras protegidas de autoras best-seller
-- (Sarah J. Maas, Rebecca Yarros, Grace Reilly), algumas com "_nodrm" no
-- nome - indício de proteção removida pra redistribuição. Distribuir isso
-- pra outras usuárias do app seria violação de direitos autorais em escala,
-- então a função inteira foi removida antes de qualquer uso real (nenhuma
-- linha em library_books, nenhum arquivo no bucket).

drop policy if exists "Admins can delete library epub files" on storage.objects;
drop policy if exists "Admins can update library epub files" on storage.objects;
drop policy if exists "Admins can upload library epubs" on storage.objects;
drop policy if exists "Authenticated users can download library epubs" on storage.objects;

delete from storage.buckets where id = 'library-epubs';

drop table if exists public.library_books;

alter table public.profiles drop column if exists is_admin;
