
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BookOpen, Users, Home, MessageSquare, MessageCircle, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { GlobalSearch } from "@/components/GlobalSearch";
import { AppMenu } from "@/components/Layout/AppMenu";
import { useConversations } from "@/hooks/useConversations";
import { cn } from "@/lib/utils";

const Header = () => {
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const { totalUnread } = useConversations();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to={user ? "/feed" : "/"} className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          <span className="flex items-baseline gap-1.5">
            <span className="font-bold text-xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Leitura Encantada
            </span>
            <span className="hidden sm:inline text-[10px] text-muted-foreground/60">
              v{__APP_VERSION__}
            </span>
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

              <Link
                to="/perfil"
                className={cn(
                  "rounded-full",
                  isActive("/perfil") && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                )}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_url ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {profile?.display_name?.charAt(0) || user.email?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
              </Link>
            </>
          )}
        </nav>

        <div className="flex items-center space-x-2">
          {user && (
            <>
              <div className="hidden md:block">
                <GlobalSearch />
              </div>
              <div className="md:hidden">
                <GlobalSearch iconOnly />
              </div>
              <Link to="/mensagens">
                <Button variant="ghost" size="icon" className="relative">
                  <MessageCircle className="h-5 w-5" />
                  {totalUnread > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    >
                      {totalUnread > 9 ? '9+' : totalUnread}
                    </Badge>
                  )}
                </Button>
              </Link>
              <NotificationDropdown />
              <AppMenu onSignOut={signOut} />
            </>
          )}
          {!user && (
            <>
              <AppMenu />
              <Link to="/auth">
                <Button size="sm">Entrar</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
