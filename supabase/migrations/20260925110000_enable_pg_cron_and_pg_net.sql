-- Primeira infraestrutura de job agendado do projeto: pg_cron pra disparar
-- jobs periódicos e pg_net pra poder chamar edge functions via HTTP a
-- partir deles (usado pelos lembretes de meta diária).
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
