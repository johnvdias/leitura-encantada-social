-- Permite responder a um comentário específico (like Instagram/Facebook):
-- um comentário-resposta aponta pro comentário-pai via parent_comment_id.
-- Nulo = comentário de nível superior (comportamento atual, sem quebrar
-- nada existente). ON DELETE CASCADE: apagar o comentário-pai remove as
-- respostas junto, evitando resposta órfã apontando pra um id inexistente.
ALTER TABLE public.post_comments
  ADD COLUMN parent_comment_id uuid REFERENCES public.post_comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS post_comments_parent_comment_id_idx
  ON public.post_comments (parent_comment_id);
