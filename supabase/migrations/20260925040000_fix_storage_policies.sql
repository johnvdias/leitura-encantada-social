-- 1) "Allow authenticated uploads to avatars" (INSERT) e "Allow users to
--    update their avatars" (UPDATE) só checavam auth.role() = 'authenticated',
--    sem restringir o caminho - como o caminho de cada avatar é previsível
--    (<user_id>/avatar.jpeg), qualquer usuária logada podia sobrescrever a
--    foto de perfil de QUALQUER outra pessoa. As demais políticas do bucket
--    já fazem a checagem certa (auth.uid() = pasta).
DROP POLICY IF EXISTS "Allow authenticated uploads to avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their avatars" ON storage.objects;

-- 2) "club-avatars" não tinha limite de tamanho nem de tipo de arquivo,
--    diferente de "avatars" (5MB, só imagens).
UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'club-avatars';

-- 3) Quatro políticas de SELECT idênticas em "avatars" acumuladas de
--    configurações anteriores - mantém só uma.
DROP POLICY IF EXISTS "Allow public read access to avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
