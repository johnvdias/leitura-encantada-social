-- Corrigir dados existentes: adicionar criadores como membros dos clubes existentes
INSERT INTO public.club_members (club_id, user_id, role)
SELECT c.id, c.creator_id, 'member'
FROM public.clubs c
WHERE NOT EXISTS (
  SELECT 1 FROM public.club_members cm 
  WHERE cm.club_id = c.id AND cm.user_id = c.creator_id
);