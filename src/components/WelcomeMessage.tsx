import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, BookOpen, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface WelcomeMessageProps {
  isFirstTime?: boolean;
  onDismiss?: () => void;
  className?: string;
}

export function WelcomeMessage({
  isFirstTime = false,
  onDismiss,
  className,
}: WelcomeMessageProps) {
  const { user, profile } = useAuth();
  const [isVisible, setIsVisible] = useState(true);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const getUserName = () => {
    return profile?.display_name || profile?.username || "Leitor(a)";
  };

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible || !user) return null;

  return (
    <Card
      className={cn(
        "mb-6 border-2 border-dashed border-primary/30 bg-gradient-to-r from-primary/5 to-secondary/5",
        className,
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-lg font-semibold text-primary">
                {getGreeting()}!
              </span>
            </div>

            {isFirstTime ? (
              <div className="space-y-2">
                <p className="text-lg">
                  <span className="font-semibold">
                    Seja bem-vindo(a) à Estante Encantada, {getUserName()}!
                  </span>{" "}
                  🎉
                </p>
                <p className="text-muted-foreground">
                  Estamos muito felizes em ter você conosco! Esta é uma
                  comunidade acolhedora onde leitores apaixonados se conectam,
                  compartilham descobertas literárias e celebram o amor pelos
                  livros.
                </p>
                <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    <span>Comece adicionando seus primeiros livros</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-lg">
                  <span className="font-semibold">
                    Seja bem-vindo(a) de volta, {getUserName()}!
                  </span>{" "}
                  📚
                </p>
                <p className="text-muted-foreground">
                  Que bom ter você aqui novamente! Pronto(a) para mais aventuras
                  literárias?
                </p>
              </div>
            )}
          </div>

          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="ml-4 h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Hook para controlar quando mostrar a mensagem
export function useWelcomeMessage() {
  const { user, profile } = useAuth();
  const [shouldShow, setShouldShow] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);

  useEffect(() => {
    if (user && profile) {
      const lastWelcome = localStorage.getItem(`welcome-${user.id}`);
      const today = new Date().toDateString();

      if (!lastWelcome) {
        // Primeira vez - mostrar mensagem de boas-vindas completa
        setIsFirstTime(true);
        setShouldShow(true);
      } else if (lastWelcome !== today) {
        // Não é o primeiro acesso hoje - mostrar mensagem de volta
        setIsFirstTime(false);
        setShouldShow(true);
      }
    }
  }, [user, profile]);

  const dismissWelcome = () => {
    if (user) {
      localStorage.setItem(`welcome-${user.id}`, new Date().toDateString());
    }
    setShouldShow(false);
  };

  return {
    shouldShow,
    isFirstTime,
    dismissWelcome,
  };
}
