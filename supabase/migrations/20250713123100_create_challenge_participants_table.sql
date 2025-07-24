CREATE TABLE challenge_participants (
  challenge_id UUID REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0 NOT NULL,
  status TEXT NOT NULL DEFAULT 'invited', -- e.g., 'invited', 'accepted', 'declined'
  joined_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (challenge_id, user_id)
);

COMMENT ON COLUMN challenge_participants.status IS 'Status of the invitation, e.g., ''invited'', ''accepted'', ''declined''';