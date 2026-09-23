-- Remove a função de empréstimo de livros entre usuárias, que não vai
-- ser usada. Primeiro tira as cláusulas de loan_request/loan_response
-- da política de notifications (ela consulta book_loans, então precisa
-- parar de referenciar a tabela antes dela ser removida). Depois
-- remove a tabela book_loans (0 linhas, sem perda de dado real).

drop policy if exists "Users can create legitimate notifications" on public.notifications;
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
    else false
  end
);

drop table if exists public.book_loans;

-- Tira "loans" das preferências de notificação salvas (chave morta,
-- mas mantém o perfil limpo).
update public.profiles
  set notification_preferences = notification_preferences - 'loans'
  where notification_preferences ? 'loans';

alter table public.profiles
  alter column notification_preferences set default
    '{"likes": true, "comments": true, "friends": true, "nudges": true, "achievements": true, "messages": true}'::jsonb;
