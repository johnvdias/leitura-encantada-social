import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Upload, Camera } from "lucide-react";
import { ImageCropperDialog } from "@/components/ImageCropperDialog";

// Tela de bloqueio mostrada logo após o cadastro: só contas novas (ver
// profiles.requires_avatar_setup) ficam presas aqui até enviar uma foto de
// perfil. Contas antigas sem foto não passam por essa checagem.
export function RequireAvatarGate() {
  const { user, updateProfile, signOut } = useAuth();
  const { toast } = useToast();

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageToCrop(reader.result as string);
        setCropperOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = (croppedImageBlob: Blob) => {
    const croppedFile = new File([croppedImageBlob], `avatar-${user?.id}.jpeg`, { type: "image/jpeg" });
    setAvatarFile(croppedFile);
    setAvatarPreview(URL.createObjectURL(croppedFile));
    setCropperOpen(false);
  };

  const handleSave = async () => {
    if (!avatarFile || !user) return;
    setSaving(true);
    try {
      const filePath = `${user.id}/avatar.jpeg`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, { upsert: true, contentType: avatarFile.type });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const { error } = await updateProfile({
        avatar_url: `${data.publicUrl}?t=${Date.now()}`,
        requires_avatar_setup: false,
      });
      if (error) throw error;

      toast({ title: "Foto salva! 🎉", description: "Agora sim, bem-vinda à Leitura Encantada!" });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar sua foto. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-soft flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle>Só mais um passo! 📸</CardTitle>
            <CardDescription>
              Para continuar, adicione uma foto de perfil. Assim suas amigas de
              leitura conseguem te reconhecer no app.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <Avatar className="h-28 w-28">
              <AvatarImage src={avatarPreview || undefined} />
              <AvatarFallback>
                <Camera className="h-10 w-10 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>

            <Input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="required-avatar-upload"
            />
            <Button type="button" variant="outline" asChild>
              <Label htmlFor="required-avatar-upload" className="cursor-pointer flex items-center">
                <Upload className="h-4 w-4 mr-2" /> Escolher foto
              </Label>
            </Button>

            <Button onClick={handleSave} disabled={!avatarFile || saving} className="w-full">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar e continuar
            </Button>

            <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground">
              Sair
            </Button>
          </CardContent>
        </Card>
      </div>

      <ImageCropperDialog
        open={cropperOpen}
        onOpenChange={setCropperOpen}
        imageSrc={imageToCrop}
        onCropComplete={onCropComplete}
      />
    </>
  );
}
