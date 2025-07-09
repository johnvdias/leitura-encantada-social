import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, MessageCircle, Share, BookOpen, Star, Users, Sparkles } from "lucide-react";

const Feed = () => {
  const [activeTab, setActiveTab] = useState("todas");

  // Mock data for feed posts
  const mockPosts = [
    {
      id: 1,
      author: "Marina Silva",
      avatar: "",
      timestamp: "2 horas atrás",
      book: "Circe",
      bookAuthor: "Madeline Miller",
      content: "Acabei de terminar esse livro e estou completamente apaixonada! A forma como a autora retrata a mitologia grega é simplesmente mágica. Circe é uma personagem tão complexa e fascinante. 🌙✨",
      likes: 15,
      comments: 5,
      emotion: "❤️",
      genre: "Fantasia"
    },
    {
      id: 2,
      author: "Ana Beatriz",
      avatar: "",
      timestamp: "5 horas atrás",
      book: "Orgulho e Preconceito",
      bookAuthor: "Jane Austen",
      content: "Relendo pela terceira vez e continuo descobrindo detalhes novos. O Sr. Darcy sempre me surpreende! Alguém mais aqui é team Darcy? 💕",
      likes: 23,
      comments: 8,
      emotion: "😍",
      genre: "Romance",
      isReread: true
    },
    {
      id: 3,
      author: "Luiza Costa",
      avatar: "",
      timestamp: "1 dia atrás",
      book: "A Garota no Trem",
      bookAuthor: "Paula Hawkins",
      content: "Gente, que reviravolta! Não consegui parar de ler. Terminei em uma sentada só. Alguém tem alguma recomendação parecida? 📚",
      likes: 12,
      comments: 7,
      emotion: "😱",
      genre: "Suspense"
    }
  ];

  const PostCard = ({ post }: { post: any }) => (
    <Card className="card-enchanted mb-6">
      <CardContent className="p-6">
        {/* Author Info */}
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="h-10 w-10">
            <AvatarImage src={post.avatar} />
            <AvatarFallback className="bg-primary/20 text-primary">
              {post.author.split(' ').map((n: string) => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium">{post.author}</p>
              {post.isReread && (
                <span className="text-xs bg-accent/20 text-accent-foreground px-2 py-1 rounded-full">
                  Releitura
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{post.timestamp}</p>
          </div>
          <div className="text-2xl">{post.emotion}</div>
        </div>

        {/* Book Info */}
        <div className="bg-muted/30 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="font-medium text-primary">{post.book}</span>
            <span className="text-sm text-muted-foreground">por {post.bookAuthor}</span>
          </div>
          <span className="text-xs bg-secondary/20 text-secondary-foreground px-2 py-1 rounded-full">
            {post.genre}
          </span>
        </div>

        {/* Content */}
        <p className="mb-4 leading-relaxed">{post.content}</p>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-red-500">
              <Heart className="w-4 h-4 mr-1" />
              {post.likes}
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
              <MessageCircle className="w-4 h-4 mr-1" />
              {post.comments}
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
              <Share className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

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
              <Button className="btn-enchanted flex-1">
                <Sparkles className="w-4 h-4 mr-2" />
                Compartilhar uma experiência de leitura
              </Button>
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
            {mockPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
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