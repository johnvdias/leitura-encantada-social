CREATE TABLE club_schedule_participants (
    club_schedule_id UUID REFERENCES public.club_reading_schedules(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    progress INTEGER DEFAULT 0 NOT NULL,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (club_schedule_id, user_id)
);