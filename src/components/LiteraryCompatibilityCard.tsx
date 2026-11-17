import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sparkles, Share2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { generateCompatibilityImageBlob } from "@/lib/generateCompatibilityImage";
import { shareImageBlob } from "@/lib/share";

interface Compatibility {
  common_books: number;
  my_total: number;
  their_total: number;
  percentage: number;
}

interface LiteraryCompatibilityCardProps {
  otherUserId: string;
  otherDisplayName: string;
  otherAvatarUrl: string | null;
}

// Só é chamado quando as duas já são amigas (ver UserProfile) - a RPC também
// confirma a amizade aceita do lado do banco, então não faz nada de errado
// se chegar a ser chamada fora desse caso, só não devolve dado nenhum.
export function LiteraryCompatibilityCard({ otherUserId, otherDisplayName, otherAvatarUrl }: LiteraryCompatibilityCardProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<Compatibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchCompatibility = async () => {
      setLoading(true);
      try {
        const { data: result, error } = await supabase.rpc('get_literary_compatibility', {
          p_other_user_id: otherUserId,
        });
        if (error) throw error;
        if (!cancelled) setData(result as unknown as Compatibility);
      } catch (error) {
        console.error('Error fetching literary compatibility:', error);
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchCompatibility();
    return () => {
      cancelled = true;
    };
  }, [otherUserId]);

  if (loading || !data) return null;

  // Sem livros concluídos o suficiente pra dizer qualquer coisa - melhor não
  // mostrar um "0% de afinidade" sem contexto nenhum.
  if (data.my_total === 0 || data.their_total === 0) return null;

  const handleShare = async () => {
    setSharing(true);
    try {
      const blob = await generateCompatibilityImageBlob({
        percentage: data.percentage,
        commonBooks: data.common_books,
        myName: profile?.display_name || 'Você',
        myAvatarUrl: profile?.avatar_url ?? null,
        otherName: otherDisplayName,
        otherAvatarUrl,
      });
      if (!blob) {
        toast({ title: 'Não foi possível gerar a imagem', variant: 'destructive' });
        return;
      }
      const result = await shareImageBlob(
        blob,
        'compatibilidade-literaria.png',
        'Compatibilidade Literária',
        `${data.percentage}% de afinidade com ${otherDisplayName}!`
      );
      if (result === 'downloaded') {
        toast({ title: 'Imagem baixada!', description: 'Agora é só compartilhar onde quiser.' });
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="bg-gradient-enchanted p-6">
        <div className="flex items-center justify-center gap-1 text-sm font-medium text-foreground/80 mb-4">
          <Sparkles className="h-4 w-4" />
          Compatibilidade literária
        </div>
        <div className="flex items-center justify-center gap-4 sm:gap-8">
          <Avatar className="h-14 w-14 border-2 border-background shrink-0">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback>{profile?.display_name?.[0] || '?'}</AvatarFallback>
          </Avatar>
          <div className="text-center">
            <p className="text-4xl font-bold text-foreground">{data.percentage}%</p>
            <p className="text-xs text-muted-foreground">de afinidade</p>
          </div>
          <Avatar className="h-14 w-14 border-2 border-background shrink-0">
            <AvatarImage src={otherAvatarUrl ?? undefined} />
            <AvatarFallback>{otherDisplayName?.[0] || '?'}</AvatarFallback>
          </Avatar>
        </div>
        <p className="text-center text-sm text-muted-foreground mt-4">
          Você e {otherDisplayName} têm <span className="font-semibold text-foreground">{data.common_books} livro{data.common_books === 1 ? '' : 's'}</span> concluído{data.common_books === 1 ? '' : 's'} em comum.
        </p>
        <div className="flex justify-center mt-4">
          <Button variant="outline" size="sm" onClick={handleShare} disabled={sharing} className="gap-2">
            {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
            Criar card
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
