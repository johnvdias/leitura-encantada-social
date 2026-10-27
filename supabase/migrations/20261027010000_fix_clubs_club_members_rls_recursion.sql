-- A policy de SELECT de `clubs` consultava `club_members` com uma subquery
-- crua (sem passar pela função SECURITY DEFINER já usada pras outras
-- checagens desse tipo). Como a policy de SELECT de `club_members` também
-- consulta `clubs` (via is_club_public), isso formava um ciclo: avaliar
-- clubs -> club_members -> clubs -> club_members..., estourando em
-- "infinite recursion detected in policy for relation club_members" -
-- o que quebrava qualquer operação em club_members que precisasse checar
-- a visibilidade do clube (sair do clube, remover membro).
--
-- Segue o mesmo padrão de is_club_creator/is_approved_club_member/
-- is_club_public: função SECURITY DEFINER que roda com o owner (que tem
-- bypassrls), então a consulta interna não reaplica a RLS da tabela e
-- quebra o ciclo. Sem filtro de status (igual a subquery crua que
-- substitui), pra não mudar quem conseguia ver o clube.
CREATE OR REPLACE FUNCTION public.is_club_member(p_club_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  return exists (
    select 1 from public.club_members
    where club_id = p_club_id and user_id = p_user_id
  );
end;
$function$;

REVOKE ALL ON FUNCTION public.is_club_member(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_club_member(uuid, uuid) TO authenticated, service_role;

ALTER POLICY "Allow view for public, members, and creator" ON public.clubs
USING (
  (is_private = false)
  OR (creator_id = (select auth.uid()))
  OR is_club_member(id, (select auth.uid()))
);
