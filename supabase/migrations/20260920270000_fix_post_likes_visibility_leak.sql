-- post_likes tinha SELECT liberado pra QUALQUER UM (using true, sem
-- checar nem login), então dava pra ver quem curtiu um post privado ou
-- só-para-amigos mesmo sem ter acesso ao post em si. post_comments já
-- seguia a regra certa (mesma visibilidade do post); post_likes só não
-- tinha sido corrigido junto.
drop policy if exists "Users can view all likes" on public.post_likes;

create policy "Users can view likes on visible posts"
on public.post_likes for select
using (
  exists (
    select 1 from public.posts
    where posts.id = post_likes.post_id
      and (
        posts.visibility = 'public'
        or posts.user_id = auth.uid()
        or (
          posts.visibility = 'friends'
          and exists (
            select 1 from public.friendships
            where friendships.status = 'accepted'
              and (
                (friendships.requester_id = auth.uid() and friendships.addressee_id = posts.user_id)
                or (friendships.addressee_id = auth.uid() and friendships.requester_id = posts.user_id)
              )
          )
        )
      )
  )
);
