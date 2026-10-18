-- Permite avaliações com meia estrela (ex: 4.5). O CHECK existente
-- (rating >= 1 AND rating <= 5) continua válido para valores fracionários.
ALTER TABLE public.books ALTER COLUMN rating TYPE numeric(2,1);
