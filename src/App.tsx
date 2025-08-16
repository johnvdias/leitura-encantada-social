import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Header from "@/components/Layout/Header";
import BottomNav from "@/components/Layout/BottomNav";
import { NotificationPermissionManager } from "@/components/NotificationPermissionManager";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Estante from "./pages/Estante";
import Feed from "./pages/Feed";
import Clubes from "./pages/Clubes";
import Perfil from "./pages/Perfil";
import ClubePage from "./pages/ClubePage";
import UserProfile from "./pages/UserProfile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Component to render notification manager for logged-in users
const MainApp = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  return (
    <>
      {user && <NotificationPermissionManager />}
      {children}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <MainApp>
            <div className="min-h-screen bg-gradient-soft pb-16 md:pb-0">
              <Header />
              <main className="pb-16 md:pb-0">
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/estante" element={
                    <ProtectedRoute>
                      <Estante />
                    </ProtectedRoute>
                  } />
                  <Route path="/feed" element={
                    <ProtectedRoute>
                      <Feed />
                    </ProtectedRoute>
                  } />
                  <Route path="/clubes" element={
                    <ProtectedRoute>
                      <Clubes />
                    </ProtectedRoute>
                  } />
                  <Route path="/perfil" element={
                    <ProtectedRoute>
                      <Perfil />
                    </ProtectedRoute>
                  } />
                  <Route path="/perfil/:userId" element={
                    <ProtectedRoute>
                      <UserProfile />
                    </ProtectedRoute>
                  } />
                  <Route path="/clubes/:clubId" element={
                    <ProtectedRoute>
                      <ClubePage />
                    </ProtectedRoute>
                  } />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
              <BottomNav />
            </div>
          </MainApp>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
