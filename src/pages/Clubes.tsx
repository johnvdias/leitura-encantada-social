import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Users, BookOpen, Plus, Star, Calendar, MessageCircle } from "lucide-react";

const Clubes = () => {
  const [searchTerm, setSearchTerm] = useState("");

  // Mock data for book clubs
  const mockClubs = [
    {
      id: 1,
      name: "Rainhas do Romance",
      description: "Dedicado aos melhores romances históricos e contemporâneos",
      members: 156,
      currentBook: "Orgulho e Preconceito",
      currentAuthor: "Jane Austen",
      genre: "Romance",
      isPrivate: false,
      nextMeeting: "Domingo, 15/12",
      activity: "Discussão sobre os capítulos 10-15",
      moderator: "Clara Santos",
      joined: true
    },
    {
      id: 2,
      name: "Fantasia & Magia",
      description: "Para amantes de mundos fantásticos e aventuras épicas",
      members: 89,
      currentBook: "A Canção de Aquiles",
      currentAuthor: "Madeline Miller",
      genre: "Fantasia",
      isPrivate: false,
      nextMeeting: "Terça, 17/12",
      activity: "Início da leitura coletiva",
      moderator: "Juliana Lopes",
      joined: false
    },
    {
      id: 3,
      name: "Clássicos Brasileiros",
      description: "Redescobrindo os tesouros da literatura nacional",
      members: 67,
      currentBook: "Dom Casmurro",
      currentAuthor: "Machado de Assis",
      genre: "Ficção",
      isPrivate: false,
      nextMeeting: "Quinta, 19/12",
      activity: "Análise dos personagens",
      moderator: "Beatriz Costa",
      joined: true
    },
    {
      id: 4,
      name: "Suspense & Mistério",
      description: "Para quem adora uma boa dose de adrenalina literária",
      members: 203,
      currentBook: "A Garota no Trem",
      currentAuthor: "Paula Hawkins",
      genre: "Suspense",
      isPrivate: false,
      nextMeeting: "Sábado, 21/12",
      activity: "Teorias sobre o desfecho",
      moderator: "Mariana Silva",
      joined: false
    }
  ];

  const myClubs = mockClubs.filter(club => club.joined);
  const availableClubs = mockClubs.filter(club => !club.joined);

  const ClubCard = ({ club }: { club: any }) => (
    <Card className="card-enchanted hover-float">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-2 flex items-center gap-2">
              {club.name}
              {club.isPrivate && <span className="text-xs">🔒</span>}
            </CardTitle>
            <p className="text-sm text-muted-foreground mb-3">
              {club.description}
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            {club.genre}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Current Book */}
        <div className="bg-muted/30 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="font-medium text-primary">{club.currentBook}</span>
          </div>
          <p className="text-sm text-muted-foreground">por {club.currentAuthor}</p>
        </div>

        {/* Club Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">{club.members} membros</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">{club.nextMeeting}</span>
          </div>
        </div>

        {/* Current Activity */}
        <div className="bg-accent/20 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <MessageCircle className="w-4 h-4 text-accent-foreground" />
            <span className="text-sm font-medium text-accent-foreground">Atividade Atual</span>
          </div>
          <p className="text-sm text-accent-foreground">{club.activity}</p>
        </div>

        {/* Moderator */}
        <div className="flex items-center gap-2 mb-4">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="bg-secondary/20 text-secondary-foreground text-xs">
              {club.moderator.split(' ').map((n: string) => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground">
            Moderado por {club.moderator}
          </span>
        </div>

        {/* Action Button */}
        {club.joined ? (
          <Button className="w-full btn-enchanted">
            Acessar Clube
          </Button>
        ) : (
          <Button variant="outline" className="w-full">
            Participar
          </Button>
        )}
      </CardContent>
    </Card>
  );

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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Clubes;