import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Shield, Eye, Bell, Download, Trash2, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PrivacySettings {
  profile_visibility: "public" | "friends" | "private";
  show_reading_activity: boolean;
  show_statistics: boolean;
  show_achievements: boolean;
  allow_friend_requests: boolean;
  email_notifications: boolean;
  app_notifications: boolean;
  reading_recommendations: boolean;
}

export function PrivacySettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<PrivacySettings>({
    profile_visibility: "public",
    show_reading_activity: true,
    show_statistics: true,
    show_achievements: true,
    allow_friend_requests: true,
    email_notifications: true,
    app_notifications: true,
    reading_recommendations: true,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_privacy_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error("Error loading privacy settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase.from("user_privacy_settings").upsert({
        user_id: user.id,
        ...settings,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast({
        title: "Configurações salvas! ✅",
        description: "Suas preferências de privacidade foram atualizadas",
      });
    } catch (error) {
      console.error("Error saving privacy settings:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const exportData = async () => {
    if (!user) return;

    try {
      // Buscar todos os dados do usuário
      const [
        booksResult,
        profileResult,
        achievementsResult,
        friendshipsResult,
      ] = await Promise.all([
        supabase.from("books").select("*").eq("user_id", user.id),
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
        supabase.from("achievements").select("*").eq("user_id", user.id),
        supabase
          .from("friendships")
          .select("*")
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
      ]);

      const userData = {
        profile: profileResult.data,
        books: booksResult.data,
        achievements: achievementsResult.data,
        friendships: friendshipsResult.data,
        exported_at: new Date().toISOString(),
        user_id: user.id,
      };

      // Criar arquivo para download
      const dataStr = JSON.stringify(userData, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `estante-encantada-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Dados exportados! 📥",
        description: "Seu backup foi baixado com sucesso",
      });
    } catch (error) {
      console.error("Error exporting data:", error);
      toast({
        title: "Erro",
        description: "Não foi possível exportar os dados",
        variant: "destructive",
      });
    }
  };

  const deleteAccount = async () => {
    if (!user) return;

    try {
      // Deletar dados do usuário (em ordem devido às foreign keys)
      await supabase.from("reading_history").delete().eq("user_id", user.id);
      await supabase.from("achievements").delete().eq("user_id", user.id);
      await supabase.from("club_members").delete().eq("user_id", user.id);
      await supabase.from("notifications").delete().eq("user_id", user.id);
      await supabase.from("posts").delete().eq("user_id", user.id);
      await supabase.from("books").delete().eq("user_id", user.id);
      await supabase
        .from("friendships")
        .delete()
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
      await supabase.from("profiles").delete().eq("user_id", user.id);

      // Deletar conta do usuário
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      if (error) throw error;

      toast({
        title: "Conta deletada",
        description: "Sua conta foi removida permanentemente",
      });

      // Fazer logout
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error deleting account:", error);
      toast({
        title: "Erro",
        description: "Não foi possível deletar a conta",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">Carregando configurações...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Visibilidade do Perfil */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Visibilidade do Perfil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Quem pode ver seu perfil?</Label>
            <Select
              value={settings.profile_visibility}
              onValueChange={(value: "public" | "friends" | "private") =>
                setSettings((prev) => ({ ...prev, profile_visibility: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">
                  Público - Qualquer pessoa
                </SelectItem>
                <SelectItem value="friends">
                  Amigos - Apenas seus amigos
                </SelectItem>
                <SelectItem value="private">Privado - Apenas você</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Mostrar atividade de leitura</Label>
                <p className="text-sm text-muted-foreground">
                  Livros que você está lendo e progresso
                </p>
              </div>
              <Switch
                checked={settings.show_reading_activity}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({
                    ...prev,
                    show_reading_activity: checked,
                  }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Mostrar estatísticas</Label>
                <p className="text-sm text-muted-foreground">
                  Gráficos e números de leitura
                </p>
              </div>
              <Switch
                checked={settings.show_statistics}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, show_statistics: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Mostrar conquistas</Label>
                <p className="text-sm text-muted-foreground">
                  Selos e badges conquistados
                </p>
              </div>
              <Switch
                checked={settings.show_achievements}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({
                    ...prev,
                    show_achievements: checked,
                  }))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configurações Sociais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Configurações Sociais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Permitir solicitações de amizade</Label>
              <p className="text-sm text-muted-foreground">
                Outras pessoas podem te enviar pedidos de amizade
              </p>
            </div>
            <Switch
              checked={settings.allow_friend_requests}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({
                  ...prev,
                  allow_friend_requests: checked,
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Notificações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Notificações por email</Label>
              <p className="text-sm text-muted-foreground">
                Receber atualizações importantes por email
              </p>
            </div>
            <Switch
              checked={settings.email_notifications}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({
                  ...prev,
                  email_notifications: checked,
                }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Notificações no app</Label>
              <p className="text-sm text-muted-foreground">
                Receber notificações dentro da plataforma
              </p>
            </div>
            <Switch
              checked={settings.app_notifications}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({ ...prev, app_notifications: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Recomendações de leitura</Label>
              <p className="text-sm text-muted-foreground">
                Receber sugestões de livros personalizadas
              </p>
            </div>
            <Switch
              checked={settings.reading_recommendations}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({
                  ...prev,
                  reading_recommendations: checked,
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Gerenciamento de Dados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Gerenciamento de Dados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Exportar seus dados</Label>
              <p className="text-sm text-muted-foreground">
                Baixe uma cópia de todos os seus dados
              </p>
            </div>
            <Button variant="outline" onClick={exportData}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-red-600">Deletar conta</Label>
              <p className="text-sm text-muted-foreground">
                Remove permanentemente sua conta e dados
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Deletar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Deletar Conta Permanentemente
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Todos os seus dados
                    incluindo livros, amigos, conquistas e atividades serão
                    removidos permanentemente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={deleteAccount}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Deletar Permanentemente
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Botão de Salvar */}
      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </div>
    </div>
  );
}
