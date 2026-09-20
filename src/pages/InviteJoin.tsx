import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Link2 } from "lucide-react";

export const PENDING_INVITE_KEY = "pending-club-invite-code";

const InviteJoin = () => {
  const { code } = useParams<{ code: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !code) return;

    if (!user) {
      try {
        sessionStorage.setItem(PENDING_INVITE_KEY, code);
      } catch {
        // sessionStorage indisponível; o link continua funcionando, só não
        // volta sozinho pro convite depois do login.
      }
      return;
    }

    let cancelled = false;
    (async () => {
      const { data: clubId, error: joinError } = await supabase.rpc('join_club_by_invite_code', {
        p_invite_code: code,
      });

      if (cancelled) return;

      if (joinError || !clubId) {
        setError("Esse convite não é mais válido.");
        return;
      }

      try {
        sessionStorage.removeItem(PENDING_INVITE_KEY);
      } catch {
        // sessionStorage indisponível; sem problema, não há mais nada pra limpar.
      }
      navigate(`/clubes/${clubId}`, { replace: true });
    })();

    return () => { cancelled = true; };
  }, [authLoading, user, code, navigate]);

  return (
    <div className="container mx-auto px-4 py-16 flex justify-center">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <Link2 className="h-10 w-10 mx-auto mb-2 text-primary" />
          <CardTitle>Convite pra clube</CardTitle>
          {!error && <CardDescription>Entrando no clube...</CardDescription>}
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="space-y-4">
              <p className="text-muted-foreground">{error}</p>
              <Button asChild>
                <Link to="/clubes">Ver meus clubes</Link>
              </Button>
            </div>
          ) : !user && !authLoading ? (
            <div className="space-y-4">
              <p className="text-muted-foreground">Faça login pra entrar no clube com esse convite.</p>
              <Button asChild>
                <Link to="/auth">Entrar</Link>
              </Button>
            </div>
          ) : (
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InviteJoin;
