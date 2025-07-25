-- Remove a restrição de verificação antiga da coluna 'role'
ALTER TABLE public.club_members
DROP CONSTRAINT IF EXISTS club_members_role_check;

-- Adiciona uma nova restrição de verificação que inclui 'admin' como um valor permitido.
ALTER TABLE public.club_members
ADD CONSTRAINT club_members_role_check
CHECK (role IN ('member', 'admin', 'moderator')); -- Adicionamos 'admin' e 'moderator' para flexibilidade futura.
