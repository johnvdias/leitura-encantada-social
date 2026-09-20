alter table public.profiles
  add column if not exists notification_preferences jsonb not null default '{"likes": true, "comments": true, "friends": true, "nudges": true, "achievements": true}'::jsonb;
