-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Create storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add username column to profiles table with unique constraint
ALTER TABLE public.profiles 
ADD COLUMN username text UNIQUE;

-- Add index for username searches
CREATE INDEX idx_profiles_username ON public.profiles(username);

-- Update achievements table to include emoji
ALTER TABLE public.achievements 
ADD COLUMN emoji text DEFAULT '🏆';

-- Update existing achievements with emojis
UPDATE public.achievements 
SET emoji = CASE 
  WHEN achievement_type = 'first_book' THEN '📖'
  WHEN achievement_type = 'reading_streak' THEN '🔥'
  WHEN achievement_type = 'social_butterfly' THEN '🦋'
  WHEN achievement_type = 'book_reviewer' THEN '⭐'
  ELSE '🏆'
END;