import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { APP_UPDATED_FLAG_KEY } from "@/lib/pwaUpdate";

const PULL_THRESHOLD = 70;
const MAX_PULL = 110;

interface PullToRefreshProps {
  children: React.ReactNode;
}

// Navegadores dão o gesto de "puxar pra atualizar" de graça, mas um PWA
// instalado (display: standalone) roda sem a UI do navegador e perde esse
// gesto - por isso só ativamos essa versão customizada nesse modo.
export function PullToRefresh({ children }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const { toast } = useToast();

  // Se essa página carregou por causa de um reload disparado pelo pull,
  // confirma pro usuário que a atualização aconteceu (e mostra a versão,
  // pra dar pra comparar visualmente se o código realmente mudou).
  useEffect(() => {
    try {
      if (sessionStorage.getItem(APP_UPDATED_FLAG_KEY)) {
        sessionStorage.removeItem(APP_UPDATED_FLAG_KEY);
        toast({
          title: "Atualizado! ✨",
          description: `Versão ${__APP_VERSION__}`,
        });
      }
    } catch {
      // sessionStorage indisponível (ex: navegação privada); sem problema.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (!isStandalone) return;

    const onTouchStart = (e: TouchEvent) => {
      startY.current = window.scrollY === 0 ? e.touches[0].clientY : null;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startY.current === null) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta > 0 && window.scrollY === 0) {
        setPullDistance(Math.min(delta * 0.5, MAX_PULL));
      }
    };

    const onTouchEnd = () => {
      if (startY.current === null) return;
      startY.current = null;
      setPullDistance((current) => {
        if (current >= PULL_THRESHOLD) {
          setRefreshing(true);
          try {
            sessionStorage.setItem(APP_UPDATED_FLAG_KEY, "1");
          } catch {
            // sessionStorage indisponível; o reload ainda funciona normalmente.
          }
          window.location.reload();
        }
        return 0;
      });
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  const indicatorHeight = refreshing ? PULL_THRESHOLD : pullDistance;

  return (
    <>
      <div
        className="fixed left-0 right-0 top-0 z-[60] flex items-start justify-center overflow-hidden"
        style={{
          height: indicatorHeight,
          transition: pullDistance === 0 || refreshing ? "height 0.2s ease-out" : "none",
        }}
      >
        <RefreshCw
          className={cn(
            "mt-4 h-5 w-5 text-primary",
            refreshing && "animate-spin",
            !refreshing && pullDistance >= PULL_THRESHOLD && "text-primary",
            !refreshing && pullDistance < PULL_THRESHOLD && "text-muted-foreground"
          )}
          style={{
            transform: refreshing ? undefined : `rotate(${(pullDistance / PULL_THRESHOLD) * 180}deg)`,
            opacity: Math.min(pullDistance / 20, 1),
          }}
        />
      </div>
      <div
        style={{
          transform: `translateY(${indicatorHeight}px)`,
          transition: pullDistance === 0 || refreshing ? "transform 0.2s ease-out" : "none",
        }}
      >
        {children}
      </div>
    </>
  );
}
