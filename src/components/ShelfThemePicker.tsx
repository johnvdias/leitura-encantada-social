import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Palette, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { SHELF_THEMES } from "@/lib/shelfThemes";
import { cn } from "@/lib/utils";

export function ShelfThemePicker() {
  const { profile, updateProfile } = useAuth();
  const { toast } = useToast();
  const current = profile?.shelf_theme || 'default';

  const handleSelect = async (themeId: string) => {
    const { error } = await updateProfile({ shelf_theme: themeId });
    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível salvar o tema.', variant: 'destructive' });
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" title="Tema de cor da estante">
          <Palette className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56" align="end">
        <p className="text-sm font-medium mb-3">Tema de cor da estante</p>
        <div className="grid grid-cols-5 gap-2">
          {SHELF_THEMES.map((theme) => (
            <button
              key={theme.id}
              type="button"
              title={theme.name}
              onClick={() => handleSelect(theme.id)}
              className={cn(
                "h-9 w-9 rounded-full flex items-center justify-center border-2 transition-transform hover:scale-110",
                current === theme.id ? "border-foreground" : "border-transparent"
              )}
              style={{ backgroundColor: theme.swatch }}
            >
              {current === theme.id && <Check className="h-4 w-4 text-white drop-shadow" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
