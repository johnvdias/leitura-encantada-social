-- Remove a política de visualização de livros antiga para substituí-la.
DROP POLICY IF EXISTS "Users can view their own books" ON public.books;

-- Cria uma nova política que permite a visualização de livros próprios E de amigos.
CREATE POLICY "Users can view their own books and friends books" 
ON public.books
FOR SELECT 
USING (
  -- O usuário pode ver seus próprios livros.
  auth.uid() = user_id
  OR
  -- O usuário pode ver os livros de um amigo.
  EXISTS (
    SELECT 1
    FROM public.friendships
    WHERE
      status = 'accepted' AND
      (
        (requester_id = auth.uid() AND addressee_id = books.user_id) OR
        (addressee_id = auth.uid() AND requester_id = books.user_id)
      )
  )
);

-- Comentário para documentar a nova lógica da política.
COMMENT ON POLICY "Users can view their own books and friends books" ON public.books 
IS 'Permite que usuários vejam seus próprios livros ou os livros de usuários com quem eles têm uma amizade aceita.';
