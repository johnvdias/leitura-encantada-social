import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Star,
  Heart,
  MessageCircle,
  Share2,
  Flag,
  Calendar,
  User,
  ThumbsUp,
  BookOpen,
  Edit3,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Review {
  id: string;
  user_id: string;
  rating: number;
  review_text: string;
  title: string;
  spoiler_warning: boolean;
  tags: string[];
  likes_count: number;
  created_at: string;
  user: {
    username: string;
    avatar_url?: string;
  };
  liked_by_user?: boolean;
}

interface ReviewsSystemProps {
  bookId: string;
  bookTitle: string;
}

export function ReviewsSystem({ bookId, bookTitle }: ReviewsSystemProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [isWritingReview, setIsWritingReview] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [spoilerWarning, setSpoilerWarning] = useState(false);
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchReviews();
  }, [bookId]);

  const fetchReviews = async () => {
    try {
      const { data: reviewsData, error } = await supabase
        .from("reviews")
        .select(
          `
          *,
          profiles:user_id (username, avatar_url)
        `,
        )
        .eq("book_id", bookId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const processedReviews =
        reviewsData?.map((review) => ({
          ...review,
          user: review.profiles || { username: "Usuário", avatar_url: null },
        })) || [];

      setReviews(processedReviews);

      // Check if current user has already reviewed this book
      const currentUserReview = processedReviews.find(
        (r) => r.user_id === user?.id,
      );
      setUserReview(currentUserReview || null);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      toast({
        title: "Erro ao carregar resenhas",
        description: "Não foi possível carregar as resenhas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async () => {
    if (!user || rating === 0) return;

    setSubmitting(true);
    try {
      const reviewData = {
        user_id: user.id,
        book_id: bookId,
        rating,
        review_text: reviewText,
        title: reviewTitle,
        spoiler_warning: spoilerWarning,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0),
      };

      const { error } = await supabase.from("reviews").upsert(reviewData);

      if (error) throw error;

      // Create activity for the feed
      await supabase.from("activities").insert({
        user_id: user.id,
        activity_type: "review_posted",
        related_id: bookId,
        content: `Avaliou "${bookTitle}" com ${rating} estrelas`,
        metadata: {
          book_title: bookTitle,
          rating,
          review_title: reviewTitle,
        },
      });

      toast({
        title: "Resenha publicada!",
        description: "Sua resenha foi publicada com sucesso.",
      });

      setIsWritingReview(false);
      resetForm();
      fetchReviews();
    } catch (error) {
      console.error("Error submitting review:", error);
      toast({
        title: "Erro ao publicar resenha",
        description: "Não foi possível publicar sua resenha.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const likeReview = async (reviewId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.from("review_likes").upsert({
        user_id: user.id,
        review_id: reviewId,
      });

      if (error) throw error;

      // Update likes count
      await supabase.rpc("increment_review_likes", { review_id: reviewId });

      fetchReviews();
    } catch (error) {
      console.error("Error liking review:", error);
    }
  };

  const resetForm = () => {
    setRating(0);
    setReviewTitle("");
    setReviewText("");
    setSpoilerWarning(false);
    setTags("");
  };

  const renderStars = (currentRating: number, interactive = false) => {
    return Array.from({ length: 5 }, (_, index) => {
      const starValue = index + 1;
      return (
        <Star
          key={index}
          className={`h-5 w-5 cursor-pointer transition-colors ${
            starValue <= (interactive ? hoverRating || rating : currentRating)
              ? "fill-yellow-400 text-yellow-400"
              : "text-gray-300"
          }`}
          onClick={() => interactive && setRating(starValue)}
          onMouseEnter={() => interactive && setHoverRating(starValue)}
          onMouseLeave={() => interactive && setHoverRating(0)}
        />
      );
    });
  };

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-400" />
            Avaliações e Resenhas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="text-center">
              <div className="text-3xl font-bold">
                {averageRating.toFixed(1)}
              </div>
              <div className="flex">
                {renderStars(Math.round(averageRating))}
              </div>
              <div className="text-sm text-muted-foreground">
                {reviews.length} avaliações
              </div>
            </div>

            <div className="flex-1">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = reviews.filter((r) => r.rating === stars).length;
                const percentage =
                  reviews.length > 0 ? (count / reviews.length) * 100 : 0;

                return (
                  <div key={stars} className="flex items-center gap-2 text-sm">
                    <span className="w-8">{stars}★</span>
                    <div className="flex-1 h-2 bg-gray-200 rounded overflow-hidden">
                      <div
                        className="h-full bg-yellow-400 transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {user && !userReview && (
            <Button onClick={() => setIsWritingReview(true)} className="w-full">
              <Edit3 className="h-4 w-4 mr-2" />
              Escrever Resenha
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Write Review Form */}
      {isWritingReview && (
        <Card>
          <CardHeader>
            <CardTitle>Nova Resenha</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Avaliação
              </label>
              <div className="flex gap-1">{renderStars(rating, true)}</div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Título da Resenha
              </label>
              <Input
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                placeholder="Dê um título para sua resenha..."
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Resenha</label>
              <Textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Compartilhe sua opinião sobre o livro..."
                className="min-h-32"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Tags (separadas por vírgula)
              </label>
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="romance, ficção, página-turner..."
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="spoiler"
                checked={spoilerWarning}
                onChange={(e) => setSpoilerWarning(e.target.checked)}
              />
              <label htmlFor="spoiler" className="text-sm">
                Contém spoilers
              </label>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={submitReview}
                disabled={submitting || rating === 0}
              >
                {submitting ? "Publicando..." : "Publicar Resenha"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsWritingReview(false);
                  resetForm();
                }}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* User's Review */}
      {userReview && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800">Sua Resenha</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3">
              <Avatar>
                <AvatarImage src={userReview.user.avatar_url} />
                <AvatarFallback>
                  {userReview.user.username?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium">
                    {userReview.user.username}
                  </span>
                  <div className="flex">{renderStars(userReview.rating)}</div>
                  <span className="text-sm text-muted-foreground">
                    {new Date(userReview.created_at).toLocaleDateString()}
                  </span>
                </div>

                {userReview.title && (
                  <h4 className="font-semibold mb-2">{userReview.title}</h4>
                )}

                {userReview.spoiler_warning && (
                  <Badge variant="destructive" className="mb-2">
                    ⚠️ Contém Spoilers
                  </Badge>
                )}

                <p className="text-sm mb-3">{userReview.review_text}</p>

                {userReview.tags && userReview.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {userReview.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Other Reviews */}
      <div className="space-y-4">
        {reviews
          .filter((r) => r.user_id !== user?.id)
          .map((review) => (
            <Card key={review.id}>
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <Avatar>
                    <AvatarImage src={review.user.avatar_url} />
                    <AvatarFallback>
                      {review.user.username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">
                        {review.user.username}
                      </span>
                      <div className="flex">{renderStars(review.rating)}</div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {review.title && (
                      <h4 className="font-semibold mb-2">{review.title}</h4>
                    )}

                    {review.spoiler_warning && (
                      <Badge variant="destructive" className="mb-2">
                        ⚠️ Contém Spoilers
                      </Badge>
                    )}

                    <p className="text-sm mb-3">{review.review_text}</p>

                    {review.tags && review.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {review.tags.map((tag, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => likeReview(review.id)}
                        className="h-8 px-2"
                      >
                        <ThumbsUp className="h-4 w-4 mr-1" />
                        {review.likes_count}
                      </Button>

                      <Button variant="ghost" size="sm" className="h-8 px-2">
                        <MessageCircle className="h-4 w-4 mr-1" />
                        Comentar
                      </Button>

                      <Button variant="ghost" size="sm" className="h-8 px-2">
                        <Share2 className="h-4 w-4 mr-1" />
                        Compartilhar
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      {reviews.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">
              Nenhuma resenha ainda
            </h3>
            <p className="text-muted-foreground mb-4">
              Seja o primeiro a compartilhar sua opinião sobre este livro!
            </p>
            {user && (
              <Button onClick={() => setIsWritingReview(true)}>
                Escrever Primeira Resenha
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
