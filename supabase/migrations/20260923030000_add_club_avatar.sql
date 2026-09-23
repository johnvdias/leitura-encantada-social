-- Foto de perfil do clube (separada da foto pessoal de quem criou).
alter table public.clubs add column if not exists avatar_url text;

-- Bucket público pra guardar as fotos, seguindo o mesmo padrão do
-- bucket "avatars" de perfil pessoal: caminho "<club_id>/avatar.jpeg".
insert into storage.buckets (id, name, public)
values ('club-avatars', 'club-avatars', true)
on conflict (id) do nothing;

create policy "Club avatars are publicly readable"
on storage.objects for select
using (bucket_id = 'club-avatars');

-- "clubs" e "storage.objects" têm ambas uma coluna "name" - dentro do
-- EXISTS é preciso qualificar "storage.objects.name" explicitamente,
-- senão o Postgres resolve "name" pra "clubs.name" (nome do clube) em
-- vez do caminho do arquivo, quebrando a checagem por completo.
create policy "Club creator can upload club avatar"
on storage.objects for insert
with check (
  bucket_id = 'club-avatars'
  and exists (
    select 1 from public.clubs
    where clubs.id::text = (storage.foldername(storage.objects.name))[1]
      and clubs.creator_id = auth.uid()
  )
);

create policy "Club creator can update club avatar"
on storage.objects for update
using (
  bucket_id = 'club-avatars'
  and exists (
    select 1 from public.clubs
    where clubs.id::text = (storage.foldername(storage.objects.name))[1]
      and clubs.creator_id = auth.uid()
  )
)
with check (
  bucket_id = 'club-avatars'
  and exists (
    select 1 from public.clubs
    where clubs.id::text = (storage.foldername(storage.objects.name))[1]
      and clubs.creator_id = auth.uid()
  )
);

create policy "Club creator can delete club avatar"
on storage.objects for delete
using (
  bucket_id = 'club-avatars'
  and exists (
    select 1 from public.clubs
    where clubs.id::text = (storage.foldername(storage.objects.name))[1]
      and clubs.creator_id = auth.uid()
  )
);
