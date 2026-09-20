import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { Settings, Upload, Check, X, Loader2, Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { TablesUpdate } from "@/integrations/supabase/types";
import { ImageCropperDialog } from './ImageCropperDialog';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NotificationCategory,
  isCategoryEnabled,
} from '@/lib/notificationPreferences';

const NOTIFICATION_CATEGORY_LABELS: Record<NotificationCategory, string> = {
  likes: 'Curtidas',
  comments: 'Comentários e menções',
  friends: 'Solicitações de amizade',
  nudges: 'Cutucões',
  achievements: 'Conquistas',
  loans: 'Empréstimos de livros',
  messages: 'Mensagens diretas',
};

// Debounce function
const debounce = <Args extends unknown[]>(func: (...args: Args) => void, waitFor: number) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Args): void => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };
};

export function EditProfileDialog() {
  const { user, profile, updateProfile } = useAuth();
  const { toast } = useToast();
  const { isSubscribed, subscribe, unsubscribe, isSupported: notificationsSupported } = usePushNotifications();
  
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    display_name: "",
    username: "",
    bio: "",
    reading_goal: 12,
  });
  const [notificationPreferences, setNotificationPreferences] = useState<Record<NotificationCategory, boolean>>(
    DEFAULT_NOTIFICATION_PREFERENCES
  );

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  const [cropperOpen, setCropperOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);

  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  
  useEffect(() => {
    if (profile) {
      setFormData({
        display_name: profile.display_name || "",
        username: profile.username || "",
        bio: profile.bio || "",
        reading_goal: profile.reading_goal || 12,
      });
      if (profile.avatar_url) {
        setAvatarPreview(`${profile.avatar_url}?t=${new Date().getTime()}`);
      } else {
        setAvatarPreview(null);
      }
      setNotificationPreferences({
        likes: isCategoryEnabled(profile.notification_preferences, 'likes'),
        comments: isCategoryEnabled(profile.notification_preferences, 'comments'),
        friends: isCategoryEnabled(profile.notification_preferences, 'friends'),
        nudges: isCategoryEnabled(profile.notification_preferences, 'nudges'),
        achievements: isCategoryEnabled(profile.notification_preferences, 'achievements'),
        loans: isCategoryEnabled(profile.notification_preferences, 'loans'),
        messages: isCategoryEnabled(profile.notification_preferences, 'messages'),
      });
    }
  }, [profile, open]);

  const checkUsernameAvailability = async (username: string) => {
    if (!username || username === profile?.username) {
      setUsernameAvailable(null);
      return;
    }

    setCheckingUsername(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('username', username)
        .maybeSingle();

      if (error) throw error;
      setUsernameAvailable(!data);
    } catch (error) {
      console.error('Error checking username availability:', error);
      setUsernameAvailable(null);
    } finally {
      setCheckingUsername(false);
    }
  };
  
  const debouncedCheck = debounce(checkUsernameAvailability, 500);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '');
    setFormData({ ...formData, username: value });
    setUsernameAvailable(null);
    debouncedCheck(value);
  }

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
      const fileExt = "jpeg";
      const fileName = `avatar-${user?.id}.${fileExt}`;
      const croppedFile = new File([croppedImageBlob], fileName, { type: `image/${fileExt}` });

      setAvatarFile(croppedFile);
      setAvatarPreview(URL.createObjectURL(croppedFile));
      setCropperOpen(false);
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !user) return profile?.avatar_url ?? null;

    const filePath = `${user.id}/avatar.jpeg`;
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, avatarFile, { upsert: true, contentType: avatarFile.type });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleNotificationToggle = (checked: boolean) => {
    if (checked) {
      subscribe();
    } else {
      unsubscribe();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    
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
        notification_preferences: notificationPreferences,
      };

      const { error } = await updateProfile(updateData);
        
      if (error) {
        if (error.code === '23505') { 
          throw new Error("Este nome de usuário já está em uso.");
        }
        throw error;
      }
      
      setOpen(false);
      setAvatarFile(null);
      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram salvas.",
      });

    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível salvar as alterações.";
      toast({
        title: "Erro ao atualizar",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent);


  return (
    <>
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
          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
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
                onChange={handleFileSelect}
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
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {checkingUsername && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  {!checkingUsername && usernameAvailable === true && <Check className="h-4 w-4 text-green-600" />}
                  {!checkingUsername && usernameAvailable === false && <X className="h-4 w-4 text-destructive" />}
                </div>
              </div>
              {usernameAvailable === false && (
                <p className="text-xs text-destructive">Este nome de usuário já está em uso.</p>
              )}
            </div>
              
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} />
            </div>
              
            <div className="space-y-2">
              <Label htmlFor="reading_goal">Meta de Leitura (Anual)</Label>
              <Input id="reading_goal" type="number" min="1" value={formData.reading_goal} onChange={(e) => setFormData({ ...formData, reading_goal: parseInt(e.target.value) || 1 })} />
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center space-x-2">
                        <Bell className="h-4 w-4" />
                        <Label htmlFor="notifications-switch" className={!notificationsSupported ? "text-muted-foreground" : ""}>
                            Notificações Push
                        </Label>
                    </div>
                    <Switch
                        id="notifications-switch"
                        checked={isSubscribed}
                        onCheckedChange={handleNotificationToggle}
                        disabled={!notificationsSupported}
                    />
                </div>
                {!notificationsSupported && isIos && (
                    <p className="text-xs text-muted-foreground text-center px-3">
                        Para ativar no iPhone, adicione o app à sua Tela de Início pelo menu de compartilhamento do Safari.
                    </p>
                )}
            </div>

            <div className="space-y-2">
                <Label>Quero ser notificada sobre</Label>
                <div className="space-y-2 rounded-lg border p-3">
                    {(Object.keys(NOTIFICATION_CATEGORY_LABELS) as NotificationCategory[]).map((category) => (
                        <div key={category} className="flex items-center justify-between">
                            <Label htmlFor={`notif-${category}`} className="font-normal text-sm">
                                {NOTIFICATION_CATEGORY_LABELS[category]}
                            </Label>
                            <Switch
                                id={`notif-${category}`}
                                checked={notificationPreferences[category]}
                                onCheckedChange={(checked) =>
                                    setNotificationPreferences((prev) => ({ ...prev, [category]: checked }))
                                }
                            />
                        </div>
                    ))}
                </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading || usernameAvailable === false}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Cropper Dialog */}
      <ImageCropperDialog
          open={cropperOpen}
          onOpenChange={setCropperOpen}
          imageSrc={imageToCrop}
          onCropComplete={onCropComplete}
      />
    </>
  );
}
