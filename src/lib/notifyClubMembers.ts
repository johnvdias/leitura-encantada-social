import { supabase } from "@/integrations/supabase/client";
import { shouldNotify } from "@/lib/notificationPreferences";

interface NotifyClubMembersParams {
  clubId: string;
  excludeUserId: string;
  type: string;
  title: string;
  content: string;
  relatedId: string;
}

// Mesmo padrão de notifyFriendsGoalReached: insere a notificação in-app
// (que também autoriza o push via RLS, ver send-push-notification) e dispara
// o push em paralelo, sem bloquear a UI - notificar é best-effort. Usado por
// toda atividade do clube (post, discussão, sorteio/votação, cronograma).
export const notifyClubMembers = async ({
  clubId,
  excludeUserId,
  type,
  title,
  content,
  relatedId,
}: NotifyClubMembersParams) => {
  // A criadora nem sempre tem uma linha própria em club_members (ver RLS de
  // club_book_polls, que trata "c.creator_id = auth.uid() OR membro
  // aprovado" como casos distintos) - busca os dois em paralelo pra não
  // deixar a criadora de fora da notificação.
  const [{ data: club }, { data: members }] = await Promise.all([
    supabase.from('clubs').select('creator_id').eq('id', clubId).maybeSingle(),
    supabase.from('club_members').select('user_id').eq('club_id', clubId).eq('status', 'approved'),
  ]);

  const recipientIds = new Set<string>((members || []).map((m) => m.user_id));
  if (club?.creator_id) recipientIds.add(club.creator_id);
  recipientIds.delete(excludeUserId);

  if (recipientIds.size === 0) return;

  for (const userId of recipientIds) {
    if (!(await shouldNotify(userId, 'clubs'))) continue;

    await supabase.from('notifications').insert({
      user_id: userId,
      type,
      title,
      content,
      related_id: relatedId,
    });

    supabase.functions
      .invoke('send-push-notification', {
        body: {
          targetUserId: userId,
          type,
          relatedId,
          tag: `${type}-${clubId}`,
        },
      })
      .catch(() => {
        // Push é best-effort; a notificação in-app já foi salva.
      });
  }
};
