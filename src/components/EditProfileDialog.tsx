import { useState, useEffect } from "react";
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
import { Settings, Upload, Check, X, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TablesUpdate } from "@/integrations/supabase/types";

// Debounce function
const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<F>): void => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };
};

export function EditProfileDialog() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    display_name: "",
    username: "",
    bio: "",
    reading_goal: 12,
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  
  // Set initial form data when profile is loaded
  useEffect(() => {
    if (profile) {
      setFormData({
        display_name: profile.display_name || "",
        username: profile.username || "",
        bio: profile.bio || "",
        reading_goal: profile.reading_goal || 12,
      });
      setAvatarPreview(profile.avatar_url || null);
    }
  }, [profile]);

  const checkUsernameAvailability = async (username: string) => {
    if (!username || (profile && username === profile.username)) {
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
      
      setUsernameAvailable(!data && error?.code === 'PGRST116');
    } catch {
      setUsernameAvailable(true);
    } finally {
      setCheckingUsername(false);
    }
  };
  
  const debouncedCheck = debounce(checkUsernameAvailability, 500);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '');
    setFormData({ ...formData, username: value });
    setUsernameAvailable(null); // Reset on change
    debouncedCheck(value);
  }

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
    const fileName = `${user.id}-${new Date().getTime()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, avatarFile, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);
      
    return `${data.publicUrl}?t=${new Date().getTime()}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    
    if (usernameAvailable === false) {
      toast({
        title: "Nome de usuário indisponível",
        description: "Por favor, escolha outro nome de usuário.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      let avatar_url = profile.avatar_url;

      if (avatarFile) {
        avatar_url = await uploadAvatar();
      }

      const updateData: TablesUpdate<'profiles'> = {
        display_name: formData.display_name,
        username: formData.username,
        bio: formData.bio,
        reading_goal: formData.reading_goal,
        avatar_url: avatar_url,
      };

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', user.id);
        
      if (error) {
        if (error.code === '23505') { // Postgres error code for unique_violation
          throw new Error("Este nome de usuário já está em uso. Por favor, escolha outro.");
        }
        throw error;
      }
      
      await refreshProfile(); // Refresh profile data in the context

      setOpen(false);
      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram salvas.",
      });

    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message || "Não foi possível salvar as alterações.",
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
            Atualize suas informações. Clique em salvar quando terminar.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={avatarPreview || undefined} />
              <AvatarFallback>
                {formData.display_name?.charAt(0)?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <Input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
              id="avatar-upload"
            />
            <Button type="button" variant="outline" asChild>
                <Label htmlFor="avatar-upload" className="cursor-pointer flex items-center">
                    <Upload className="h-4 w-4 mr-2" /> Alterar Foto
                </Label>
            </Button>
          </div>
            
          <div className="space-y-2">
            <Label htmlFor="display_name">Nome de Exibição</Label>
            <Input id="display_name" value={formData.display_name} onChange={(e) => setFormData({ ...formData, display_name: e.target.value })} />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="username">Nome de Usuário</Label>
            <div className="relative">
              <Input
                id="username"
                value={formData.username}
                onChange={handleUsernameChange}
                placeholder="ex: leitor_voraz"
                className={`pr-10 ${usernameAvailable === false ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  {checkingUsername && <Loader2 className="h-4 w-4 animate-spin" />}
                  {usernameAvailable === true && <Check className="h-4 w-4 text-green-500" />}
                  {usernameAvailable === false && <X className="h-4 w-4 text-destructive" />}
              </div>
            </div>
            {usernameAvailable === false && <p className="text-sm text-destructive">Nome de usuário indisponível.</p>}
          </div>
            
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} />
          </div>
            
          <div className="space-y-2">
            <Label htmlFor="reading_goal">Meta de Leitura (Anual)</Label>
            <Input id="reading_goal" type="number" min="1" value={formData.reading_goal} onChange={(e) => setFormData({ ...formData, reading_goal: parseInt(e.target.value) || 1 })} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading || checkingUsername || usernameAvailable === false}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
