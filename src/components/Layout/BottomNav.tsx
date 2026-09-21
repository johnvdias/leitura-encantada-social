import { Link, useLocation } from "react-router-dom";
import { Home, BookOpen, Users, MessageSquare, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const BottomNav = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  if (!user) {
    return null; // Não mostra a barra de navegação se o usuário não estiver logado
  }

  const navLinks = [
    { href: "/feed", label: "Feed", icon: MessageSquare },
    { href: "/clubes", label: "Clubes", icon: Users },
    { href: "/estante", label: "Estante", icon: BookOpen },
    { href: "/perfil", label: "Perfil", icon: User },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 z-50 w-full h-24 bg-background/95 backdrop-blur border-t">
      <div className="grid h-full max-w-lg grid-cols-4 mx-auto font-medium pb-4">
        {navLinks.map(({ href, label, icon: Icon }) => (
          <Link
            key={label}
            to={href}
            className={cn(
              "inline-flex flex-col items-center justify-center px-5 hover:bg-muted",
              isActive(href) ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className="w-5 h-5 mb-1" />
            <span className="text-xs">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default BottomNav;
