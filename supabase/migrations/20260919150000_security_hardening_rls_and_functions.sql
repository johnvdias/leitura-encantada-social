-- =============================================
-- 1. ENABLE RLS ON TABLES THAT WERE FULLY EXPOSED
-- =============================================
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nudges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_reading_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_reading_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_schedule_participants ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 2. CHALLENGE_PARTICIPANTS
-- The old "FOR ALL USING (auth.uid() = user_id)" policy blocked the creator
-- from inserting rows for invited friends, and hid other participants'
-- progress from the ranking list. Split into per-action policies.
-- =============================================
DROP POLICY IF EXISTS "Allow users to manage their participation in challenges" ON public.challenge_participants;

CREATE POLICY "Participants can view challenge rosters"
ON public.challenge_participants FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Self or challenge creator can add participants"
ON public.challenge_participants FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.challenges ch WHERE ch.id = challenge_id AND ch.creator_id = auth.uid())
);

CREATE POLICY "Users can update their own participation"
ON public.challenge_participants FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own participation"
ON public.challenge_participants FOR DELETE
USING (auth.uid() = user_id);

-- =============================================
-- 3. NUDGES
-- Existing policies (insert as sender, select as receiver) already match
-- the only usage in the app; just turn RLS on.
-- =============================================

-- =============================================
-- 4. GROUP_READING_SCHEDULES (friend schedules)
-- Only an INSERT policy existed; add SELECT so creator/invited friends can
-- read schedules they belong to.
-- =============================================
CREATE POLICY "Creator or invited friends can view schedule"
ON public.group_reading_schedules FOR SELECT
USING (
  auth.uid() = creator_id
  OR EXISTS (
    SELECT 1 FROM public.schedule_participants sp
    WHERE sp.schedule_id = group_reading_schedules.id AND sp.user_id = auth.uid()
  )
);

-- =============================================
-- 5. SCHEDULE_PARTICIPANTS
-- Had RLS on but only a narrow "view own row" SELECT policy: this silently
-- blocked schedule creation (creator inserting rows for invited friends),
-- accept/decline (UPDATE), and hid other participants from the avatar list.
-- =============================================
DROP POLICY IF EXISTS "Users can view their own schedule participations" ON public.schedule_participants;

CREATE POLICY "Participants can view schedule rosters"
ON public.schedule_participants FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Self or schedule creator can add participants"
ON public.schedule_participants FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.group_reading_schedules grs
    WHERE grs.id = schedule_id AND grs.creator_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own invitation status"
ON public.schedule_participants FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- =============================================
-- 6. CLUB_READING_SCHEDULES
-- Never had policies recreated after being dropped in a prior migration.
-- =============================================
CREATE POLICY "Club members can view club schedules"
ON public.club_reading_schedules FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.club_members cm
    WHERE cm.club_id = club_reading_schedules.club_id AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Club creator can create schedules"
ON public.club_reading_schedules FOR INSERT
WITH CHECK (
  auth.uid() = creator_id
  AND EXISTS (SELECT 1 FROM public.clubs c WHERE c.id = club_id AND c.creator_id = auth.uid())
);

CREATE POLICY "Club creator can delete schedules"
ON public.club_reading_schedules FOR DELETE
USING (auth.uid() = creator_id);

-- =============================================
-- 7. CLUB_SCHEDULE_PARTICIPANTS
-- Never had any policy: the creator's bulk-enrollment insert for every
-- club member relies on this being open to the schedule's creator.
-- =============================================
CREATE POLICY "Club members can view schedule rosters"
ON public.club_schedule_participants FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Schedule creator can enroll club members"
ON public.club_schedule_participants FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.club_reading_schedules crs
    WHERE crs.id = club_schedule_id AND crs.creator_id = auth.uid()
  )
);

-- =============================================
-- 8. HARDEN SECURITY DEFINER / TRIGGER-ONLY FUNCTIONS
-- None of these are called via supabase.rpc() from the client; they only
-- run as triggers (which execute regardless of role grants), so revoking
-- EXECUTE from anon/authenticated closes the direct-RPC-call surface
-- without touching how they're actually used.
-- =============================================
REVOKE EXECUTE ON FUNCTION public.add_club_creator_as_member() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_nudge() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.queue_notification_and_send() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.remove_club_member(uuid, uuid) FROM anon, authenticated;

-- Pin search_path on all flagged functions so they can't be tricked by a
-- role-local search_path change (Supabase linter: function_search_path_mutable).
ALTER FUNCTION public.handle_new_nudge() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_temp;
ALTER FUNCTION public.add_club_creator_as_member() SET search_path = public, pg_temp;
ALTER FUNCTION public.remove_club_member(uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
ALTER FUNCTION public.ensure_creator_is_approved() SET search_path = public, pg_temp;
ALTER FUNCTION public.queue_notification_and_send() SET search_path = public, pg_temp;
