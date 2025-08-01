-- Remove as colunas 'status' e 'role' para restaurar a tabela 'club_members' ao seu estado original.
-- Esta migração de reversão garante a estabilidade do banco de dados.

ALTER TABLE public.club_members
DROP COLUMN IF EXISTS status;

ALTER TABLE public.club_members
DROP COLUMN IF EXISTS role;
