import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageCircle } from "lucide-react";
import { useConversations } from "@/hooks/useConversations";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const Mensagens = () => {
  const { conversations, loading } = useConversations();

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">Mensagens</h1>
        <p className="text-muted-foreground">Converse com suas amigas leitoras.</p>
      </header>

      {loading ? (
        <p className="text-center text-muted-foreground py-10">Carregando conversas...</p>
      ) : conversations.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <MessageCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma conversa ainda</h3>
            <p className="text-muted-foreground">Adicione amigas pra começar a trocar mensagens.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => (
            <Link key={conv.userId} to={`/mensagens/${conv.userId}`}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center gap-3">
                  <Avatar className="h-12 w-12 shrink-0">
                    <AvatarImage src={conv.avatarUrl || undefined} />
                    <AvatarFallback>{conv.displayName?.charAt(0) || '?'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold truncate">{conv.displayName || 'Usuária'}</p>
                      {conv.lastMessage && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatDistanceToNow(new Date(conv.lastMessage.created_at), { addSuffix: true, locale: ptBR })}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {conv.lastMessage ? conv.lastMessage.content : 'Diga oi! 👋'}
                    </p>
                  </div>
                  {conv.unreadCount > 0 && (
                    <Badge variant="destructive" className="shrink-0 h-5 min-w-5 flex items-center justify-center rounded-full px-1.5">
                      {conv.unreadCount}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Mensagens;
