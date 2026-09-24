import type { Tables } from "@/integrations/supabase/types";
import type { BookFormat } from "@/lib/bookFormats";

export type ReadingStatus = 'reading' | 'completed' | 'want_to_read';

export type Book = Omit<Tables<'books'>, 'reading_status' | 'format'> & {
  reading_status: ReadingStatus;
  format: BookFormat;
};
