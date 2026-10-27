-- Sair do clube ou ser removida não limpava a inscrição da pessoa nos
-- cronogramas do clube (club_schedule_participants), então ela continuava
-- aparecendo no progresso do cronograma mesmo depois de deixar de ser
-- integrante. Gatilho garante essa limpeza pra qualquer caminho que apague
-- de club_members (remoção pela administradora ou "Sair do clube"), em vez
-- de depender de cada tela lembrar de fazer isso.
CREATE OR REPLACE FUNCTION public.cleanup_club_schedule_participants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  delete from public.club_schedule_participants csp
  using public.club_reading_schedules crs
  where csp.club_schedule_id = crs.id
    and crs.club_id = old.club_id
    and csp.user_id = old.user_id;
  return old;
end;
$function$;

REVOKE ALL ON FUNCTION public.cleanup_club_schedule_participants() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_cleanup_club_schedule_participants ON public.club_members;
CREATE TRIGGER trg_cleanup_club_schedule_participants
AFTER DELETE ON public.club_members
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_club_schedule_participants();

-- Limpa o registro que já ficou órfão (Milla Martins removida do clube
-- "Estante Encantada" mas ainda inscrita no cronograma "Os Arcanos").
DELETE FROM public.club_schedule_participants csp
USING public.club_reading_schedules crs
WHERE csp.club_schedule_id = crs.id
  AND NOT EXISTS (
    SELECT 1 FROM public.club_members cm
    WHERE cm.club_id = crs.club_id AND cm.user_id = csp.user_id
  );
