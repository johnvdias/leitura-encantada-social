import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, Calendar, Pencil, Save, X, MessageSquare, Share2 } from "lucide-react";
import { StarRating } from "@/components/StarRating";
import { CreatePostDialog } from "@/components/CreatePostDialog";
import { EditBookDialog } from "@/components/EditBookDialog";
import { UpdateProgressDialog } from "@/components/UpdateProgressDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface BookCardProps {
  id: string;
  title: string;
  author: string;
  cover?: string;
  progress: number;
  status: 'reading' | 'completed' | 'want_to_read';
  genre: string;
  rating?: number;
  currentPage?: number;
  totalPages?: number;
  lastRead?: string;
  description: string;
  personalNotes?: string;
  tags?: string[];
  onUpdate?: () => void;
}

const BookCard = ({
  id, title, author, cover, progress, status, genre, rating,
  currentPage, totalPages, lastRead, description, personalNotes, tags, onUpdate
}: BookCardProps) => {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notes, setNotes] = useState(personalNotes || "");
  const [bookRating, setBookRating] = useState(rating || 0);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'reading': return 'bg-primary/20 text-primary';
      case 'completed': return 'bg-green-500/20 text-green-700 dark:text-green-300';
      case 'want_to_read': return 'bg-secondary/20 text-secondary-foreground';
      default: return 'bg-muted/20 text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'reading': return 'Lendo';
      case 'completed': return 'Lido';
      case 'want_to_read': return 'Quero Ler';
      default: return status;
    }
  };

  const handleSaveNotes = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('books')
        .update({ 
          personal_notes: notes.trim() || null,
          rating: bookRating || null
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Notas salvas! 📝",
        description: "Suas anotações pessoais foram atualizadas",
      });

      setIsEditingNotes(false);
      onUpdate?.();
    } catch (error) {
      console.error('Error saving notes:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as notas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const cancelEditNotes = () => {
    setNotes(personalNotes || "");
    setBookRating(rating || 0);
    setIsEditingNotes(false);
  };

  return (
    <Card className="card-enchanted hover-float">
      <CardContent className="p-6">
        <div className="flex gap-4">
          <div className="w-16 h-24 bg-muted rounded-lg flex-shrink-0 overflow-hidden">
            {cover ? (
              <img src={cover} alt={title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-lg leading-tight truncate" title={title}>
                  {title}
                </h3>
                <p className="text-muted-foreground text-sm mb-2">por {author}</p>
              </div>
              <Badge className={getStatusColor(status)}>
                {getStatusLabel(status)}
              </Badge>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-2 mb-3">
              <StarRating 
                rating={bookRating} 
                onRatingChange={setBookRating}
                readonly={!isEditingNotes}
                size="sm"
              />
              {bookRating > 0 && (
                <span className="text-sm text-muted-foreground">({bookRating}/5)</span>
              )}
            </div>

            {/* Progress */}
            {status === 'reading' && (
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Progresso</span>
                  <span className="text-sm text-muted-foreground">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                {currentPage && totalPages && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Página {currentPage} de {totalPages}
                  </p>
                )}
                {lastRead && (
                  <div className="flex items-center gap-1 mt-2">
                    <Calendar className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Última leitura: {lastRead}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Tags */}
            {tags && tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Personal Notes */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-1">
                  <MessageSquare className="w-4 h-4" />
                  Minhas Notas
                </span>
                {!isEditingNotes ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingNotes(true)}
                  >
                    <Pencil className="w-3 h-3 mr-1" />
                    Editar
                  </Button>
                ) : (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSaveNotes}
                      disabled={loading}
                    >
                      <Save className="w-3 h-3 mr-1" />
                      Salvar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={cancelEditNotes}
                      disabled={loading}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
              
              {isEditingNotes ? (
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Suas reflexões, citações favoritas ou anotações sobre este livro..."
                  className="text-sm resize-none"
                  rows={3}
                />
              ) : (
                <p className="text-sm text-muted-foreground bg-muted/30 rounded p-2 min-h-[60px]">
                  {personalNotes || "Clique em 'Editar' para adicionar suas anotações pessoais sobre este livro."}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {status === 'reading' && (
                <UpdateProgressDialog 
                  bookId={id}
                  title={title}
                  currentPage={currentPage || 0}
                  totalPages={totalPages || 0}
                  currentProgress={progress}
                  onProgressUpdate={onUpdate || (() => {})}
                >
                  <Button variant="outline" size="sm">
                    📖 Atualizar Progresso
                  </Button>
                </UpdateProgressDialog>
              )}
              <EditBookDialog 
                bookId={id}
                title={title}
                author={author}
                pages={totalPages}
                genre={genre}
                description={description}
                status={status}
                onBookUpdated={onUpdate || (() => {})}
              />
              <CreatePostDialog bookId={id} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BookCard;
