import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sparkles,
  Star,
  TrendingUp,
  Users,
  BookOpen,
  Loader2,
} from "lucide-react";
import { useRecommendations } from "@/hooks/useRecommendations";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export function RecommendationsSection() {
  const { recommendations, loading, refetch } = useRecommendations();
  const { user } = useAuth();
  const { toast } = useToast();

  const addBookToWantToRead = async (book: any) => {
    if (!user) return;

    try {
      const { error } = await supabase.from("books").insert({
        title: book.title,
        author: book.author,
        genre: book.genre || "Ficção",
        cover_url: book.cover_url,
        description: book.description || "",
        reading_status: "want_to_read",
        reading_progress: 0,
        pages: book.pages || null,
        user_id: user.id,
      });

      if (error) throw error;

      toast({
        title: "Livro adicionado! 📚",
        description: `"${book.title}" foi adicionado à sua lista de desejos`,
      });

      refetch();
    } catch (error) {
      console.error("Error adding book:", error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o livro",
        variant: "destructive",
      });
    }
  };

  const getReasonIcon = (reason: string) => {
    if (reason.includes("amigo") || reason.includes("Recomendado por")) {
      return <Users className="h-4 w-4" />;
    }
    if (reason.includes("Trending")) {
      return <TrendingUp className="h-4 w-4" />;
    }
    if (reason.includes("gosto por")) {
      return <Star className="h-4 w-4" />;
    }
    return <Sparkles className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Recomendações para Você
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Recomendações para Você
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            Adicione e avalie alguns livros para receber recomendações
            personalizadas!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Recomendações para Você
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendations.map((recommendation, index) => (
            <div
              key={`${recommendation.book.id}-${index}`}
              className="border rounded-lg p-4 space-y-3"
            >
              <div className="flex gap-3">
                {recommendation.book.cover_url ? (
                  <img
                    src={recommendation.book.cover_url}
                    alt={recommendation.book.title}
                    className="w-16 h-20 object-cover rounded"
                  />
                ) : (
                  <div className="w-16 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded flex items-center justify-center">
                    <BookOpen className="h-6 w-6 text-purple-600" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm line-clamp-2">
                    {recommendation.book.title}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {recommendation.book.author}
                  </p>
                  {recommendation.book.genre && (
                    <Badge variant="secondary" className="text-xs mt-1">
                      {recommendation.book.genre}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {getReasonIcon(recommendation.reason)}
                <span className="text-xs">{recommendation.reason}</span>
              </div>

              {recommendation.recommendedBy && (
                <div className="flex items-center gap-2">
                  <Avatar className="w-6 h-6">
                    <AvatarImage
                      src={recommendation.recommendedBy.avatar_url || undefined}
                    />
                    <AvatarFallback className="text-xs">
                      {recommendation.recommendedBy.display_name?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground">
                    {recommendation.recommendedBy.display_name}
                  </span>
                </div>
              )}

              <Button
                size="sm"
                className="w-full"
                onClick={() => addBookToWantToRead(recommendation.book)}
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Adicionar à Lista
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
