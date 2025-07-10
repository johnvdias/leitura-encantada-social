import { Link, useLocation } from "react-router-dom";
import { BookHeart, User, Home, Library, Users, Heart, Sparkles, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Header = () => {
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  
  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    await signOut();
  };
  
  return (
    <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 hover-glow">
            <BookHeart className="w-8 h-8 text-primary" />
            <span className="text-xl font-enchanted text-enchanted">Estante Encantada</span>
          </Link>
          
          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link 
              to="/" 
              className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all duration-300 ${
                isActive('/') ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-primary'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Início</span>
            </Link>
            
            <Link 
              to="/estante" 
              className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all duration-300 ${
                isActive('/estante') ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-primary'
              }`}
            >
              <Library className="w-4 h-4" />
              <span>Minha Estante</span>
            </Link>
            
            <Link 
              to="/feed" 
              className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all duration-300 ${
                isActive('/feed') ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-primary'
              }`}
            >
              <Heart className="w-4 h-4" />
              <span>Feed</span>
            </Link>
            
            <Link 
              to="/clubes" 
              className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all duration-300 ${
                isActive('/clubes') ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-primary'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Clubes</span>
            </Link>
          </nav>
          
          {/* User Actions */}
          <div className="flex items-center space-x-4">
            {user && (
              <>
                <Button variant="ghost" size="sm" className="hidden md:flex btn-soft">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Adicionar Livro
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={profile?.avatar_url} alt={profile?.display_name} />
                        <AvatarFallback className="bg-primary/20 text-primary">
                          {profile?.display_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end">
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-1 leading-none">
                        <p className="font-medium">{profile?.display_name || 'Leitora'}</p>
                        <p className="w-[200px] truncate text-sm text-muted-foreground">
                          {user?.email}
                        </p>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/perfil" className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        <span>Meu Perfil</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/configuracoes" className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Configurações</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sair</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
            
            {!user && (
              <Link to="/auth">
                <Button variant="default" size="sm">
                  Entrar
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;