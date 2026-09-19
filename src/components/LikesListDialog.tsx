import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

interface Liker {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface LikesListDialogProps {
  postId: string;
  children: React.ReactNode;
}

export function LikesListDialog({ postId, children }: LikesListDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [likers, setLikers] = useState<Liker[]>([]);

  const fetchLikers = async () => {
    setLoading(true);
    try {
      const { data: likes } = await supabase
        .from('post_likes')
        .select('user_id')
        .eq('post_id', postId)
        .order('created_at', { ascending: false });

      const userIds = (likes || []).map((l) => l.user_id);
      if (userIds.length === 0) {
        setLikers([]);
        return;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);

      // Mantém a ordem de quem curtiu mais recentemente.
      const profilesMap = new Map((profiles || []).map((p) => [p.user_id, p]));
      setLikers(userIds.map((id) => profilesMap.get(id)).filter((p): p is Liker => !!p));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (next) fetchLikers(); }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-4 w-4 fill-red-500 text-red-500" />
            Curtidas
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : likers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Ninguém curtiu ainda.
          </p>
        ) : (
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {likers.map((liker) => (
              <Link
                key={liker.user_id}
                to={`/perfil/${liker.user_id}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted"
              >
                <Avatar className="w-8 h-8">
                  <AvatarImage src={liker.avatar_url ?? undefined} />
                  <AvatarFallback>{liker.display_name?.[0] || '?'}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{liker.display_name || 'Usuário'}</span>
              </Link>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
