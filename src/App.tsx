import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import Header from "@/components/Layout/Header";
import BottomNav from "@/components/Layout/BottomNav";
import { PullToRefresh } from "@/components/PullToRefresh";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Estante from "./pages/Estante";
import Feed from "./pages/Feed";
import Clubes from "./pages/Clubes";
import Perfil from "./pages/Perfil";
import ClubePage from "./pages/ClubePage";
import UserProfile from "./pages/UserProfile";
import InviteJoin from "./pages/InviteJoin";
import Mensagens from "./pages/Mensagens";
import Conversa from "./pages/Conversa";
import PostDetail from "./pages/PostDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="estante-theme">
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <div className="min-h-screen bg-gradient-soft pb-24 md:pb-0">
              {/* BottomNav fica fora do PullToRefresh: um ancestral com
                  transform vira o "containing block" de elementos com
                  position: fixed, o que quebrava o posicionamento fixo
                  da barra inferior. */}
              <PullToRefresh>
                <Header />
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
                  <Route path="/mensagens" element={
                    <ProtectedRoute>
                      <Mensagens />
                    </ProtectedRoute>
                  } />
                  <Route path="/mensagens/:userId" element={
                    <ProtectedRoute>
                      <Conversa />
                    </ProtectedRoute>
                  } />
                  <Route path="/post/:postId" element={
                    <ProtectedRoute>
                      <PostDetail />
                    </ProtectedRoute>
                  } />
                  {/* Sem ProtectedRoute de propósito: essa página trata os
                      dois casos (logada/deslogada) ela mesma - um redirect
                      duro perderia o código do convite da URL. */}
                  <Route path="/convite/:code" element={<InviteJoin />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </PullToRefresh>
              <BottomNav />
            </div>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
