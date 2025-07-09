import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { BookHeart, Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-soft">
      <div className="text-center max-w-md mx-auto px-4">
        <BookHeart className="w-24 h-24 text-primary mx-auto mb-6" />
        <h1 className="text-6xl font-enchanted text-enchanted mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-foreground mb-4">
          Página Não Encontrada
        </h2>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          Ops! Parece que esta página se perdeu entre as páginas dos livros. 
          Que tal voltarmos para sua estante encantada?
        </p>
        <Link to="/">
          <Button className="btn-enchanted">
            <Home className="w-4 h-4 mr-2" />
            Voltar ao Início
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
