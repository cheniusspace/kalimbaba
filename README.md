# Kalimbaba

A web app for browsing and playing beautiful kalimba tabs. Built with React and Supabase.

**Live site:** [kalimbaba.com](https://www.kalimbaba.com)

---

## Features

- Browse kalimba tabs by genre, difficulty, and popularity
- Animated search with song suggestions
- Full tab viewer with numbered notation and syllables
- Save favorite songs per user account
- Dark / light mode
- Admin panel to add and publish songs
- Deployed on Vercel with automatic GitHub deploys

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React (Create React App) |
| Backend / DB | Supabase (PostgreSQL + Auth) |
| Hosting | Vercel |
| Fonts | Antic Didone, Ephesis, Outfit, DM Sans (Google Fonts) |

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/cheniusspace/kalimbaba.git
cd kalimbaba
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. In the SQL Editor, paste and run the contents of `supabase-schema.sql`
3. Go to **Settings → API** and copy your **Project URL** and **anon public** key

### 3. Configure environment variables

```bash
cp .env.example .env
```

Fill in `.env`:

```
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Install and run

```bash
npm install
npm start
```

App runs at [http://localhost:3000](http://localhost:3000)

---

## Database Schema

| Table | Description |
|---|---|
| `profiles` | Extends Supabase auth users — stores username and admin flag |
| `songs` | Song metadata (title, slug, genre, difficulty, play count) |
| `tabs` | Tab lines per song — notes and syllables stored as JSONB |
| `favorites` | User ↔ song saved relationships |

---

## Project Structure

```
kalimbaba/
├── public/
│   ├── index.html
│   └── logo.svg
├── src/
│   ├── App.js                  # Routes
│   ├── context/
│   │   ├── AuthContext.js      # Login / signup / session
│   │   └── ThemeContext.js     # Dark / light mode
│   ├── lib/
│   │   └── supabase.js         # Supabase client
│   ├── components/
│   │   ├── Navbar.js/.css
│   │   ├── Footer.js/.css
│   │   └── SongCard.js/.css
│   ├── pages/
│   │   ├── CatalogPage.js/.css # Homepage / song browser
│   │   ├── SongPage.js/.css    # Tab viewer
│   │   ├── FavoritesPage.js/.css
│   │   ├── LoginPage.js
│   │   ├── SignupPage.js
│   │   └── AdminPage.js/.css
│   └── styles/
│       └── global.css          # Design tokens, fonts, utilities
├── supabase-schema.sql         # Run in Supabase SQL Editor
├── vercel.json                 # Vercel build + SPA routing config
└── .env.example
```

---

## Deployment

The project auto-deploys to Vercel on every push to `main`.

To set up manually:
1. Connect your GitHub repo to [vercel.com](https://vercel.com)
2. Add environment variables in **Project → Settings → Environment Variables**:
   - `REACT_APP_SUPABASE_URL`
   - `REACT_APP_SUPABASE_ANON_KEY`
3. Vercel will build with `npm run build` and serve from the `build/` directory

---

## Admin Access

After signing up on the site:

1. Go to Supabase dashboard → **Table Editor** → `profiles`
2. Find your user row and set `is_admin` to `true`
3. The settings icon will appear in the navbar, giving access to `/admin`

---

## Tab Format

Each tab line is stored as two JSONB arrays:

```json
notes:     [{"note": "1", "octave": true}, {"note": "5", "octave": false}]
syllables: ["Three", "lit-"]
```

In the admin panel, enter tab lines using the shorthand format:

```
1°:Three | 1°:lit- | 3°:tle | 5:kit- | 5:tens
```

- `1°` = note 1, upper octave
- `5` = note 5, lower octave
- Text after `:` is the syllable displayed below the note
