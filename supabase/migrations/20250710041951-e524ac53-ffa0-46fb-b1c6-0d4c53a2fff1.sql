-- Create reading_history table for tracking progress over time
CREATE TABLE public.reading_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  previous_progress INTEGER NOT NULL DEFAULT 0,
  new_progress INTEGER NOT NULL DEFAULT 0,
  pages_read INTEGER,
  reading_session_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.reading_history ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own reading history" 
ON public.reading_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reading history" 
ON public.reading_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reading history" 
ON public.reading_history 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reading history" 
ON public.reading_history 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add index for better performance on queries
CREATE INDEX idx_reading_history_book_user ON public.reading_history(book_id, user_id);
CREATE INDEX idx_reading_history_created_at ON public.reading_history(created_at);

-- Add a field to track last reading session to books table
ALTER TABLE public.books 
ADD COLUMN last_read_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN current_page INTEGER DEFAULT 0;