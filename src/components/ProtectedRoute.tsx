import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { RequireAvatarGate } from '@/components/RequireAvatarGate';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const LoadingScreen = () => (
  <div className="min-h-screen bg-gradient-soft flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      <p className="mt-4 text-muted-foreground">Carregando...</p>
    </div>
  </div>
);

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // O perfil é buscado de forma assíncrona separada do loading de sessão -
  // sem essa checagem, a tela de foto obrigatória piscaria por engano pra
  // quem já tem foto, enquanto o perfil ainda não chegou.
  if (!profile) {
    return <LoadingScreen />;
  }

  if (profile.requires_avatar_setup && !profile.avatar_url) {
    return <RequireAvatarGate />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;