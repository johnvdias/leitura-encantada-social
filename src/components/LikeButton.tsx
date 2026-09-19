
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLikes } from "@/hooks/useLikes";
import { cn } from "@/lib/utils";
import { LikesListDialog } from "@/components/LikesListDialog";

interface LikeButtonProps {
  postId: string;
  className?: string;
}

export function LikeButton({ postId, className }: LikeButtonProps) {
  const { isLiked, likesCount, loading, toggleLike } = useLikes(postId);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleLike}
        disabled={loading}
        className="flex items-center gap-1"
      >
        <Heart
          className={cn(
            "h-4 w-4",
            isLiked ? "fill-red-500 text-red-500" : "text-muted-foreground"
          )}
        />
      </Button>
      {likesCount > 0 && (
        <LikesListDialog postId={postId}>
          <button type="button" className="text-sm text-muted-foreground hover:underline">
            {likesCount}
          </button>
        </LikesListDialog>
      )}
    </div>
  );
}
