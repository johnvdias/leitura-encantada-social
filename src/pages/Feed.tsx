import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles } from "lucide-react";
import { CreatePostDialog } from "@/components/CreatePostDialog";
import PostCard from "@/components/PostCard";
import { useFeed } from "@/hooks/useFeed";
import { useAuth } from "@/hooks/useAuth";

const Feed = () => {
  const { profile, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("todas");
  const filterMap = {
    "todas": "all" as const,
    "amigas": "friends" as const,
    "clubes": "clubs" as const
  };
  const { posts, loading: feedLoading, hasMore, loadMore, refetch } = useFeed(filterMap[activeTab as keyof typeof filterMap]);

  if (authLoading || (feedLoading && posts.length === 0)) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
        <p className="text-muted-foreground">Carregando seu universo literário...</p>
      </div>
    );
  }
  
  if (!profile) {
      return (
          <div className="container mx-auto px-4 py-8 text-center">
              <p className="text-destructive">Não foi possível carregar seu perfil. Tente recarregar a página.</p>
          </div>
      )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-bold text-primary mb-2">Feed da Comunidade</h1>
        <p className="text-muted-foreground">
          Compartilhe suas experiências literárias e conecte-se com outros leitores.
        </p>
      </header>

      <div className="max-w-2xl mx-auto">
        <Card className="mb-8">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-4">
              <Link to="/perfil">
                <Avatar className="h-10 w-10">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback>{profile.display_name?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
                </Avatar>
              </Link>
              <CreatePostDialog onPostCreated={refetch}>
                <Button className="btn-enchanted flex-1 w-full justify-start text-muted-foreground hover:text-foreground">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Compartilhar uma experiência...
                </Button>
              </CreatePostDialog>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex w-full items-center justify-start overflow-x-auto sm:grid sm:grid-cols-3 gap-1 mb-8">
            <TabsTrigger value="todas" className="shrink-0">Todas</TabsTrigger>
            <TabsTrigger value="amigas" className="shrink-0">Amigos</TabsTrigger>
            <TabsTrigger value="clubes" className="shrink-0">Clubes</TabsTrigger>
          </TabsList>

          <div className="space-y-6">
            {posts.length > 0 ? (
              posts.map((post) => (
                <PostCard 
                  key={post.id} 
                  {...post}
                  onPostDeleted={refetch}
                />
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Nenhum post para exibir nesta aba.</p>
              </div>
            )}
            {feedLoading && <div className="text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto"/></div>}
            {hasMore && !feedLoading && (
              <div className="text-center">
                <Button onClick={loadMore} variant="outline">Carregar mais</Button>
              </div>
            )}
             {!hasMore && posts.length > 0 && (
              <div className="text-center text-sm text-muted-foreground pt-4">Você chegou ao fim!</div>
            )}
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default Feed;
