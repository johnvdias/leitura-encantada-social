import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDirectMessages } from "@/hooks/useDirectMessages";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface OtherProfile {
  display_name: string | null;
  avatar_url: string | null;
}

const Conversa = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const { messages, loading, sending, sendMessage } = useDirectMessages(userId);
  const [otherProfile, setOtherProfile] = useState<OtherProfile | null>(null);
  const [content, setContent] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => setOtherProfile(data));
  }, [userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    const toSend = content;
    setContent("");
    await sendMessage(toSend);
  };

  if (!userId) return null;

  return (
    <div className="container mx-auto px-4 py-4 max-w-2xl flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center gap-3 pb-4 border-b min-w-0">
        <Link to="/mensagens" className="shrink-0">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarImage src={otherProfile?.avatar_url || undefined} />
          <AvatarFallback>{otherProfile?.display_name?.charAt(0) || '?'}</AvatarFallback>
        </Avatar>
        <p className="font-semibold truncate min-w-0">{otherProfile?.display_name || 'Usuária'}</p>
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {loading ? (
          <p className="text-center text-muted-foreground py-10">Carregando mensagens...</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-muted-foreground py-10">Nenhuma mensagem ainda. Diga oi! 👋</p>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-4 py-2 break-words",
                    isMine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm"
                  )}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <p className={cn("text-[10px] mt-1", isMine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 pt-2 border-t">
        <Input
          placeholder="Digite uma mensagem..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={sending}
        />
        <Button type="submit" disabled={sending || !content.trim()}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
};

export default Conversa;
