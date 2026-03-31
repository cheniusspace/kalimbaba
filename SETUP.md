# Kalimba Go — Setup Guide

## What's been built
- React app with full routing
- Dark/light mode
- Supabase auth (login, signup, profiles)
- Homepage with featured & recent songs
- Catalog with filters (genre, difficulty, audience, sort)
- Song page (kalimba tab viewer matching your design)
- Favorites (save songs per user)
- Admin panel (add/edit/publish songs and tabs)

---

## Step 1 — Create a Supabase project

1. Go to https://supabase.com and sign up (free)
2. Click **New Project**
3. Name it `tranmuse`, set a database password, choose a region
4. Wait ~2 minutes for it to provision

---

## Step 2 — Run the database schema

1. In your Supabase dashboard, click **SQL Editor** in the left sidebar
2. Open the file `supabase-schema.sql` from this project
3. Paste the entire contents into the editor
4. Click **Run**

This creates all tables, RLS policies, and seeds the first song.

---

## Step 3 — Get your API keys

1. In Supabase dashboard → **Settings** → **API**
2. Copy:
   - **Project URL** (looks like `https://xxxx.supabase.co`)
   - **anon public** key

---

## Step 4 — Configure environment variables

1. Duplicate `.env.example` and rename it to `.env`
2. Fill in your keys:

```
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## Step 5 — Install and run

```bash
npm install
npm start
```

Your app opens at http://localhost:3000 🎉

---

## Step 6 — Make yourself an admin

After signing up on your app:

1. Go to Supabase dashboard → **Table Editor** → `profiles`
2. Find your user row
3. Set `is_admin` to `true`
4. Save

Now you'll see the ⚙️ Settings icon in the navbar and can access `/admin`.

---

## Step 7 — Add your first song via Admin

1. Go to `/admin`
2. Click **New Song**
3. Fill in title, genre, difficulty, audience
4. Add tab lines using this format:

```
1°:Three | 1°:lit- | 3°:tle | 5:kit- | 5:tens, | 5:they | 1°:lost | 3°:their | 5:mit- | 5:tens
```

Each note-syllable pair is separated by `|`
- `1°` = note 1, upper octave (the ° symbol)
- `5` = note 5, lower octave
- After `:` is the syllable shown below the note

5. Check **Published** and click **Save Song**

---

## Step 8 — Deploy to Vercel (free)

```bash
npm install -g vercel
vercel
```

Or connect your GitHub repo to https://vercel.com for automatic deploys.

Add your environment variables in Vercel → Project → Settings → Environment Variables.

---

## Future Mobile App

When you're ready to build the mobile app:

1. `npx create-expo-app KalimbaGoMobile`
2. Install `@supabase/supabase-js` — same client, same database
3. Reuse all your data fetching logic from `src/lib/supabase.js`
4. Replace HTML/CSS components with React Native equivalents

Your Supabase backend works identically for web and mobile.

---

## Project Structure

```
tranmuse/
├── public/
│   └── index.html
├── src/
│   ├── App.js               # Routes
│   ├── index.js             # Entry point
│   ├── context/
│   │   ├── AuthContext.js   # Login/signup/session
│   │   └── ThemeContext.js  # Dark/light mode
│   ├── lib/
│   │   └── supabase.js      # Supabase client
│   ├── components/
│   │   ├── Navbar.js/.css
│   │   └── SongCard.js/.css
│   ├── pages/
│   │   ├── HomePage.js/.css
│   │   ├── CatalogPage.js/.css
│   │   ├── SongPage.js/.css
│   │   ├── LoginPage.js
│   │   ├── SignupPage.js
│   │   ├── AuthPage.css
│   │   ├── FavoritesPage.js/.css
│   │   └── AdminPage.js/.css
│   └── styles/
│       └── global.css       # Design tokens, fonts, utilities
├── supabase-schema.sql      # Run this in Supabase SQL Editor
├── .env.example             # Copy to .env and fill in keys
├── .gitignore
└── package.json
```
