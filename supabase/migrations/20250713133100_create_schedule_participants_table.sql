CREATE TABLE schedule_participants (
    schedule_id UUID REFERENCES public.group_reading_schedules(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'invited', -- e.g., 'invited', 'accepted', 'declined'
    joined_at TIMESTAMPTZ,
    PRIMARY KEY (schedule_id, user_id)
);

COMMENT ON COLUMN schedule_participants.status IS 'Status of the invitation, e.g., ''invited'', ''accepted'', ''declined''';
