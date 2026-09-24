import { Link, useLocation } from "react-router-dom";
import { BookOpen, Users, MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const BottomNav = () => {
  const { user, profile } = useAuth();
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  if (!user) {
    return null; // Não mostra a barra de navegação se o usuário não estiver logado
  }

  const navLinks = [
    { href: "/feed", label: "Feed", icon: MessageSquare },
    { href: "/clubes", label: "Clubes", icon: Users },
    { href: "/estante", label: "Estante", icon: BookOpen },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 z-50 w-full h-24 bg-background/95 backdrop-blur border-t">
      <div className="flex h-full max-w-lg mx-auto font-medium pb-4">
        {navLinks.map(({ href, label, icon: Icon }) => (
          <Link
            key={label}
            to={href}
            className={cn(
              "flex-1 min-w-0 inline-flex flex-col items-center justify-center px-2 hover:bg-muted",
              isActive(href) ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className="w-5 h-5 mb-1 shrink-0" />
            <span className="text-xs truncate">{label}</span>
          </Link>
        ))}
        <Link
          to="/perfil"
          className={cn(
            "flex-1 min-w-0 inline-flex flex-col items-center justify-center px-2 hover:bg-muted",
            isActive("/perfil") ? "text-primary" : "text-muted-foreground"
          )}
        >
          <Avatar
            className={cn(
              "w-7 h-7 shrink-0 ring-offset-background",
              isActive("/perfil") && "ring-2 ring-primary"
            )}
          >
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="text-xs">
              {profile?.display_name?.charAt(0) || user.email?.charAt(0) || '?'}
            </AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </div>
  );
};

export default BottomNav;
