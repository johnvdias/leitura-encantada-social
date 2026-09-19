-- =============================================
-- 1. Creator's own club_members row was never approved
-- add_club_creator_as_member() relied on column defaults (status =
-- 'pending', role hardcoded to 'admin', which the frontend never expects
-- - it only knows 'creator' | 'member'). Nobody can approve the creator
-- of a brand new club (they're the only member), so this locked the
-- creator out of their own club's discussions/schedules/members tabs.
-- =============================================
CREATE OR REPLACE FUNCTION public.add_club_creator_as_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  INSERT INTO public.club_members (club_id, user_id, role, status)
  VALUES (NEW.id, NEW.creator_id, 'creator', 'approved');
  RETURN NEW;
END;
$function$;

-- =============================================
-- 2. Leftover duplicate/loose policies allowing impersonation or leaking
-- private content. Postgres OR's every permissive policy for a given
-- table+command together, so the loosest one wins.
-- =============================================

-- clubs: "Allow insert for authenticated users" had no creator_id check -
-- any authenticated user could insert a club with anyone as creator_id.
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.clubs;

-- post_comments: "Allow authenticated users to insert comments" had no
-- user_id check - any authenticated user could post a comment attributed
-- to another user's user_id.
DROP POLICY IF EXISTS "Allow authenticated users to insert comments" ON public.post_comments;

-- post_comments: "Allow users to view all comments" (USING true) bypassed
-- the visibility check entirely, exposing comments on private/friends-only
-- posts to everyone.
DROP POLICY IF EXISTS "Allow users to view all comments" ON public.post_comments;

-- =============================================
-- 3. club_discussions / club_reading_schedules only checked "is there a
-- club_members row for me", not whether it's approved - a still-pending
-- join request could read/post discussions or see the reading schedule
-- via the API directly (already gated in the UI, but not by RLS itself).
-- =============================================
DROP POLICY IF EXISTS "Club members can create discussions" ON public.club_discussions;
CREATE POLICY "Club members can create discussions"
ON public.club_discussions FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.club_members
    WHERE club_members.club_id = club_discussions.club_id
      AND club_members.user_id = auth.uid()
      AND club_members.status = 'approved'
  )
);

DROP POLICY IF EXISTS "Club members can view discussions" ON public.club_discussions;
CREATE POLICY "Club members can view discussions"
ON public.club_discussions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.club_members
    WHERE club_members.club_id = club_discussions.club_id
      AND club_members.user_id = auth.uid()
      AND club_members.status = 'approved'
  )
);

DROP POLICY IF EXISTS "Club members can view club schedules" ON public.club_reading_schedules;
CREATE POLICY "Club members can view club schedules"
ON public.club_reading_schedules FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.club_members cm
    WHERE cm.club_id = club_reading_schedules.club_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
  )
);
