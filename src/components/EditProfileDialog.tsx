import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Settings, Upload, Check, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TablesUpdate } from "@/integrations/supabase/types";

export function EditProfileDialog() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    display_name: profile?.display_name || "",
    username: profile?.username || "",
    bio: profile?.bio || "",
    reading_goal: profile?.reading_goal || 12,
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  const checkUsernameAvailability = async (username: string) => {
    if (!username || username === profile?.username) {
      setUsernameAvailable(null);
      return;
    }

    setCheckingUsername(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .single();

      setUsernameAvailable(error?.code === 'PGRST116'); // No rows found = available
    } catch (error) {
      setUsernameAvailable(true);
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const preview = URL.createObjectURL(file);
      setAvatarPreview(preview);
    }
  };

  const uploadAvatar = async () => {
    if (!avatarFile || !user) return null;

    const fileExt = avatarFile.name.split('.').pop();
    const fileName = `${user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, avatarFile, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (formData.username && usernameAvailable === false) {
      toast({
        title: "Erro",
        description: "Este nome de usuário já está em uso.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      let avatar_url = profile?.avatar_url;

      if (avatarFile) {
        avatar_url = await uploadAvatar();
      }

      const updateData: TablesUpdate<'profiles'> = {
        display_name: formData.display_name,
        bio: formData.bio,
        reading_goal: formData.reading_goal,
      };

      if (formData.username) {
        updateData.username = formData.username;
      }

      if (avatar_url) {
        updateData.avatar_url = avatar_url;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', user.id);

      if (error) throw error;

      setOpen(false);
      window.location.reload();
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram salvas com sucesso.",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o perfil.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Editar Perfil
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Perfil</DialogTitle>
          <DialogDescription>
            Atualize suas informações pessoais e preferências.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Foto de Perfil</Label>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={avatarPreview || profile?.avatar_url} />
                  <AvatarFallback>
                    {profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                    id="avatar-upload"
                  />
                  <Label htmlFor="avatar-upload" className="cursor-pointer">
                    <Button type="button" variant="outline" asChild>
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        Alterar Foto
                      </span>
                    </Button>
                  </Label>
                </div>
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="display_name">Nome de Exibição</Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                placeholder="Seu nome"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="username">Nome de Usuário</Label>
              <div className="relative">
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => {
                    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                    setFormData({ ...formData, username: value });
                    checkUsernameAvailability(value);
                  }}
                  placeholder="seu_username"
                  className={usernameAvailable === false ? "border-destructive" : usernameAvailable === true ? "border-green-500" : ""}
                />
                {checkingUsername && <span className="absolute right-3 top-3 text-xs text-muted-foreground">Verificando...</span>}
                {usernameAvailable === true && <Check className="absolute right-3 top-3 h-4 w-4 text-green-500" />}
                {usernameAvailable === false && <X className="absolute right-3 top-3 h-4 w-4 text-destructive" />}
              </div>
              {usernameAvailable === false && (
                <p className="text-xs text-destructive">Este nome de usuário já está em uso</p>
              )}
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Conte um pouco sobre você e seus gostos literários..."
                rows={3}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="reading_goal">Meta de Leitura (livros/ano)</Label>
              <Input
                id="reading_goal"
                type="number"
                min="1"
                max="365"
                value={formData.reading_goal}
                onChange={(e) => setFormData({ ...formData, reading_goal: parseInt(e.target.value) || 12 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}