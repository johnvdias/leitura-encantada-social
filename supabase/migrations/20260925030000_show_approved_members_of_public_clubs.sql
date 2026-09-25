-- A lista de clubes (Clubes.tsx) busca o número de membros via um join
-- embutido em club_members, sem filtro de status - e depende inteiramente
-- do RLS pra decidir quais linhas voltam. Só que quem ainda não é membro
-- (o caso comum ao navegar por clubes públicos pra descobrir um pra
-- entrar) não enxergava NENHUMA linha de club_members de outra usuária,
-- então todo clube público aparecia com "0 membros" pra quem não fez
-- parte dele ainda.
--
-- Usa uma função SECURITY DEFINER (mesmo padrão de is_club_creator /
-- is_approved_club_member) em vez de uma subquery direta em `clubs`,
-- porque a própria política de SELECT de `clubs` consulta `club_members`
-- de volta - uma subquery direta nas duas tabelas causa recursão infinita.
CREATE OR REPLACE FUNCTION public.is_club_public(p_club_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  return exists (
    select 1 from public.clubs
    where id = p_club_id and is_private = false
  );
end;
$function$;

CREATE POLICY "Approved members of public clubs are visible to everyone"
ON public.club_members
FOR SELECT
USING (
  status = 'approved'
  AND public.is_club_public(club_id)
);
