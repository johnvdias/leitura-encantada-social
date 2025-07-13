import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Camera, Edit, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function EditProfile() {
  const { user, profile, updateProfile } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    display_name: profile?.display_name || "",
    bio: profile?.bio || "",
    avatar_url: profile?.avatar_url || "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

    const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    // Por enquanto, desabilitado até que o bucket seja configurado
    toast({
      title: "Upload Temporariamente Indisponível",
      description: "Use o campo URL de imagem abaixo para adicionar sua foto de perfil",
      variant: "default"
    });

    // Limpar o input
    if (event.target) {
      event.target.value = '';
    }

    return;

      // Criar nome único para o arquivo
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      console.log("Uploading file:", {
        fileName,
        filePath,
        fileSize: file.size,
        fileType: file.type,
      });

      // Upload do arquivo
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error(
          "Upload error details:",
          JSON.stringify(uploadError, null, 2),
        );

        // Tratamento específico para diferentes tipos de erro
        if (uploadError.message?.includes("duplicate")) {
          // Tentar com upsert se arquivo já existe
          const { data: retryData, error: retryError } = await supabase.storage
            .from("avatars")
            .upload(filePath, file, {
              cacheControl: "3600",
              upsert: true,
            });

          if (retryError) {
            console.error(
              "Retry upload error:",
              JSON.stringify(retryError, null, 2),
            );
            throw new Error(
              `Erro no upload: ${retryError.message || "Falha ao fazer upload"}`,
            );
          }
        } else {
          throw new Error(
            `Erro no upload: ${uploadError.message || "Falha ao fazer upload"}`,
          );
        }
      }

      // Obter URL pública
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);

      if (!data?.publicUrl) {
        throw new Error("Não foi possível obter URL da imagem");
      }

      console.log("Upload successful, URL:", data.publicUrl);

      // Atualizar estado local
      setFormData((prev) => ({ ...prev, avatar_url: data.publicUrl }));

      toast({
        title: "Sucesso! 📸",
        description: "Foto de perfil atualizada",
      });
    } catch (error) {
      console.error("Error uploading avatar:", JSON.stringify(error, null, 2));
      console.error("Error message:", error);

      let errorMessage = "Erro desconhecido ao fazer upload";

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "object" && error !== null) {
        errorMessage =
          error.message || error.error_description || JSON.stringify(error);
      }

      toast({
        title: "Erro no Upload",
        description: errorMessage.includes("configurado")
          ? errorMessage
          : `Não foi possível fazer upload: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      console.log("Updating profile with data:", formData);

      const { error } = await updateProfile(formData);

      if (error) {
        console.error("Profile update error:", JSON.stringify(error, null, 2));
        throw error;
      }

      toast({
        title: "Perfil atualizado! ✨",
        description: "Suas informações foram salvas com sucesso",
      });
      setOpen(false);
    } catch (error) {
      console.error("Error updating profile:", JSON.stringify(error, null, 2));

      let errorMessage = "Não foi possível atualizar o perfil";

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "object" && error !== null) {
        errorMessage =
          error.message || error.error_description || "Erro na atualização";
      }

      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      display_name: profile?.display_name || "",
      bio: profile?.bio || "",
      avatar_url: profile?.avatar_url || "",
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        setOpen(newOpen);
        if (newOpen) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Edit className="h-4 w-4" />
          Editar Perfil
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Perfil</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Avatar className="w-24 h-24">
                <AvatarImage src={formData.avatar_url} />
                <AvatarFallback className="text-xl">
                  {formData.display_name?.[0] || user?.email?.[0] || "?"}
                </AvatarFallback>
              </Avatar>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="absolute -bottom-2 -right-2 rounded-full p-2 h-8 w-8"
                onClick={handleAvatarClick}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Camera className="h-3 w-3" />
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Clique no ícone da câmera para fazer upload ou use o campo abaixo
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* URL Input Alternative */}
            <div className="w-full space-y-2">
              <Label htmlFor="avatar_url" className="text-sm">
                URL da Imagem (alternativa)
              </Label>
              <Input
                id="avatar_url"
                value={formData.avatar_url}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    avatar_url: e.target.value,
                  }))
                }
                placeholder="https://exemplo.com/imagem.jpg"
                className="text-sm"
              />
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="display_name">Nome de Exibição</Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    display_name: e.target.value,
                  }))
                }
                placeholder="Seu nome para exibição"
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, bio: e.target.value }))
                }
                placeholder="Conte um pouco sobre você e seus gostos literários..."
                maxLength={200}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                {formData.bio.length}/200 caracteres
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}