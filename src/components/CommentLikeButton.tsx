import { Heart } from "lucide-react";
import { useCommentLikes } from "@/hooks/useCommentLikes";
import { cn } from "@/lib/utils";

interface CommentLikeButtonProps {
  commentId: string;
}

export function CommentLikeButton({ commentId }: CommentLikeButtonProps) {
  const { isLiked, likesCount, loading, toggleLike } = useCommentLikes(commentId);

  return (
    <button
      type="button"
      onClick={toggleLike}
      disabled={loading}
      className="flex items-center gap-1 font-medium hover:text-foreground"
    >
      <Heart className={cn("h-3 w-3", isLiked ? "fill-red-500 text-red-500" : "")} />
      {likesCount > 0 && likesCount}
    </button>
  );
}
