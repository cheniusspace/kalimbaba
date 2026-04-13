-- ============================================================
-- Kalimbaba — Supabase Database Schema
-- Run this in your Supabase SQL Editor (supabase.com/dashboard)
-- ============================================================

-- 1. PROFILES (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique,
  avatar_url text,
  is_admin boolean default false,
  created_at timestamp with time zone default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data->>'username');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. SONGS
create table public.songs (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  slug text unique not null,          -- e.g. "three-little-kittens"
  genre text,                          -- e.g. "children", "pop", "classical"
  difficulty text check (difficulty in ('beginner', 'intermediate', 'advanced')),
  author text,
  youtube_videos jsonb default '[]',
  description text,
  thumbnail_url text,
  is_published boolean default false,
  play_count integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 3. TABS (each row = one line of the song)
create table public.tabs (
  id uuid default gen_random_uuid() primary key,
  song_id uuid references public.songs(id) on delete cascade,
  line_order integer not null,         -- 1, 2, 3... ordering of lines
  notes jsonb not null,                -- [{"note":"1","octave":true}, {"note":"3","octave":true}...]
  syllables jsonb not null,            -- ["Three", "lit-", "tle", "kit-", "tens"...]
  created_at timestamp with time zone default now()
);

-- 4. FAVORITES
create table public.favorites (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  song_id uuid references public.songs(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique(user_id, song_id)
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

alter table public.profiles enable row level security;
alter table public.songs enable row level security;
alter table public.tabs enable row level security;
alter table public.favorites enable row level security;

-- Profiles: users can read all, edit only their own
create policy "Profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Songs: published songs visible to all; admins can do everything
create policy "Published songs visible to all" on public.songs for select using (is_published = true);
create policy "Admins can manage all songs" on public.songs for all using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- Tabs: visible if song is published
create policy "Tabs visible for published songs" on public.tabs for select using (
  exists (select 1 from public.songs where id = song_id and is_published = true)
);
create policy "Admins can manage all tabs" on public.tabs for all using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- Favorites: users manage their own
create policy "Users can view own favorites" on public.favorites for select using (auth.uid() = user_id);
create policy "Users can add favorites" on public.favorites for insert with check (auth.uid() = user_id);
create policy "Users can remove favorites" on public.favorites for delete using (auth.uid() = user_id);

-- ============================================================
-- SEED DATA — Three Little Kittens
-- ============================================================

insert into public.songs (title, slug, genre, difficulty, description, is_published)
values (
  'Three Little Kittens',
  'three-little-kittens',
  'children',
  'beginner',
  'A classic nursery rhyme perfect for beginner kalimba players.',
  true
);

-- Get the song id for tab insertion
-- (Run the tabs insert after confirming the song was created)
