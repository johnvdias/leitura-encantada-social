CREATE TABLE nudges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- e.g., 'no_progress', 'inactive_feed', 'generic'
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN nudges.type IS 'The type of nudge, e.g., ''no_progress'', ''inactive_feed'', ''generic''';
