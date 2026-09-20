-- Mensagens diretas 1:1 entre amigas aceitas (mesma barreira de privacidade
-- já usada pra ver a estante de uma amiga: só quem é amiga aceita pode
-- iniciar conversa).
create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint direct_messages_not_self check (sender_id <> recipient_id)
);

create index if not exists direct_messages_sender_recipient_idx
  on public.direct_messages(sender_id, recipient_id, created_at);
create index if not exists direct_messages_recipient_sender_idx
  on public.direct_messages(recipient_id, sender_id, created_at);

alter table public.direct_messages enable row level security;

create policy "Users can view their own conversations"
on public.direct_messages for select
using (auth.uid() = sender_id or auth.uid() = recipient_id);

create policy "Friends can send direct messages"
on public.direct_messages for insert
with check (
  auth.uid() = sender_id
  and exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and (
        (f.requester_id = auth.uid() and f.addressee_id = recipient_id)
        or (f.addressee_id = auth.uid() and f.requester_id = recipient_id)
      )
  )
);

create policy "Recipient can mark messages as read"
on public.direct_messages for update
using (auth.uid() = recipient_id)
with check (auth.uid() = recipient_id);

create policy "Sender can delete their own messages"
on public.direct_messages for delete
using (auth.uid() = sender_id);

-- Só o campo read_at pode mudar num update (evita a destinatária reescrever
-- o conteúdo de uma mensagem que recebeu).
create or replace function public.enforce_direct_message_read_only_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.sender_id <> old.sender_id
     or new.recipient_id <> old.recipient_id
     or new.content <> old.content
     or new.created_at <> old.created_at then
    raise exception 'Só é permitido atualizar o status de leitura da mensagem.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_direct_message_read_only_update on public.direct_messages;
create trigger trg_enforce_direct_message_read_only_update
before update on public.direct_messages
for each row execute function public.enforce_direct_message_read_only_update();

revoke execute on function public.enforce_direct_message_read_only_update() from public, anon, authenticated;

alter publication supabase_realtime add table public.direct_messages;

-- Nova categoria de notificação ("messages"), ativa por padrão.
alter table public.profiles
  alter column notification_preferences set default
    '{"likes": true, "comments": true, "friends": true, "nudges": true, "achievements": true, "loans": true, "messages": true}'::jsonb;

update public.profiles
  set notification_preferences = notification_preferences || '{"messages": true}'::jsonb
  where not (notification_preferences ? 'messages');
