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
import { Upload, Loader2, Check, X, FileUp } from "lucide-react";
import { useLibraryBooks } from "@/hooks/useLibraryBooks";
import { extractEpubMetadata } from "@/lib/epubMetadata";
import { useToast } from "@/hooks/use-toast";

interface BulkItem {
  file: File;
  title: string;
  author: string;
  status: 'extracting' | 'ready' | 'uploading' | 'done' | 'error';
  errorMsg?: string;
}

export function BulkAddLibraryBooksDialog() {
  const { addBooksBulk } = useLibraryBooks();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<BulkItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((f) => f.name.toLowerCase().endsWith('.epub'));
    if (files.length === 0) return;

    const initial: BulkItem[] = files.map((file) => ({
      file,
      title: file.name.replace(/\.epub$/i, ''),
      author: '',
      status: 'extracting',
    }));
    setItems(initial);

    await Promise.all(
      files.map(async (file, index) => {
        const metadata = await extractEpubMetadata(file);
        setItems((prev) =>
          prev.map((item, i) =>
            i === index
              ? { ...item, title: metadata?.title || item.title, author: metadata?.author || '', status: 'ready' }
              : item
          )
        );
      })
    );
  };

  const updateItem = (index: number, field: 'title' | 'author', value: string) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const handleSubmit = async () => {
    const readyItems = items.filter((i) => i.status === 'ready' || i.status === 'error');
    if (readyItems.length === 0) return;

    setSubmitting(true);
    setItems((prev) => prev.map((item) => (item.status === 'ready' || item.status === 'error' ? { ...item, status: 'uploading' } : item)));

    let successCount = 0;
    let errorCount = 0;

    try {
      await addBooksBulk(
        readyItems.map((i) => ({ file: i.file, title: i.title.trim() || i.file.name, author: i.author.trim() || 'Autora desconhecida' })),
        (relativeIndex, result) => {
          if (result.success) successCount++;
          else errorCount++;

          const originalIndex = items.indexOf(readyItems[relativeIndex]);
          setItems((prev) =>
            prev.map((item, i) =>
              i === originalIndex ? { ...item, status: result.success ? 'done' : 'error', errorMsg: result.error } : item
            )
          );
        }
      );

      toast({
        title: 'Importação concluída!',
        description: errorCount > 0
          ? `${successCount} adicionado(s), ${errorCount} falharam.`
          : `${successCount} livro(s) adicionado(s) à biblioteca.`,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setItems([]);
    }
    setOpen(isOpen);
  };

  const allDone = items.length > 0 && items.every((i) => i.status === 'done' || i.status === 'error');

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <FileUp className="h-4 w-4 mr-2" />
          Adicionar vários
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar vários livros de uma vez</DialogTitle>
          <DialogDescription>
            Selecione todos os arquivos .epub. Título e autora são lidos automaticamente de cada
            arquivo - revise antes de enviar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {items.length === 0 && (
            <div className="space-y-2">
              <Label htmlFor="bulk-files">Arquivos EPUB</Label>
              <Input id="bulk-files" type="file" accept=".epub" multiple onChange={handleFilesSelected} />
            </div>
          )}

          {items.length > 0 && (
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="rounded-lg border p-3 space-y-2">
                  <p className="text-xs text-muted-foreground truncate" title={item.file.name}>
                    {item.file.name}
                  </p>
                  {item.status === 'extracting' ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Lendo metadados...
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        value={item.title}
                        placeholder="Título"
                        onChange={(e) => updateItem(index, 'title', e.target.value)}
                        disabled={item.status === 'uploading' || item.status === 'done'}
                        className="text-sm"
                      />
                      <Input
                        value={item.author}
                        placeholder="Autora"
                        onChange={(e) => updateItem(index, 'author', e.target.value)}
                        disabled={item.status === 'uploading' || item.status === 'done'}
                        className="text-sm"
                      />
                      <div className="flex items-center shrink-0 w-6 justify-center">
                        {item.status === 'uploading' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                        {item.status === 'done' && <Check className="h-4 w-4 text-green-600" />}
                        {item.status === 'error' && <X className="h-4 w-4 text-destructive" />}
                      </div>
                    </div>
                  )}
                  {item.status === 'error' && item.errorMsg && (
                    <p className="text-xs text-destructive">{item.errorMsg}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {items.length > 0 && !allDone && (
            <Button
              onClick={handleSubmit}
              disabled={submitting || items.some((i) => i.status === 'extracting')}
              className="w-full"
            >
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Adicionar todos ({items.length})
            </Button>
          )}

          {allDone && (
            <Button variant="outline" onClick={() => handleClose(false)} className="w-full">
              Fechar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
