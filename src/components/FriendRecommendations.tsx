import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useFriendships } from "@/hooks/useFriendships";
import { supabase } from "@/integrations/supabase/client";

interface Recommendation {
  title: string;
  author: string;
  cover_url: string | null;
  avgRating: number;
  recommenders: { user_id: string; display_name: string | null; avatar_url: string | null }[];
}

const normalize = (s: string) => s.trim().toLowerCase();

export function FriendRecommendations() {
  const { user } = useAuth();
  const { friends, loading: friendsLoading } = useFriendships();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecommendations = useCallback(async () => {
    if (!user || friends.length === 0) {
      setRecommendations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const friendIds = friends.map((f) => f.friend.user_id);

      const { data: friendBooks, error } = await supabase
        .from('books')
        .select('user_id, title, author, cover_url, rating')
        .in('user_id', friendIds)
        .eq('reading_status', 'completed')
        .gte('rating', 4);

      if (error) throw error;

      const { data: myBooks } = await supabase
        .from('books')
        .select('title, author')
        .eq('user_id', user.id);

      const myBookKeys = new Set((myBooks || []).map((b) => `${normalize(b.title)}|${normalize(b.author)}`));
      const friendProfileMap = new Map(friends.map((f) => [f.friend.user_id, f.friend]));

      const grouped = new Map<string, Recommendation>();
      (friendBooks || []).forEach((book) => {
        const key = `${normalize(book.title)}|${normalize(book.author)}`;
        if (myBookKeys.has(key)) return;

        const friendProfile = friendProfileMap.get(book.user_id);
        if (!friendProfile) return;

        const existing = grouped.get(key);
        if (existing) {
          existing.recommenders.push({
            user_id: book.user_id,
            display_name: friendProfile.display_name,
            avatar_url: friendProfile.avatar_url,
          });
          existing.avgRating =
            (existing.avgRating * (existing.recommenders.length - 1) + (book.rating || 0)) /
            existing.recommenders.length;
          if (!existing.cover_url && book.cover_url) existing.cover_url = book.cover_url;
        } else {
          grouped.set(key, {
            title: book.title,
            author: book.author,
            cover_url: book.cover_url,
            avgRating: book.rating || 0,
            recommenders: [
              { user_id: book.user_id, display_name: friendProfile.display_name, avatar_url: friendProfile.avatar_url },
            ],
          });
        }
      });

      const sorted = Array.from(grouped.values())
        .sort((a, b) => b.recommenders.length - a.recommenders.length || b.avgRating - a.avgRating)
        .slice(0, 8);

      setRecommendations(sorted);
    } catch (error) {
      console.error('Error fetching friend recommendations:', error);
    } finally {
      setLoading(false);
    }
  }, [user, friends]);

  useEffect(() => {
    if (!friendsLoading) fetchRecommendations();
  }, [friendsLoading, fetchRecommendations]);

  if (friendsLoading || loading || recommendations.length === 0) return null;

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Recomendado por amigas
        </CardTitle>
        <CardDescription>Livros bem avaliados por quem você segue, que ainda não estão na sua estante</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {recommendations.map((rec) => (
            <div key={`${rec.title}|${rec.author}`} className="flex gap-3">
              <img
                src={rec.cover_url || '/placeholder.svg'}
                alt={rec.title}
                className="h-24 w-16 object-cover rounded shrink-0"
              />
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate" title={rec.title}>{rec.title}</p>
                <p className="text-xs text-muted-foreground truncate">{rec.author}</p>
                <div className="flex items-center gap-0.5 mt-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3 w-3 ${i < Math.round(rec.avgRating) ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`}
                    />
                  ))}
                </div>
                <div className="flex items-center -space-x-2 mt-2">
                  {rec.recommenders.slice(0, 4).map((r) => (
                    <Avatar key={r.user_id} className="h-5 w-5 border border-background">
                      <AvatarImage src={r.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px]">{r.display_name?.charAt(0) || '?'}</AvatarFallback>
                    </Avatar>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
