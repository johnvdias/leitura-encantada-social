-- MemberManagement.tsx's "Adicionar Membro" lets the creator search a
-- user and add them straight in (status='approved'), bypassing the
-- join-request flow. There was never an RLS policy allowing that: the
-- only INSERT policy on club_members required auth.uid() = user_id
-- (self-join only), so the creator inserting a row for someone else's
-- user_id was always rejected.
CREATE POLICY "Club creator can add members directly"
ON public.club_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clubs c
    WHERE c.id = club_id AND c.creator_id = auth.uid()
  )
);
