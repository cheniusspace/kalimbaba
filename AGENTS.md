# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project overview
- This is a React 18 single-page app (Create React App / `react-scripts`) for browsing and managing kalimba song tabs.
- Backend is Supabase (auth + Postgres tables + RLS). Frontend assumes Supabase credentials are available at runtime via `.env`.

## Environment and setup
- Node version is pinned in `package.json` to `24.x`.
- Copy `.env.example` to `.env` and set:
  - `REACT_APP_SUPABASE_URL`
  - `REACT_APP_SUPABASE_ANON_KEY`
- Initialize database schema by running `supabase-schema.sql` in Supabase SQL Editor before using auth/favorites/admin flows.
- First admin user is created by setting `profiles.is_admin = true` for that user in Supabase.

## Common commands
- Install dependencies:
  - `npm install`
- Start local development server:
  - `npm start`
- Build production bundle:
  - `npm run build`
- Run tests (Jest via react-scripts):
  - `npm test`
- Run tests once (non-watch):
  - `npm test -- --watchAll=false`
- Run a single test file/pattern:
  - `npm test -- SongPage.test.js`
  - or `npm test -- --watchAll=false SongPage.test.js`

## Code architecture (big picture)
### App composition and routing
- `src/index.js` mounts `App` in `React.StrictMode`.
- `src/App.js` is the composition root:
  - wraps everything with `BrowserRouter`
  - then `ThemeProvider`
  - then `AuthProvider`
  - renders `Navbar` globally and route pages:
    - `/` Home
    - `/catalog` Catalog
    - `/song/:slug` Song details + tab lines
    - `/login` and `/signup`
    - `/favorites`
    - `/admin`

### Data/auth layer and cross-cutting state
- `src/lib/supabase.js` exports a singleton Supabase client from env vars.
- `src/context/AuthContext.js` centralizes:
  - session bootstrapping (`getSession`)
  - auth state subscription (`onAuthStateChange`)
  - profile fetch from `profiles`
  - auth actions (`signUp`, `signIn`, `signOut`)
- `src/context/ThemeContext.js` controls dark/light mode and persists it in localStorage (`kalimbaba-theme`), also syncing `data-theme` on `<html>`.

### Domain flow by feature
- Song discovery:
  - `HomePage` pulls published songs for popular/recent sections.
  - `CatalogPage` queries published songs with filter/sort criteria and client-side text search.
- Song consumption:
  - `SongPage` loads song by slug, then tab rows by `song_id`, and increments `songs.play_count` on view.
  - Tab display expects each `tabs` row to contain parallel arrays: `notes[]` and `syllables[]`.
- Personalization:
  - `CatalogPage`, `SongPage`, and `FavoritesPage` all read/write the `favorites` table for authenticated users.
- Admin authoring:
  - `AdminPage` is gated by `profile.is_admin`.
  - Create/edit flow writes one row in `songs`, then replaces all related `tabs` rows.
  - Raw tab line format is parsed from strings like `1°:Three | 1°:lit- | 3°:tle`.

## Database model assumptions used by frontend
- `profiles` extends Supabase `auth.users` and stores `is_admin`.
- `songs` contains metadata (`slug`, `genre`, `difficulty`, `audience`, `is_published`, `play_count`).
- `tabs` stores per-line tab content (`line_order`, `notes` jsonb, `syllables` jsonb).
- `favorites` links users to songs with unique `(user_id, song_id)`.
- RLS in `supabase-schema.sql` is critical to app behavior:
  - public reads for published songs/tabs
  - user-scoped favorites access
  - admin-only write access for songs/tabs

## Current repo-specific caveats
- There is no dedicated lint script in `package.json` right now; do not assume `npm run lint` exists.
- There is no README/CLAUDE/Cursor/Copilot instruction file in this repository at the time this guide was generated.
