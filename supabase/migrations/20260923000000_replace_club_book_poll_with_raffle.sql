-- Troca o sistema de votação do próximo livro do clube por sorteio:
-- a criadora ainda propõe as opções, mas a escolhida agora é sorteada
-- aleatoriamente em vez de votada. club_book_poll_votes fica sem uso
-- (0 linhas) - remove a tabela por completo.
drop table if exists public.club_book_poll_votes;
