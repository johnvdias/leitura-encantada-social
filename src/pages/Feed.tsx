
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, Users, BookOpen, Loader2 } from "lucide-react";
import { CreatePostDialog } from "@/components/CreatePostDialog";
import { PostCard } from "@/components/PostCard";
import { useFeed } from "@/hooks/useFeed";

const Feed = () => {
  const [activeTab, setActiveTab] = useState("todas");
  const { posts, loading, refetch } = useFeed();

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Carregando feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-enchanted text-enchanted mb-4">
          Feed da Comunidade
        </h1>
        <p className="text-muted-foreground text-lg">
          Compartilhe suas experiências literárias e conecte-se com outras leitoras
        </p>
      </div>

      {/* Create Post Button */}
      <div className="max-w-2xl mx-auto mb-8">
        <Card className="card-dreamy">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/20 text-primary">
                  EU
                </AvatarFallback>
              </Avatar>
              <CreatePostDialog onPostCreated={refetch} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feed Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-2xl mx-auto">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="todas">
            <Users className="w-4 h-4 mr-2" />
            Todas
          </TabsTrigger>
          <TabsTrigger value="amigas">
            <Heart className="w-4 h-4 mr-2" />
            Amigas
          </TabsTrigger>
          <TabsTrigger value="clubes">
            <BookOpen className="w-4 h-4 mr-2" />
            Meus Clubes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="todas">
          <div className="space-y-6">
            {posts.length > 0 ? (
              posts.map((post) => (
                <PostCard 
                  key={post.id} 
                  post={post}
                  author={post.profiles}
                  book={post.books}
                  onUpdate={refetch}
                />
              ))
            ) : (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  Nenhum post ainda. Seja a primeira a compartilhar!
                </p>
                <CreatePostDialog onPostCreated={refetch} />
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="amigas">
          <div className="text-center py-12">
            <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Conecte-se com outras leitoras para ver suas atualizações aqui
            </p>
            <Button className="btn-enchanted">
              Encontrar Amigas
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="clubes">
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Participe de clubes de leitura para ver as discussões aqui
            </p>
            <Button className="btn-enchanted">
              Explorar Clubes
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Feed;
