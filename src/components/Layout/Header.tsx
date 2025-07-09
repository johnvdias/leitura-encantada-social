import { Link, useLocation } from "react-router-dom";
import { BookHeart, User, Home, Library, Users, Heart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const Header = () => {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;
  
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
            <Button variant="ghost" size="sm" className="hidden md:flex btn-soft">
              <Sparkles className="w-4 h-4 mr-2" />
              Adicionar Livro
            </Button>
            
            <Link to="/perfil">
              <Button variant="ghost" size="sm" className="rounded-full p-2">
                <User className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;