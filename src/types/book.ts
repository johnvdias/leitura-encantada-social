import type { Tables } from "@/integrations/supabase/types";

export type ReadingStatus = 'reading' | 'completed' | 'want_to_read';

export type Book = Omit<Tables<'books'>, 'reading_status'> & {
  reading_status: ReadingStatus;
};
