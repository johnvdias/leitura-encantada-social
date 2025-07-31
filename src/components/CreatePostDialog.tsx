
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Sparkles, BookOpen, Heart, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import React from "react";

interface CreatePostDialogProps {
  onPostCreated?: () => void;
  bookId?: string;
  children: React.ReactNode;
}

type PostType = "general" | "progress" | "review" | "recommendation";
type Visibility = "public" | "friends" | "private";

export const CreatePostDialog = ({
  onPostCreated,
  bookId,
  children,
}: CreatePostDialogProps) => {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState<PostType>("general");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!user || !content.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        book_id: bookId,
        content: content.trim(),
        post_type: postType,
        visibility,
      });

      if (error) throw error;

      toast({
        title: "Post compartilhado! ✨",
        description: "Sua experiência foi compartilhada com a comunidade",
      });

      setContent("");
      setPostType("general");
      setVisibility("public");
      setOpen(false);
      onPostCreated?.();
    } catch (error) {
      console.error("Error creating post:", error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o post",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Compartilhar Experiência
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="post-type">Tipo de Post</Label>
            <Select
              value={postType}
              onValueChange={(value: PostType) => setPostType(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Geral
                  </div>
                </SelectItem>
                <SelectItem value="progress">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Progresso de Leitura
                  </div>
                </SelectItem>
                <SelectItem value="review">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4" />
                    Resenha
                  </div>
                </SelectItem>
                <SelectItem value="recommendation">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />
                    Recomendação
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="visibility">Privacidade</Label>
            <Select
              value={visibility}
              onValueChange={(value: Visibility) => setVisibility(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Quem pode ver?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">🌍 Público</SelectItem>
                <SelectItem value="friends">👥 Apenas Amigas</SelectItem>
                <SelectItem value="private">🔒 Privado (só eu)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Compartilhe sua experiência</Label>
            <Textarea
              id="content"
              placeholder="O que você está sentindo sobre este livro? Compartilhe suas emoções, descobertas ou reflexões..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSubmit}
              disabled={loading || !content.trim()}
              className="btn-enchanted flex-1"
            >
              {loading ? "Compartilhando..." : "Compartilhar"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
