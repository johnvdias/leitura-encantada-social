
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, BookOpen, Crown, Calendar } from "lucide-react";
import { CreateClubDialog } from "@/components/CreateClubDialog";
import { useClubs } from "@/hooks/useClubs";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";

const Clubes = () => {
  const { clubs, myClubs, loading, joinClub, refetch } = useClubs();

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Carregando clubes...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Clubes de Leitura
          </h1>
          <p className="text-muted-foreground mt-2">
            Conecte-se com outros leitores e compartilhe experiências literárias
          </p>
        </div>
        <CreateClubDialog onClubCreated={refetch} />
      </div>

      {/* My Clubs */}
      {myClubs.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            Meus Clubes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myClubs.map((club) => (
              <Link key={club.id} to={`/clubes/${club.id}`}>
                <Card className="card-enchanted hover-float cursor-pointer">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="truncate">{club.name}</span>
                      {club.is_private && (
                        <Badge variant="outline">Privado</Badge>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {club.memberCount} membros
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDistanceToNow(new Date(club.created_at), {
                          addSuffix: true,
                          locale: ptBR
                        })}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {club.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {club.description}
                      </p>
                    )}
                    
                    {club.books && (
                      <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                        <BookOpen className="h-4 w-4 text-primary" />
                        <div className="text-sm">
                          <span className="font-medium">{club.books.title}</span>
                          <span className="text-muted-foreground"> por {club.books.author}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-sm text-muted-foreground">
                        Moderador: {club.moderator}
                      </span>
                      <Badge className="bg-green-500/20 text-green-700 dark:text-green-300">
                        Membro
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* All Clubs */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Todos os Clubes
        </h2>
        {clubs.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold mb-2">Nenhum clube encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Seja o primeiro a criar um clube de leitura!
              </p>
              <CreateClubDialog onClubCreated={refetch} />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clubs.map((club) => (
              <Card key={club.id} className="card-enchanted hover-float">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="truncate">{club.name}</span>
                    {club.is_private && (
                      <Badge variant="outline">Privado</Badge>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {club.memberCount} membros
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDistanceToNow(new Date(club.created_at), {
                        addSuffix: true,
                        locale: ptBR
                      })}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {club.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {club.description}
                    </p>
                  )}
                  
                  {club.books && (
                    <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                      <BookOpen className="h-4 w-4 text-primary" />
                      <div className="text-sm">
                        <span className="font-medium">{club.books.title}</span>
                        <span className="text-muted-foreground"> por {club.books.author}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm text-muted-foreground">
                      Moderador: {club.moderator}
                    </span>
                    {club.isJoined ? (
                      <Link to={`/clubes/${club.id}`}>
                        <Badge className="bg-green-500/20 text-green-700 dark:text-green-300 cursor-pointer hover:bg-green-500/30">
                          Membro
                        </Badge>
                      </Link>
                    ) : (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          joinClub(club.id);
                        }}
                        disabled={club.is_private}
                      >
                        {club.is_private ? "Apenas por convite" : "Entrar"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Clubes;
