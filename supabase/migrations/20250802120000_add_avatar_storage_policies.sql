-- 1. Create a policy to allow public access to view avatars.
CREATE POLICY "Allow public read access to avatars"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- 2. Create a policy to allow authenticated users to upload their own avatar.
--    Users can only upload to a folder that matches their own user ID.
CREATE POLICY "Allow authenticated users to upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'avatars' AND auth.uid() = (storage.foldername(name))[1]::uuid );

-- 3. Create a policy to allow authenticated users to update their own avatar.
--    Users can only update their own avatar within their user-specific folder.
CREATE POLICY "Allow authenticated users to update own avatar"
ON storage.objects FOR UPDATE
USING ( auth.uid() = (storage.foldername(name))[1]::uuid )
WITH CHECK ( bucket_id = 'avatars' AND auth.uid() = (storage.foldername(name))[1]::uuid );
