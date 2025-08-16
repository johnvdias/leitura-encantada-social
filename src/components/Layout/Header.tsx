
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, Users, Home, User, MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { GlobalSearch } from "@/components/GlobalSearch";
import { ModeToggle } from "@/components/ThemeToggle";

const Header = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <BookOpen className="h-6 w-6 text-primary" />
          <span className="font-bold text-xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Leitura Encantada
          </span>
        </Link>

        <nav className="hidden md:flex items-center space-x-4">
          <Link to="/">
            <Button 
              variant={isActive("/") ? "default" : "ghost"} 
              size="sm"
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Início
            </Button>
          </Link>
          
          {user && (
            <>
              <Link to="/estante">
                <Button 
                  variant={isActive("/estante") ? "default" : "ghost"} 
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <BookOpen className="h-4 w-4" />
                  Minha Estante
                </Button>
              </Link>

              <Link to="/feed">
                <Button 
                  variant={isActive("/feed") ? "default" : "ghost"} 
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  Feed
                </Button>
              </Link>

              <Link to="/clubes">
                <Button 
                  variant={isActive("/clubes") ? "default" : "ghost"} 
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  Clubes
                </Button>
              </Link>

              <Link to="/perfil">
                <Button 
                  variant={isActive("/perfil") ? "default" : "ghost"} 
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <User className="h-4 w-4" />
                  Perfil
                </Button>
              </Link>
            </>
          )}
        </nav>

        <div className="flex items-center space-x-2">
          <ModeToggle />
          {user && (
            <>
              <div className="hidden md:block">
                <GlobalSearch />
              </div>
              <div className="md:hidden">
                <GlobalSearch />
              </div>
              <NotificationDropdown />
              <Button onClick={signOut} variant="outline" size="sm">
                Sair
              </Button>
            </>
          )}
          {!user && (
            <Link to="/auth">
              <Button size="sm">Entrar</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
