-- Insert avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create simple policies for avatars bucket
DO $$
BEGIN
    -- Allow authenticated users to insert
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Allow authenticated uploads to avatars'
    ) THEN
        CREATE POLICY "Allow authenticated uploads to avatars"
        ON storage.objects FOR INSERT 
        WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
    END IF;

    -- Allow authenticated users to update their own files
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Allow users to update their avatars'
    ) THEN
        CREATE POLICY "Allow users to update their avatars"
        ON storage.objects FOR UPDATE 
        USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
    END IF;

    -- Allow public read access
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Allow public avatar access'
    ) THEN
        CREATE POLICY "Allow public avatar access"
        ON storage.objects FOR SELECT 
        USING (bucket_id = 'avatars');
    END IF;
END $$;
