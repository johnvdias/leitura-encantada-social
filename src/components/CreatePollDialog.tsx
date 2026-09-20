import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Vote, Plus, X, Loader2 } from "lucide-react";

interface Candidate {
  title: string;
  author: string;
}

interface CreatePollDialogProps {
  onCreate: (candidates: Candidate[]) => Promise<void>;
}

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 4;

export function CreatePollDialog({ onCreate }: CreatePollDialogProps) {
  const [open, setOpen] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([{ title: "", author: "" }, { title: "", author: "" }]);
  const [saving, setSaving] = useState(false);

  const updateCandidate = (index: number, field: keyof Candidate, value: string) => {
    setCandidates((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  };

  const addCandidate = () => {
    if (candidates.length >= MAX_OPTIONS) return;
    setCandidates((prev) => [...prev, { title: "", author: "" }]);
  };

  const removeCandidate = (index: number) => {
    if (candidates.length <= MIN_OPTIONS) return;
    setCandidates((prev) => prev.filter((_, i) => i !== index));
  };

  const isValid = candidates.every((c) => c.title.trim() && c.author.trim());

  const handleSubmit = async () => {
    if (!isValid) return;
    setSaving(true);
    try {
      await onCreate(candidates.map((c) => ({ title: c.title.trim(), author: c.author.trim() })));
      setOpen(false);
      setCandidates([{ title: "", author: "" }, { title: "", author: "" }]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Vote className="h-4 w-4 mr-2" />
          Criar votação
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Votação do próximo livro</DialogTitle>
          <DialogDescription>Proponha de 2 a 4 opções pras membros escolherem.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {candidates.map((candidate, index) => (
            <div key={index} className="flex items-end gap-2">
              <div className="flex-1 space-y-2">
                <Label htmlFor={`title-${index}`}>Opção {index + 1}</Label>
                <Input
                  id={`title-${index}`}
                  placeholder="Título"
                  value={candidate.title}
                  onChange={(e) => updateCandidate(index, 'title', e.target.value)}
                />
                <Input
                  placeholder="Autora"
                  value={candidate.author}
                  onChange={(e) => updateCandidate(index, 'author', e.target.value)}
                />
              </div>
              {candidates.length > MIN_OPTIONS && (
                <Button variant="ghost" size="icon" onClick={() => removeCandidate(index)} className="mb-1">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}

          {candidates.length < MAX_OPTIONS && (
            <Button variant="outline" size="sm" onClick={addCandidate} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar opção
            </Button>
          )}

          <Button onClick={handleSubmit} disabled={!isValid || saving} className="w-full">
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Iniciar votação
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
