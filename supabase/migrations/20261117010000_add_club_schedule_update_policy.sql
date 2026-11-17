-- Falta a política de UPDATE em club_reading_schedules: só havia
-- INSERT/DELETE/SELECT. Sem ela, o criador do clube não consegue editar um
-- cronograma existente (data, meta) pelo app.
CREATE POLICY "Club creator can update schedules"
ON public.club_reading_schedules
FOR UPDATE
USING (
  (SELECT auth.uid()) = creator_id
  AND EXISTS (
    SELECT 1 FROM public.clubs c
    WHERE c.id = club_reading_schedules.club_id
    AND c.creator_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  (SELECT auth.uid()) = creator_id
  AND EXISTS (
    SELECT 1 FROM public.clubs c
    WHERE c.id = club_reading_schedules.club_id
    AND c.creator_id = (SELECT auth.uid())
  )
);
