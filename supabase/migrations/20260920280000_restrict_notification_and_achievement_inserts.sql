-- notifications e achievements tinham INSERT liberado pra QUALQUER
-- usuária autenticada criar uma linha com QUALQUER user_id (with_check
-- true) - ou seja, dava pra mandar notificação falsa/spam (ex: "fulana
-- quer ser sua amiga", "nova mensagem de X") pra qualquer pessoa, ou
-- plantar uma conquista falsa no perfil de outra pessoa, sem nenhuma
-- validação além do que o app faz no cliente (que não é confiável).
--
-- achievements: só é inserida pelo próprio dono (auth.uid() = user_id),
-- então a regra fica exatamente isso.
--
-- notifications: cada tipo já tem uma relação real que justifica a
-- notificação (amizade aceita/pendente, curtida/comentário num post que
-- a pessoa é dona, empréstimo entre as duas partes) - a política valida
-- que essa relação realmente existe em vez de confiar no que o cliente
-- manda.
drop policy if exists "System can create achievements" on public.achievements;
create policy "Users can create their own achievements"
on public.achievements for insert
with check (auth.uid() = user_id);

drop policy if exists "System can create notifications" on public.notifications;
create policy "Users can create legitimate notifications"
on public.notifications for insert
with check (
  case type
    when 'achievement' then auth.uid() = user_id
    when 'friend_request' then exists (
      select 1 from public.friendships
      where requester_id = auth.uid() and addressee_id = notifications.user_id and status = 'pending'
    )
    when 'friend_accepted' then exists (
      select 1 from public.friendships
      where status = 'accepted'
        and ((requester_id = auth.uid() and addressee_id = notifications.user_id)
          or (addressee_id = auth.uid() and requester_id = notifications.user_id))
    )
    when 'nudge' then exists (
      select 1 from public.friendships
      where status = 'accepted'
        and ((requester_id = auth.uid() and addressee_id = notifications.user_id)
          or (addressee_id = auth.uid() and requester_id = notifications.user_id))
    )
    when 'message' then exists (
      select 1 from public.friendships
      where status = 'accepted'
        and ((requester_id = auth.uid() and addressee_id = notifications.user_id)
          or (addressee_id = auth.uid() and requester_id = notifications.user_id))
    )
    when 'like' then exists (
      select 1 from public.posts p
      join public.post_likes pl on pl.post_id = p.id
      where p.id = notifications.related_id
        and p.user_id = notifications.user_id
        and pl.user_id = auth.uid()
    )
    when 'comment' then exists (
      select 1 from public.posts p
      join public.post_comments pc on pc.post_id = p.id
      where p.id = notifications.related_id
        and p.user_id = notifications.user_id
        and pc.user_id = auth.uid()
    )
    when 'mention' then exists (
      select 1 from public.post_comments pc
      where pc.post_id = notifications.related_id
        and pc.user_id = auth.uid()
    )
    when 'loan_request' then exists (
      select 1 from public.book_loans bl
      where bl.id = notifications.related_id
        and bl.borrower_id = auth.uid()
        and bl.owner_id = notifications.user_id
    )
    when 'loan_response' then exists (
      select 1 from public.book_loans bl
      where bl.id = notifications.related_id
        and bl.owner_id = auth.uid()
        and bl.borrower_id = notifications.user_id
    )
    else false
  end
);
