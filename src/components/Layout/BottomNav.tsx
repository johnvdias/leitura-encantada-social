import { Home, BookOpen, Users, User, MessageSquare } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const BottomNav = () => {
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  if (!user) {
    return null;
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-around">
        <Link to="/" className={cn("flex flex-col items-center gap-1 p-2 rounded-md", isActive("/") ? "text-primary" : "text-muted-foreground")}>
          <Home className="h-6 w-6" />
          <span className="text-xs">Início</span>
        </Link>
        <Link to="/estante" className={cn("flex flex-col items-center gap-1 p-2 rounded-md", isActive("/estante") ? "text-primary" : "text-muted-foreground")}>
          <BookOpen className="h-6 w-6" />
          <span className="text-xs">Estante</span>
        </Link>
        <Link to="/feed" className={cn("flex flex-col items-center gap-1 p-2 rounded-md", isActive("/feed") ? "text-primary" : "text-muted-foreground")}>
          <MessageSquare className="h-6 w-6" />
          <span className="text-xs">Feed</span>
        </Link>
        <Link to="/clubes" className={cn("flex flex-col items-center gap-1 p-2 rounded-md", isActive("/clubes") ? "text-primary" : "text-muted-foreground")}>
          <Users className="h-6 w-6" />
          <span className="text-xs">Clubes</span>
        </Link>
        <Link to="/perfil" className={cn("flex flex-col items-center gap-1 p-2 rounded-md", isActive("/perfil") ? "text-primary" : "text-muted-foreground")}>
          <User className="h-6 w-6" />
          <span className="text-xs">Perfil</span>
        </Link>
      </div>
    </nav>
  );
};

export default BottomNav;
