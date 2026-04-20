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

-- 2. SONGS (difficulty is now per-version, see song_versions below)
create table public.songs (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  slug text unique not null,          -- e.g. "three-little-kittens"
  genre text,                          -- e.g. "children", "pop", "classical"
  author text,
  youtube_videos jsonb default '[]',
  description text,
  thumbnail_url text,
  is_published boolean default false,
  play_count integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 3. SONG VERSIONS (each song can have multiple tab versions: Easy / Hard / etc.)
create table public.song_versions (
  id uuid default gen_random_uuid() primary key,
  song_id uuid references public.songs(id) on delete cascade not null,
  name text not null default 'Original',                                -- e.g. "Easy", "Hard"
  difficulty text check (difficulty in ('beginner', 'intermediate', 'advanced')) default 'beginner',
  description text,
  is_default boolean default false,
  sort_order integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index song_versions_song_id_idx on public.song_versions (song_id);

-- 4. TABS (each row = one line of a song version)
create table public.tabs (
  id uuid default gen_random_uuid() primary key,
  song_version_id uuid references public.song_versions(id) on delete cascade not null,
  line_order integer not null,         -- 1, 2, 3... ordering of lines
  notes jsonb not null,                -- [{"note":"1","octave":1}, ...]
  syllables jsonb not null,            -- ["Three", "lit-", "tle", ...]
  created_at timestamp with time zone default now()
);

create index tabs_song_version_id_idx on public.tabs (song_version_id);

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
alter table public.song_versions enable row level security;
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

-- Song versions: visible if parent song is published
create policy "Versions visible for published songs" on public.song_versions for select using (
  exists (select 1 from public.songs where id = song_versions.song_id and is_published = true)
);
create policy "Admins can manage all versions" on public.song_versions for all using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- Tabs: visible if their version's parent song is published
create policy "Tabs visible for published songs" on public.tabs for select using (
  exists (
    select 1 from public.song_versions sv
    join public.songs s on s.id = sv.song_id
    where sv.id = tabs.song_version_id and s.is_published = true
  )
);
create policy "Admins can manage all tabs" on public.tabs for all using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- Favorites: users manage their own
create policy "Users can view own favorites" on public.favorites for select using (auth.uid() = user_id);
create policy "Users can add favorites" on public.favorites for insert with check (auth.uid() = user_id);
create policy "Users can remove favorites" on public.favorites for delete using (auth.uid() = user_id);

-- 5. CONTACT MESSAGES (site contact form; admins read in Supabase dashboard or SQL)
create table public.contact_messages (
  id uuid default gen_random_uuid() primary key,
  name text,
  email text not null,
  subject text not null,
  message text not null,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default now(),
  constraint contact_messages_subject_len check (char_length(subject) <= 200),
  constraint contact_messages_message_len check (char_length(message) <= 5000),
  constraint contact_messages_name_len check (name is null or char_length(name) <= 100),
  constraint contact_messages_email_len check (char_length(email) <= 320)
);

alter table public.contact_messages enable row level security;

create policy "Anyone can submit contact" on public.contact_messages for insert
  with check (user_id is null or user_id = auth.uid());

create policy "Admins can read contact messages" on public.contact_messages for select using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- API access (PostgREST): without this, inserts from the app often fail with “permission denied”
grant insert on public.contact_messages to anon, authenticated;
grant select on public.contact_messages to authenticated;

-- ============================================================
-- 6. ARTICLES (long-form posts under /resources/articles)
-- ============================================================

create table if not exists public.articles (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  slug text unique not null,
  excerpt text,
  content text not null default '',     -- markdown source
  cover_image_url text,
  author text,
  tags text[] default '{}',
  is_published boolean default false,
  view_count integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  published_at timestamp with time zone
);

create index if not exists articles_published_at_idx
  on public.articles (published_at desc nulls last)
  where is_published = true;

create index if not exists articles_slug_idx on public.articles (slug);

alter table public.articles enable row level security;

-- Published articles visible to everyone; admins can do everything
create policy "Published articles visible to all" on public.articles
  for select using (is_published = true);

create policy "Admins can manage all articles" on public.articles
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- ============================================================
-- SEED DATA — Three Little Kittens
-- ============================================================

insert into public.songs (title, slug, genre, description, is_published)
values (
  'Three Little Kittens',
  'three-little-kittens',
  'children',
  'A classic nursery rhyme perfect for beginner kalimba players.',
  true
);

-- After the song is created, also create a default version, then insert tabs
-- referencing that version's id. (Run the version + tabs inserts manually.)

-- ============================================================
-- MIGRATION (run on existing DBs to introduce song_versions)
--
-- Safe to re-run. Skip this whole block on a fresh database.
-- ============================================================

-- Create the table if upgrading from a pre-versions schema
create table if not exists public.song_versions (
  id uuid default gen_random_uuid() primary key,
  song_id uuid references public.songs(id) on delete cascade not null,
  name text not null default 'Original',
  difficulty text check (difficulty in ('beginner', 'intermediate', 'advanced')) default 'beginner',
  description text,
  is_default boolean default false,
  sort_order integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists song_versions_song_id_idx on public.song_versions (song_id);

-- Add nullable song_version_id column to tabs while old song_id still exists
alter table public.tabs add column if not exists song_version_id uuid references public.song_versions(id) on delete cascade;

-- For every existing song that doesn't have any version yet, create one default version
-- (copying the current songs.difficulty into the new version).
-- NOTE: this assumes the legacy songs.difficulty column still exists. Run this migration
-- ONCE; do not re-run after step 8 below has dropped the column.
insert into public.song_versions (song_id, name, difficulty, is_default, sort_order)
select s.id,
       coalesce(initcap(s.difficulty), 'Original'),
       coalesce(s.difficulty, 'beginner'),
       true,
       0
from public.songs s
where not exists (select 1 from public.song_versions sv where sv.song_id = s.id);

-- Backfill song_version_id on existing tabs from the legacy song_id column
update public.tabs t
set song_version_id = sv.id
from public.song_versions sv
where t.song_version_id is null
  and sv.song_id = t.song_id
  and sv.is_default = true;

-- Drop the OLD tabs RLS policy first (it references the old song_id column we are about to drop)
drop policy if exists "Tabs visible for published songs" on public.tabs;

-- Tighten constraints and remove the obsolete column
alter table public.tabs alter column song_version_id set not null;
alter table public.tabs drop column song_id;

-- Now (re)create RLS policies pointing at song_version_id
alter table public.song_versions enable row level security;

drop policy if exists "Versions visible for published songs" on public.song_versions;
create policy "Versions visible for published songs" on public.song_versions for select using (
  exists (select 1 from public.songs where id = song_versions.song_id and is_published = true)
);

drop policy if exists "Admins can manage all versions" on public.song_versions;
create policy "Admins can manage all versions" on public.song_versions for all using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

create policy "Tabs visible for published songs" on public.tabs for select using (
  exists (
    select 1 from public.song_versions sv
    join public.songs s on s.id = sv.song_id
    where sv.id = tabs.song_version_id and s.is_published = true
  )
);

-- Difficulty is now per-version; drop the legacy column on songs
alter table public.songs drop column difficulty;
