import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  BookOpen, 
  Calendar, 
  Heart, 
  Star, 
  Trophy, 
  Target, 
  Clock,
  Users,
  Sparkles,
  Crown,
  Award,
  Edit,
  Save,
  X
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const Perfil = () => {
  const { user, profile, updateProfile } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("estatisticas");
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState({
    display_name: '',
    bio: '',
    reading_goal: 12
  });

  useEffect(() => {
    if (profile) {
      setEditedProfile({
        display_name: profile.display_name || '',
        bio: profile.bio || '',
        reading_goal: profile.reading_goal || 12
      });
    }
  }, [profile]);

  const handleSave = async () => {
    const { error } = await updateProfile(editedProfile);
    
    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o perfil",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Perfil atualizado! ✨",
        description: "Suas informações foram salvas com sucesso",
      });
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setEditedProfile({
        display_name: profile.display_name || '',
        bio: profile.bio || '',
        reading_goal: profile.reading_goal || 12
      });
    }
    setIsEditing(false);
  };

  // Mock user data
  const userData = {
    name: profile?.display_name || user?.email?.split('@')[0] || "Leitora",
    username: `@${profile?.display_name?.toLowerCase().replace(/\s+/g, '_') || 'leitora'}`,
    bio: profile?.bio || "Apaixonada por livros! Sempre descobrindo novas histórias. 📚✨",
    avatar: profile?.avatar_url || "",
    joinDate: "Janeiro 2024",
    stats: {
      booksRead: 47,
      currentlyReading: 3,
      wantToRead: 23,
      totalPages: 12450,
      avgRating: 4.2,
      streak: 15,
      yearGoal: 50,
      followers: 156,
      following: 89
    },
    badges: [
      { name: "Rainha Literária", icon: "👑", color: "bg-yellow-100 text-yellow-800" },
      { name: "Fada Leitora", icon: "🧚‍♀️", color: "bg-purple-100 text-purple-800" },
      { name: "Maratona de Leitura", icon: "🏃‍♀️", color: "bg-green-100 text-green-800" },
      { name: "Crítica Literária", icon: "⭐", color: "bg-blue-100 text-blue-800" }
    ],
    favoriteGenres: [
      { name: "Romance", count: 18, percentage: 38 },
      { name: "Fantasia", count: 12, percentage: 26 },
      { name: "Ficção", count: 8, percentage: 17 },
      { name: "Suspense", count: 6, percentage: 13 },
      { name: "Outros", count: 3, percentage: 6 }
    ],
    recentActivity: [
      { action: "Finalizou", book: "Circe", date: "Hoje" },
      { action: "Iniciou", book: "A Canção de Aquiles", date: "Ontem" },
      { action: "Avaliou", book: "Orgulho e Preconceito", date: "2 dias atrás" }
    ]
  };

  const StatCard = ({ title, value, icon, subtitle }: any) => (
    <Card className="card-enchanted text-center">
      <CardContent className="p-6">
        <div className="flex items-center justify-center mb-2">
          {icon}
        </div>
        <div className="text-2xl font-bold text-primary mb-1">{value}</div>
        <div className="text-sm font-medium text-foreground">{title}</div>
        {subtitle && (
          <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Profile Header */}
      <div className="text-center mb-8">
        <Avatar className="h-24 w-24 mx-auto mb-4 ring-4 ring-primary/20">
          <AvatarImage src={userData.avatar} />
          <AvatarFallback className="bg-gradient-enchanted text-white text-2xl">
            {userData.name.split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
        
        <h1 className="text-3xl font-enchanted text-enchanted mb-2">
          {userData.name}
        </h1>
        <p className="text-muted-foreground mb-2">{userData.username}</p>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
          {userData.bio}
        </p>
        
        <div className="flex items-center justify-center gap-6 mb-6">
          <div className="text-center">
            <div className="font-bold text-lg">{userData.stats.followers}</div>
            <div className="text-sm text-muted-foreground">Seguidores</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-lg">{userData.stats.following}</div>
            <div className="text-sm text-muted-foreground">Seguindo</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-lg">{userData.stats.booksRead}</div>
            <div className="text-sm text-muted-foreground">Livros Lidos</div>
          </div>
        </div>

        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} className="btn-enchanted">
            <Edit className="w-4 h-4 mr-2" />
            Editar Perfil
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button onClick={handleSave} className="btn-enchanted">
              <Save className="w-4 h-4 mr-2" />
              Salvar
            </Button>
            <Button onClick={handleCancel} variant="outline">
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <Card className="card-enchanted mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-primary" />
              Editar Perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="display_name">Nome de Leitora</Label>
                <Input
                  id="display_name"
                  value={editedProfile.display_name}
                  onChange={(e) => setEditedProfile({...editedProfile, display_name: e.target.value})}
                  placeholder="Como as outras leitoras te conhecerão"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reading_goal">Meta Anual de Livros</Label>
                <Input
                  id="reading_goal"
                  type="number"
                  value={editedProfile.reading_goal}
                  onChange={(e) => setEditedProfile({...editedProfile, reading_goal: parseInt(e.target.value) || 12})}
                  placeholder="12"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={editedProfile.bio}
                onChange={(e) => setEditedProfile({...editedProfile, bio: e.target.value})}
                placeholder="Conte um pouco sobre você e seus gostos literários..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {!isEditing && (
        <>
          {/* Badges */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 text-center">
              Conquistas e Selos
            </h3>
            <div className="flex flex-wrap justify-center gap-3">
              {userData.badges.map((badge, index) => (
                <Badge key={index} className={`${badge.color} px-3 py-2 text-sm`}>
                  <span className="mr-2">{badge.icon}</span>
                  {badge.name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto mb-8">
              <TabsTrigger value="estatisticas" className="flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                Estatísticas
              </TabsTrigger>
              <TabsTrigger value="metas" className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Metas
              </TabsTrigger>
              <TabsTrigger value="atividade" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Atividade
              </TabsTrigger>
            </TabsList>

            <TabsContent value="estatisticas">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
                <StatCard
                  title="Livros Lidos"
                  value={userData.stats.booksRead}
                  icon={<BookOpen className="w-6 h-6 text-primary" />}
                  subtitle="Este ano"
                />
                <StatCard
                  title="Páginas Lidas"
                  value={userData.stats.totalPages.toLocaleString()}
                  icon={<Star className="w-6 h-6 text-primary" />}
                  subtitle="Total"
                />
                <StatCard
                  title="Avaliação Média"
                  value={userData.stats.avgRating}
                  icon={<Heart className="w-6 h-6 text-primary" />}
                  subtitle="De 5 estrelas"
                />
                <StatCard
                  title="Sequência de Leitura"
                  value={`${userData.stats.streak} dias`}
                  icon={<Award className="w-6 h-6 text-primary" />}
                  subtitle="Recorde atual"
                />
              </div>

              {/* Favorite Genres */}
              <Card className="card-enchanted">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" />
                    Gêneros Favoritos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {userData.favoriteGenres.map((genre, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{genre.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {genre.count} livros ({genre.percentage}%)
                          </span>
                        </div>
                        <Progress value={genre.percentage} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="metas">
              <Card className="card-enchanted">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    Meta Anual de Leitura
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center mb-6">
                    <div className="text-4xl font-bold text-primary mb-2">
                      {userData.stats.booksRead} / {editedProfile.reading_goal}
                    </div>
                    <p className="text-muted-foreground">
                      Livros lidos em 2024
                    </p>
                  </div>
                  
                  <Progress 
                    value={(userData.stats.booksRead / editedProfile.reading_goal) * 100} 
                    className="h-4 mb-4" 
                  />
                  
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      Você está a {editedProfile.reading_goal - userData.stats.booksRead} livros 
                      da sua meta! Continue assim! 🌟
                    </p>
                    <Button onClick={() => setIsEditing(true)} className="btn-enchanted mt-4">
                      Ajustar Meta
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="atividade">
              <Card className="card-enchanted">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    Atividade Recente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {userData.recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">
                            {activity.action} "{activity.book}"
                          </p>
                          <p className="text-sm text-muted-foreground">{activity.date}</p>
                        </div>
                        <BookOpen className="w-5 h-5 text-primary" />
                      </div>
                    ))}
                  </div>
                  
                  <div className="text-center mt-6">
                    <Button variant="outline" className="w-full">
                      Ver Histórico Completo
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default Perfil;