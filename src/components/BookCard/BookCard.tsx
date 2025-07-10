import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share, BookOpen, Star, Clock } from "lucide-react";
import { UpdateProgressDialog } from "@/components/UpdateProgressDialog";
import { ReadingStats } from "@/components/ReadingStats";
import { useState } from "react";

interface BookCardProps {
  id: string;
  title: string;
  author: string;
  cover?: string;
  progress: number;
  status: 'reading' | 'completed' | 'want-to-read';
  genre: string;
  rating?: number;
  currentPage?: number;
  totalPages?: number;
  lastRead?: string;
  onUpdate?: () => void;
}

const BookCard = ({ 
  id,
  title, 
  author, 
  cover, 
  progress, 
  status, 
  genre, 
  rating, 
  currentPage = 0, 
  totalPages = 0,
  lastRead,
  onUpdate 
}: BookCardProps) => {
  const [showStats, setShowStats] = useState(false);
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'reading': return 'bg-primary/20 text-primary';
      case 'completed': return 'bg-accent/20 text-accent-foreground';
      case 'want-to-read': return 'bg-secondary/20 text-secondary-foreground';
      default: return 'bg-muted/20 text-muted-foreground';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'reading': return 'Lendo';
      case 'completed': return 'Lido';
      case 'want-to-read': return 'Quero Ler';
      default: return status;
    }
  };

  return (
    <div className="card-enchanted max-w-sm">
      <div className="flex gap-4">
        {/* Book Cover */}
        <div className="flex-shrink-0">
          <div className="w-20 h-28 bg-gradient-enchanted rounded-lg shadow-md flex items-center justify-center overflow-hidden">
            {cover ? (
              <img src={cover} alt={title} className="w-full h-full object-cover" />
            ) : (
              <BookOpen className="w-8 h-8 text-white/80" />
            )}
          </div>
        </div>
        
        {/* Book Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-foreground truncate mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground truncate">por {author}</p>
            </div>
            <Badge className={`ml-2 text-xs ${getStatusColor(status)}`}>
              {getStatusText(status)}
            </Badge>
          </div>
          
          <div className="space-y-3">
            {/* Genre */}
            <Badge variant="outline" className="text-xs">
              {genre}
            </Badge>
            
            {/* Progress Bar */}
            {status === 'reading' && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progresso</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                {currentPage && totalPages && (
                  <p className="text-xs text-muted-foreground">
                    Página {currentPage} de {totalPages}
                  </p>
                )}
              </div>
            )}
            
            {/* Rating */}
            {rating && status === 'completed' && (
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`w-3 h-3 ${i < rating ? 'text-yellow-400 fill-current' : 'text-muted-foreground'}`} 
                  />
                ))}
                <span className="text-xs text-muted-foreground ml-1">{rating}/5</span>
              </div>
            )}
            
            {/* Last Read */}
            {lastRead && status === 'reading' && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>Última leitura: {lastRead}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="p-2 hover-glow">
            <Heart className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="p-2 hover-glow">
            <MessageCircle className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="p-2 hover-glow">
            <Share className="w-4 h-4" />
          </Button>
        </div>
        
        {status === 'reading' && (
          <div className="flex flex-col gap-2">
            <UpdateProgressDialog
              bookId={id}
              title={title}
              currentPage={currentPage}
              totalPages={totalPages}
              currentProgress={progress}
              onProgressUpdate={onUpdate || (() => {})}
            >
              <Button size="sm" className="btn-enchanted text-xs px-3 py-1">
                Atualizar Progresso
              </Button>
            </UpdateProgressDialog>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs px-3 py-1" 
              onClick={() => setShowStats(!showStats)}
            >
              {showStats ? "Ocultar" : "Ver"} Stats
            </Button>
          </div>
        )}
      </div>
      
      {showStats && status === 'reading' && (
        <div className="mt-4">
          <ReadingStats bookId={id} />
        </div>
      )}
    </div>
  );
};

export default BookCard;