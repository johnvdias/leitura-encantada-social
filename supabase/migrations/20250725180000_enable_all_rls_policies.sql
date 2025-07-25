-- =============================================
-- PARTE 1: LIMPEZA COMPLETA DE TODAS AS POLÍTICAS RELEVANTES
-- =============================================
-- Limpando 'clubs' e 'club_members'
DROP POLICY IF EXISTS "Allow view for public or member" ON public.clubs;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.clubs;
DROP POLICY IF EXISTS "Allow update for creators" ON public.clubs;
DROP POLICY IF EXISTS "Allow delete for creators" ON public.clubs;
DROP POLICY IF EXISTS "Allow authenticated users to view members" ON public.club_members;
DROP POLICY IF EXISTS "Allow users to add themselves to clubs" ON public.club_members;
DROP POLICY IF EXISTS "Allow members to leave or creators to remove" ON public.club_members;

-- Limpando 'post_comments'
DROP POLICY IF EXISTS "Allow authenticated users to insert comments" ON public.post_comments;
DROP POLICY IF EXISTS "Allow users to view all comments" ON public.post_comments;

-- Limpando 'challenges' e 'challenge_participants'
DROP POLICY IF EXISTS "Allow users to create challenges" ON public.challenges;
DROP POLICY IF EXISTS "Allow participants to view challenges" ON public.challenges;
DROP POLICY IF EXISTS "Allow users to manage their participation in challenges" ON public.challenge_participants;

-- Limpando 'nudges'
DROP POLICY IF EXISTS "Allow users to send nudges" ON public.nudges;
DROP POLICY IF EXISTS "Allow users to view nudges sent to them" ON public.nudges;

-- Limpando 'group_reading_schedules' e 'schedule_participants'
DROP POLICY IF EXISTS "Allow users to create friend schedules" ON public.group_reading_schedules;
DROP POLICY IF EXISTS "Allow participants to view friend schedules" ON public.group_reading_schedules;
DROP POLICY IF EXISTS "Allow users to manage their participation in friend schedules" ON public.schedule_participants;

-- Limpando 'club_reading_schedules' e 'club_schedule_participants'
DROP POLICY IF EXISTS "Allow club creators to create schedules" ON public.club_reading_schedules;
DROP POLICY IF EXISTS "Allow club members to view club schedules" ON public.club_reading_schedules;
DROP POLICY IF EXISTS "Allow club members to participate in schedules" ON public.club_schedule_participants;

-- =============================================
-- PARTE 2: RECRIAÇÃO DE TODAS AS POLÍTICAS CORRETAS
-- =============================================
-- Políticas para 'clubs'
CREATE POLICY "Allow view for public or member" ON public.clubs FOR SELECT USING ( (is_private = false) OR (EXISTS ( SELECT 1 FROM public.club_members WHERE club_members.club_id = clubs.id AND club_members.user_id = auth.uid() )) );
CREATE POLICY "Allow insert for authenticated users" ON public.clubs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow update for creators" ON public.clubs FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Allow delete for creators" ON public.clubs FOR DELETE USING (auth.uid() = creator_id);

-- Políticas para 'club_members'
CREATE POLICY "Allow authenticated users to view members" ON public.club_members FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow users to add themselves to clubs" ON public.club_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow members to leave or creators to remove" ON public.club_members FOR DELETE USING ( (auth.uid() = user_id) OR (EXISTS ( SELECT 1 FROM public.clubs WHERE clubs.id = club_members.club_id AND clubs.creator_id = auth.uid() )) );

-- Políticas para 'post_comments'
CREATE POLICY "Allow authenticated users to insert comments" ON public.post_comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow users to view all comments" ON public.post_comments FOR SELECT USING (true);

-- Políticas para 'challenges'
CREATE POLICY "Allow users to create challenges" ON public.challenges FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Allow participants to view challenges" ON public.challenges FOR SELECT USING (EXISTS ( SELECT 1 FROM public.challenge_participants WHERE challenge_participants.challenge_id = challenges.id AND challenge_participants.user_id = auth.uid() ));
CREATE POLICY "Allow users to manage their participation in challenges" ON public.challenge_participants FOR ALL USING (auth.uid() = user_id);

-- Políticas para 'nudges'
CREATE POLICY "Allow users to send nudges" ON public.nudges FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Allow users to view nudges sent to them" ON public.nudges FOR SELECT USING (auth.uid() = receiver_id);

-- Políticas para 'group_reading_schedules'
-- Linha correta:
CREATE POLICY "Allow users to create friend schedules" ON public.group_reading_schedules FOR INSERT WITH CHECK (auth.uid() = creator_id);

