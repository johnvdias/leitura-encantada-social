
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Users, BookOpen, Plus, Star, Calendar, MessageCircle, Loader2 } from "lucide-react";
import { useClubs } from "@/hooks/useClubs";
import { useToast } from "@/hooks/use-toast";

const Clubes = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const { clubs, myClubs, loading, joinClub } = useClubs();
  const { toast } = useToast();

  const handleJoinClub = async (clubId: string) => {
    try {
      await joinClub(clubId);
      toast({
        title: "Bem-vinda ao clube! 🎉",
        description: "Você agora faz parte desta comunidade de leitura",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível participar do clube",
        variant: "destructive",
      });
    }
  };

  const filteredClubs = clubs.filter(club =>
    club.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    club.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const availableClubs = filteredClubs.filter(club => !club.isJoined);

  const ClubCard = ({ club }: { club: any }) => (
    <Card className="card-enchanted hover-float">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-2 flex items-center gap-2">
              {club.name}
              {club.is_private && <span className="text-xs">🔒</span>}
            </CardTitle>
            <p className="text-sm text-muted-foreground mb-3">
              {club.description || "Descrição não disponível"}
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Current Book */}
        {club.books && (
          <div className="bg-muted/30 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <span className="font-medium text-primary">{club.books.title}</span>
            </div>
            <p className="text-sm text-muted-foreground">por {club.books.author}</p>
          </div>
        )}

        {/* Club Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">{club.memberCount} membros</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Criado recentemente</span>
          </div>
        </div>

        {/* Moderator */}
        <div className="flex items-center gap-2 mb-4">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="bg-secondary/20 text-secondary-foreground text-xs">
              {club.moderator.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground">
            Moderado por {club.moderator}
          </span>
        </div>

        {/* Action Button */}
        {club.isJoined ? (
          <Button className="w-full btn-enchanted">
            Acessar Clube
          </Button>
        ) : (
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => handleJoinClub(club.id)}
          >
            Participar
          </Button>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Carregando clubes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-enchanted text-enchanted mb-4">
          Clubes de Leitura
        </h1>
        <p className="text-muted-foreground text-lg">
          Conecte-se com leitoras que compartilham seus gostos literários
        </p>
      </div>

      {/* Search and Create */}
      <div className="flex gap-4 mb-8 max-w-2xl mx-auto">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar clubes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button className="btn-enchanted">
          <Plus className="w-4 h-4 mr-2" />
          Criar Clube
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="meus-clubes" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-8">
          <TabsTrigger value="meus-clubes" className="flex items-center gap-2">
            <Star className="w-4 h-4" />
            Meus Clubes ({myClubs.length})
          </TabsTrigger>
          <TabsTrigger value="explorar" className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            Explorar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="meus-clubes">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {myClubs.map((club) => (
              <ClubCard key={club.id} club={club} />
            ))}
          </div>
          {myClubs.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                Você ainda não participa de nenhum clube
              </p>
              <Button className="btn-enchanted">
                Explorar Clubes
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="explorar">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {availableClubs.map((club) => (
              <ClubCard key={club.id} club={club} />
            ))}
          </div>
          {availableClubs.length === 0 && (
            <div className="text-center py-12">
              <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                {searchTerm ? "Nenhum clube encontrado" : "Todos os clubes disponíveis já foram explorados"}
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Clubes;
