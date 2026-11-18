-- A UI de avaliação (BookCard.handleRate) permite meia-estrela: o primeiro
-- clique na 1ª estrela salva rating = 0.5. A restrição antiga só aceitava
-- de 1 a 5, então essa primeira meia-estrela sempre quebrava com erro -
-- reproduzido por mais de uma usuária.
ALTER TABLE public.books DROP CONSTRAINT books_rating_check;
ALTER TABLE public.books ADD CONSTRAINT books_rating_check CHECK (rating >= 0.5 AND rating <= 5);
