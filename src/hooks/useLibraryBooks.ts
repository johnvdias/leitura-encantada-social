import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";

export type LibraryBook = Tables<'library_books'>;

const BUCKET = 'library-epubs';

export const useLibraryBooks = () => {
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('library_books')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBooks(data || []);
    } catch (error) {
      console.error('Error fetching library books:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const addBook = async (
    file: File,
    details: { title: string; author: string; description?: string; genre?: string; cover_url?: string }
  ) => {
    if (!user) return;

    const filePath = `${crypto.randomUUID()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(filePath, file, {
      contentType: 'application/epub+zip',
    });
    if (uploadError) throw uploadError;

    const { error: insertError } = await supabase.from('library_books').insert({
      title: details.title,
      author: details.author,
      description: details.description || null,
      genre: details.genre || null,
      cover_url: details.cover_url || null,
      file_path: filePath,
      file_size_bytes: file.size,
      added_by: user.id,
    });

    if (insertError) {
      await supabase.storage.from(BUCKET).remove([filePath]);
      throw insertError;
    }

    await fetchBooks();
  };

  const removeBook = async (book: LibraryBook) => {
    try {
      await supabase.storage.from(BUCKET).remove([book.file_path]);
      const { error } = await supabase.from('library_books').delete().eq('id', book.id);
      if (error) throw error;
      await fetchBooks();
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível remover o livro.', variant: 'destructive' });
    }
  };

  const downloadBook = async (book: LibraryBook) => {
    setDownloadingId(book.id);
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(book.file_path, 60, { download: `${book.title}.epub` });

      if (error || !data?.signedUrl) throw error || new Error('Sem URL de download');

      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível baixar o livro. Tente novamente.', variant: 'destructive' });
    } finally {
      setDownloadingId(null);
    }
  };

  return { books, loading, downloadingId, addBook, removeBook, downloadBook, refetch: fetchBooks };
};
