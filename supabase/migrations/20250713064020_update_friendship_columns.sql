-- Add foreign keys for friendships table to link with profiles
ALTER TABLE public.friendships 
ADD CONSTRAINT friendships_requester_id_fkey 
FOREIGN KEY (requester_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

ALTER TABLE public.friendships 
ADD CONSTRAINT friendships_addressee_id_fkey 
FOREIGN KEY (addressee_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;