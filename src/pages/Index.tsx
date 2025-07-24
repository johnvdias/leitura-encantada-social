import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookHeart, Library, Users, Heart, Sparkles, BookOpen, Trophy, Calendar } from "lucide-react";
import heroImage from "@/assets/hero-enchanted-library.jpg";
import { useAuth } from "@/contexts/AuthContext";
import { createSamplePosts, createSampleBooks } from "@/utils/seedData";
import { useToast } from "@/hooks/use-toast";
import { RecommendationSystem } from "@/components/RecommendationSystem";

const Index = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const handleCreateSampleData = async () => {
    if (!user) return;

    try {
      const { error: booksError } = await createSampleBooks(user.id);
      const { error: postsError } = await createSamplePosts(user.id);

      if (booksError || postsError) {
        toast({
          title: "Erro",
          description: "Não foi possível criar dados de exemplo",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Dados criados! ✨",
          description: "Vá para sua estante e feed para ver os exemplos"
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro inesperado ao criar dados",
        variant: "destructive"
      });
    }
  };
  const features = [
    {
      icon: <BookOpen className="w-8 h-8 text-primary" />,
      title: "Controle de Leitura",
      description: "Acompanhe seu progresso de forma personalizada e acolhedora",
      link: "/estante"
    },
    {
      icon: <Heart className="w-8 h-8 text-primary" />,
      title: "Feed Social",
      description: "Compartilhe emoções e conecte-se com outras leitoras apaixonadas",
      link: "/feed"
    },
    {
      icon: <Users className="w-8 h-8 text-primary" />,
      title: "Clubes de Leitura",
      description: "Participe de discussões literárias em grupos acolhedores",
      link: "/clubes"
    },
    {
      icon: <Library className="w-8 h-8 text-primary" />,
      title: "Estante Virtual",
      description: "Organize seus livros com filtros mágicos e categorias encantadas",
      link: "/estante"
    },
    {
      icon: <Trophy className="w-8 h-8 text-primary" />,
      title: "Gamificação",
      description: "Conquiste selos, troféus e títulos como Rainha Literária",
      link: "/perfil"
    },
    {
      icon: <Calendar className="w-8 h-8 text-primary" />,
      title: "Metas e Cronograma",
      description: "Defina objetivos e receba lembretes motivacionais diários",
      link: "/perfil"
    }
  ];

  const stats = [
    { number: "10k+", label: "Leitoras Ativas" },
    { number: "50k+", label: "Livros Registrados" },
    { number: "200+", label: "Clubes de Leitura" },
    { number: "1M+", label: "Páginas Lidas" }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-enchanted opacity-30" />
        
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-enchanted text-enchanted mb-6 leading-tight">
              Bem-vinda à
              <br />
              <span className="text-5xl sm:text-6xl md:text-7xl">Estante Encantada</span>
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
              Uma rede social acolhedora onde leitoras apaixonadas 
              <br className="hidden md:block" />
              compartilham emoções, criam laços afetivos e mergulham em suas memórias literárias
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              {user ? (
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link to="/estante">
                    <Button size="lg" className="btn-enchanted text-lg w-full sm:w-auto">
                      <Library className="w-5 h-5 mr-2" />
                      Minha Estante
                    </Button>
                  </Link>
                  <Link to="/feed">
                    <Button size="lg" variant="outline" className="hover-glow w-full sm:w-auto">
                      <Sparkles className="w-5 h-5 mr-2" />
                      Ver Feed
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link to="/auth">
                    <Button size="lg" className="btn-enchanted text-lg w-full sm:w-auto">
                      <BookHeart className="w-5 h-5 mr-2" />
                      Começar Minha Jornada
                    </Button>
                  </Link>
                  <Link to="/feed">
                    <Button size="lg" variant="outline" className="hover-glow w-full sm:w-auto">
                      <Sparkles className="w-5 h-5 mr-2" />
                      Descobrir Comunidade
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-2xl mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-primary mb-1">
                    {stat.number}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-20 bg-card/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-enchanted text-enchanted mb-4">
              Funcionalidades Encantadas
            </h2>
            <p className="text-md md:text-lg text-muted-foreground max-w-2xl mx-auto">
              Descubra ferramentas mágicas que transformarão sua experiência de leitura
              em uma jornada inesquecível e cheia de conexões
            </p>
          </div>

          <div className="grid gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <Link to={feature.link} key={index} className="block hover:no-underline">
                <Card className="card-enchanted hover-float text-center h-full">
                  <CardContent className="p-6 md:p-8 flex flex-col items-center justify-center">
                    <div className="mb-4">
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-semibold mb-3 text-foreground">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Recommendations Section for logged in users */}
      {user && (
        <section className="py-16 md:py-20 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-3xl md:text-4xl font-enchanted text-enchanted mb-4">
                Recomendações Personalizadas
              </h2>
              <p className="text-md md:text-lg text-muted-foreground max-w-2xl mx-auto">
                Descobrimos livros, pessoas e clubes especiais que podem encantar sua jornada literária
              </p>
            </div>
            <div className="max-w-4xl mx-auto">
              <RecommendationSystem />
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-16 md:py-20 bg-gradient-dreamy">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-enchanted text-white mb-6">
              Pronta para sua Aventura Literária?
            </h2>
            <p className="text-lg md:text-xl text-white/90 mb-8 leading-relaxed">
              Junte-se a milhares de leitoras que já transformaram 
              sua paixão pelos livros em conexões verdadeiras e momentos mágicos
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to={user ? "/estante" : "/auth"}>
                <Button size="lg" className="bg-white text-primary hover:bg-white/90 text-lg w-full sm:w-auto">
                  <Library className="w-5 h-5 mr-2" />
                  {user ? "Explorar Minha Estante" : "Começar Agora"}
                </Button>
              </Link>
              <Link to="/feed">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 text-lg w-full sm:w-auto">
                  <Heart className="w-5 h-5 mr-2" />
                  Ver Feed da Comunidade
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
