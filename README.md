# 🏏 Gully Cricket — PWA

Mobile-first cricket scorer with third umpire camera, match history, and player stats.
Built with React + Vite + Supabase. Installable as a PWA (no app store needed).

---

## Stack

| Layer     | Tech                        |
|-----------|-----------------------------|
| Frontend  | React 18 + Vite             |
| PWA       | vite-plugin-pwa + Workbox   |
| Database  | Supabase (Postgres + REST)  |
| Deploy    | Vercel                      |
| Camera    | Browser MediaRecorder API   |

---

## Local Setup

```bash
# 1. Install deps
npm install

# 2. Copy env file
cp .env.example .env.local
# → Fill in your Supabase URL and anon key

# 3. Run dev server
npm run dev
```

Open http://localhost:5173 in your phone browser (same WiFi).

---

## Supabase Setup

1. Go to https://supabase.com → New Project
2. Open SQL Editor → paste contents of `supabase_schema.sql` → Run
3. Go to Settings → API → copy Project URL and anon key
4. Paste into `.env.local`

---

## Deploy to Vercel

```bash
# Option A: Vercel CLI
npm i -g vercel
vercel

# Option B: GitHub
# Push to GitHub → Import repo on vercel.com
# Add env vars in Vercel dashboard:
#   VITE_SUPABASE_URL
#   VITE_SUPABASE_ANON_KEY
```

---

## Install as PWA on Phone

1. Open the Vercel URL in **Chrome** (Android) or **Safari** (iPhone)
2. Android: tap ⋮ menu → **"Add to Home screen"**
3. iPhone: tap Share → **"Add to Home Screen"**

The app will open fullscreen like a native app — no browser bar.

---

## Battery Optimizations

- Camera stream released immediately after stopping recording
- Realtime Supabase events throttled to 2/sec
- No background JS timers
- CSS animations minimal (only fade-in)
- `touch-action: manipulation` prevents 300ms tap delay
- `will-change: auto` on all elements (no GPU layer promotion)
- Video bitrate capped at 2Mbps
- No audio recorded (camera only)

---

## Gully Rules Active

| Dismissal           | Rule                                              |
|---------------------|---------------------------------------------------|
| Roof Catch          | One-hand catch after ball hits turf roof → OUT    |
| Caught Behind       | Edge behind stumps, no bounce, inside wide → OUT  |
| Bowled              | Standard                                          |
| Run Out             | Standard                                          |
| LBW                 | ❌ Not applicable                                 |
| Six                 | Direct straight hit                               |
| Four (Boundary)     | Indirect / off walls                              |
