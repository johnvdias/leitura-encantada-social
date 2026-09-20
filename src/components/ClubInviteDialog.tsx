import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link2, Copy, RefreshCw } from "lucide-react";

interface ClubInviteDialogProps {
  clubId: string;
  inviteCode: string | null;
  onCodeGenerated: (code: string) => void;
}

export function ClubInviteDialog({ clubId, inviteCode, onCodeGenerated }: ClubInviteDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const inviteUrl = inviteCode ? `${window.location.origin}/convite/${inviteCode}` : null;

  const generateCode = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('regenerate_club_invite_code', { p_club_id: clubId });
      if (error) throw error;
      onCodeGenerated(data);
    } catch (error) {
      console.error('Error generating invite code:', error);
      toast({ title: "Erro", description: "Não foi possível gerar o convite.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && !inviteCode) {
      generateCode();
    }
  };

  const copyLink = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast({ title: "Link copiado! 🔗" });
    } catch {
      toast({ title: "Não foi possível copiar", description: "Copie o link manualmente.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Link2 className="h-4 w-4 mr-2" />
          Convidar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Convidar pra o clube
          </DialogTitle>
          <DialogDescription>
            Qualquer pessoa com esse link entra direto no clube, sem precisar de aprovação.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Input value={loading ? "Gerando..." : (inviteUrl || "")} readOnly className="flex-1" />
          <Button variant="outline" size="icon" onClick={copyLink} disabled={!inviteUrl || loading} className="shrink-0">
            <Copy className="h-4 w-4" />
          </Button>
        </div>

        <Button variant="ghost" size="sm" onClick={generateCode} disabled={loading} className="w-fit gap-2">
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          Gerar novo link (invalida o anterior)
        </Button>
      </DialogContent>
    </Dialog>
  );
}
