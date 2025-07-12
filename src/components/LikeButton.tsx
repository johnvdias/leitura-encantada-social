
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLikes } from "@/hooks/useLikes";
import { cn } from "@/lib/utils";

interface LikeButtonProps {
  postId: string;
  className?: string;
}

export function LikeButton({ postId, className }: LikeButtonProps) {
  const { isLiked, likesCount, loading, toggleLike } = useLikes(postId);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLike}
      disabled={loading}
      className={cn("flex items-center gap-1", className)}
    >
      <Heart 
        className={cn(
          "h-4 w-4",
          isLiked ? "fill-red-500 text-red-500" : "text-muted-foreground"
        )} 
      />
      <span className="text-sm">
        {likesCount > 0 ? likesCount : ""}
      </span>
    </Button>
  );
}
