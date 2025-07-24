CREATE TABLE club_reading_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    reading_goal JSONB, -- e.g., [{ "date": "2024-08-10", "target": "page_100" }]
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN club_reading_schedules.reading_goal IS 'Intermediate goals, e.g., [{ "date": "2024-08-10", "target": "page_100" }]';