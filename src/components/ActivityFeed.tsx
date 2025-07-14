import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Heart,
  MessageCircle,
  Share2,
  BookOpen,
  Star,
  Quote,
  Users,
  Trophy,
  TrendingUp,
  Clock,
  Filter,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Activity {
  id: string;
  user_id: string;
  activity_type:
    | "book_added"
    | "book_finished"
    | "review_posted"
    | "quote_shared"
    | "goal_completed"
    | "joined_club";
  related_id: string;
  content: string;
  metadata: any;
  created_at: string;
  user: {
    username: string;
    avatar_url?: string;
  };
}

interface ActivityFeedProps {
  scope?: "global" | "friends" | "user";
  userId?: string;
  limit?: number;
}

export function ActivityFeed({
  scope = "global",
  userId,
  limit = 20,
}: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchActivities();
  }, [scope, userId, filter]);

  const fetchActivities = async (pageNum = 1) => {
    try {
      setLoading(pageNum === 1);

      let query = supabase
        .from("activities")
        .select(
          `
          *,
          profiles:user_id (username, avatar_url)
        `,
        )
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .range((pageNum - 1) * limit, pageNum * limit - 1);

      // Apply scope filters
      if (scope === "user" && userId) {
        query = query.eq("user_id", userId);
      } else if (scope === "friends" && user) {
        // Get friends first, then filter activities
        const { data: friendships } = await supabase
          .from("friendships")
          .select("friend_id")
          .eq("user_id", user.id)
          .eq("status", "accepted");

        const friendIds = friendships?.map((f) => f.friend_id) || [];
        if (friendIds.length > 0) {
          query = query.in("user_id", friendIds);
        } else {
          setActivities([]);
          setLoading(false);
          return;
        }
      }

      // Apply type filters
      if (filter !== "all") {
        query = query.eq("activity_type", filter);
      }

      const { data, error } = await query;

      if (error) throw error;

      const processedActivities =
        data?.map((activity) => ({
          ...activity,
          user: activity.profiles || { username: "Usuário" },
        })) || [];

      if (pageNum === 1) {
        setActivities(processedActivities);
      } else {
        setActivities((prev) => [...prev, ...processedActivities]);
      }

      setHasMore(processedActivities.length === limit);
      setPage(pageNum);
    } catch (error) {
      console.error("Error fetching activities:", error);
      toast({
        title: "Erro ao carregar atividades",
        description: "Não foi possível carregar o feed de atividades.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    fetchActivities(page + 1);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "book_added":
        return <BookOpen className="h-5 w-5 text-blue-500" />;
      case "book_finished":
        return <Trophy className="h-5 w-5 text-green-500" />;
      case "review_posted":
        return <Star className="h-5 w-5 text-yellow-500" />;
      case "quote_shared":
        return <Quote className="h-5 w-5 text-purple-500" />;
      case "goal_completed":
        return <TrendingUp className="h-5 w-5 text-orange-500" />;
      case "joined_club":
        return <Users className="h-5 w-5 text-pink-500" />;
      default:
        return <Sparkles className="h-5 w-5 text-gray-500" />;
    }
  };

  const getActivityTypeLabel = (type: string) => {
    switch (type) {
      case "book_added":
        return "Livro Adicionado";
      case "book_finished":
        return "Livro Finalizado";
      case "review_posted":
        return "Resenha Publicada";
      case "quote_shared":
        return "Citação Compartilhada";
      case "goal_completed":
        return "Meta Alcançada";
      case "joined_club":
        return "Entrou no Clube";
      default:
        return "Atividade";
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return "ontem";
    } else if (diffDays <= 7) {
      return `${diffDays} dias atrás`;
    } else if (diffDays <= 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} semana${weeks > 1 ? "s" : ""} atrás`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderActivityContent = (activity: Activity) => {
    const { metadata } = activity;

    switch (activity.activity_type) {
      case "book_added":
      case "book_finished":
        return (
          <div className="mt-2">
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <BookOpen className="h-4 w-4 text-blue-500" />
              <span className="font-medium text-sm">
                {metadata?.book_title || "Livro"}
              </span>
              {metadata?.author && (
                <span className="text-sm text-muted-foreground">
                  por {metadata.author}
                </span>
              )}
            </div>
          </div>
        );

      case "review_posted":
        return (
          <div className="mt-2">
            <div className="p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      className={`h-3 w-3 ${
                        i < (metadata?.rating || 0)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium">
                  {metadata?.review_title}
                </span>
              </div>
              <p className="text-sm text-gray-600">{metadata?.book_title}</p>
            </div>
          </div>
        );

      case "quote_shared":
        return (
          <div className="mt-2">
            <div className="p-3 bg-purple-50 rounded-lg border-l-4 border-purple-500">
              <blockquote className="text-sm italic text-gray-700">
                "{metadata?.quote_preview || "Citação compartilhada"}"
              </blockquote>
              <p className="text-xs text-muted-foreground mt-1">
                — {metadata?.book_title}
              </p>
            </div>
          </div>
        );

      case "goal_completed":
        return (
          <div className="mt-2">
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
              <Trophy className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">
                {metadata?.goal_type === "books"
                  ? `Meta de ${metadata?.target} livros alcançada!`
                  : `Meta de ${metadata?.target} páginas alcançada!`}
              </span>
            </div>
          </div>
        );

      case "joined_club":
        return (
          <div className="mt-2">
            <div className="flex items-center gap-2 p-3 bg-pink-50 rounded-lg">
              <Users className="h-4 w-4 text-pink-500" />
              <span className="text-sm font-medium">{metadata?.club_name}</span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading && activities.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-16 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {scope === "friends"
                ? "Atividades dos Amigos"
                : scope === "user"
                  ? "Suas Atividades"
                  : "Feed da Comunidade"}
            </div>

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-1 border rounded-md text-sm"
            >
              <option value="all">Todas as atividades</option>
              <option value="book_added">Livros adicionados</option>
              <option value="book_finished">Livros finalizados</option>
              <option value="review_posted">Resenhas</option>
              <option value="quote_shared">Citações</option>
              <option value="goal_completed">Metas alcançadas</option>
              <option value="joined_club">Novos membros</option>
            </select>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {activities.length > 0 ? (
            <>
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={activity.user.avatar_url} />
                    <AvatarFallback>
                      {activity.user.username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getActivityIcon(activity.activity_type)}
                      <span className="font-medium text-sm">
                        {activity.user.username}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {getActivityTypeLabel(activity.activity_type)}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatTimeAgo(activity.created_at)}
                      </div>
                    </div>

                    <p className="text-sm text-gray-700 mb-2">
                      {activity.content}
                    </p>

                    {renderActivityContent(activity)}

                    <div className="flex items-center gap-4 mt-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-muted-foreground"
                      >
                        <Heart className="h-4 w-4 mr-1" />
                        Curtir
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-muted-foreground"
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        Comentar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-muted-foreground"
                      >
                        <Share2 className="h-4 w-4 mr-1" />
                        Compartilhar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {hasMore && (
                <div className="text-center pt-4">
                  <Button
                    variant="outline"
                    onClick={loadMore}
                    disabled={loading}
                  >
                    {loading ? "Carregando..." : "Carregar mais"}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma atividade</h3>
              <p className="text-muted-foreground">
                {scope === "friends"
                  ? "Seus amigos ainda não fizeram atividades recentes."
                  : scope === "user"
                    ? "Você ainda não tem atividades registradas."
                    : "Nenhuma atividade recente na comunidade."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
