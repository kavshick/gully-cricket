# 🏏 Gully Cricket — Production App

A full-stack gully cricket scoring, stats, and team balancing app built with **Next.js 14 + Supabase**, deployable to **Vercel** in minutes.

---

## ✨ Features

- 🏏 **Live Match Scoring** — full gully cricket rules (bounce, roof catch, one-tip-one-hand, direct six out, free hit)
- ⚡ **AI Team Balancing** — automatically generates fair teams using performance history
- 📊 **Player Analytics** — career stats, strike rate, economy, radar charts
- 🔄 **Retirement System** — retire & return, retire out, score-based auto-retirement, unlimited swap
- 🎙️ **Commentary Engine** — dynamic gully cricket style commentary
- 🏆 **Leaderboards** — runs, wickets, economy, strike rate rankings
- 📱 **PWA** — installable on Android/iOS, works offline
- 💾 **Offline-first** — Zustand persisted locally, syncs to Supabase automatically
- 🌙 **Dark mode** — premium sports app aesthetic

---

## 🚀 Quick Deploy to Vercel

### 1. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. In your Supabase dashboard → **SQL Editor** → run the contents of `supabase/schema.sql`
3. Go to **Settings → API** and copy:
   - `Project URL`
   - `anon public` key
   - `service_role` key (keep this secret!)

### 2. Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Push this repo to GitHub
2. Import in [Vercel](https://vercel.com/new)
3. Add these **Environment Variables** in Vercel:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

4. Click **Deploy** — done in ~2 minutes!

### 3. Local Development

```bash
# Clone and install
git clone <repo>
cd gully-cricket
npm install

# Set up env
cp .env.local.example .env.local
# Fill in your Supabase values

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
gully-cricket/
├── app/                    # Next.js App Router pages
│   ├── page.tsx            # Home dashboard
│   ├── login/              # Auth page
│   ├── players/            # Player management
│   ├── teams/              # Team generator & balance
│   ├── match/              # Match flow (setup → toss → live → summary)
│   ├── leaderboard/        # Stats leaderboard
│   ├── settings/           # App settings
│   └── api/                # API routes
│       ├── players/        # CRUD players
│       ├── matches/        # Match management & sync
│       ├── teams/          # Team generation
│       └── stats/          # Analytics
│
├── components/
│   ├── modals/             # WicketModal, SelectBatsmanModal, RetireModal, SelectBowlerModal
│   ├── match/              # InningsBreakScreen
│   └── player/             # PlayerCard
│
├── store/
│   ├── matchStore.ts       # Zustand match state (persisted)
│   ├── playerStore.ts      # Zustand player state (persisted)
│   └── settingsStore.ts    # App settings + match setup
│
├── scoring/
│   └── engine.ts           # Core scoring logic, undo, CRR/RRR, win probability
│
├── balancing/
│   └── engine.ts           # AI team balancing algorithm
│
├── commentary/
│   └── generator.ts        # Dynamic commentary generation
│
├── supabase/
│   ├── client.ts           # Browser Supabase client
│   ├── server.ts           # Server Supabase client
│   └── schema.sql          # Full DB schema + RLS policies
│
├── types/
│   └── index.ts            # All TypeScript types
│
└── providers/              # React context providers
```

---

## 🏏 How to Score a Match

1. **Add Players** → `/players` → Add your squad
2. **Generate Teams** → `/teams/generator` → Select players → AI balances teams
3. **Review Balance** → Drag/swap players if needed, see win probabilities
4. **Configure Rules** → Set overs, enable/disable gully rules, pick retirement mode
5. **Toss** → Flip coin, winner chooses bat/bowl
6. **Score Live** → Tap buttons: Dot · 1 · 2 · 3 · 4 · 6 · Wd · NB · B · W
7. **Summary** → See MVP, charts, share card

---

## 🎯 Gully Cricket Rules Supported

| Rule | Description |
|------|-------------|
| **Bounce Rule** | 2nd bounce in an over = automatic wide |
| **Roof Catch** | Ball caught off the roof = OUT |
| **One Tip One Hand** | One bounce + one-handed catch = OUT |
| **Direct Six Out** | Ball hits boundary fence direct = OUT |
| **Caught Behind** | Edge to keeper = OUT |
| **Free Hit** | No-ball → next ball is free hit |
| **Common Player** | One player bats/bowls for both teams |

---

## 🤖 AI Team Balancing Algorithm

The balancing engine uses a **greedy + local search** approach:

1. Compute **impact score** for each player:
   - Batting skill × 0.35
   - Bowling skill × 0.35
   - Fielding skill × 0.10
   - Historical stats × 0.20
   - Form trend multiplier (rising +10%, falling -10%)

2. **Greedy assignment** — sort by impact, alternate between teams

3. **Local search optimization** — 100 random swap attempts to minimize team difference

4. **Post-match rating update** — ELO-style moving average updates each player's AI score after every match

---

## 📊 Database Schema

- `players` — player profiles + career stats
- `matches` — full match state (JSONB)
- `balls` — ball-by-ball data
- `player_stats` — per-match statistics
- `player_analytics` — SQL view for leaderboards

All tables have **Row Level Security** — users only access their own data.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS |
| State | Zustand (persisted) |
| Animations | Framer Motion |
| Charts | Recharts |
| Backend | Supabase (PostgreSQL + Auth + RLS) |
| Deployment | Vercel |
| PWA | Web App Manifest |

---

## 🔧 Troubleshooting

**"Unauthorized" errors** → Make sure you're signed in. Go to `/login`.

**Data not syncing** → Check your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel env vars.

**Schema errors** → Re-run `supabase/schema.sql` in Supabase SQL editor.

**Players not appearing** → Run `npm run dev` locally and check browser console for API errors.

---

## 📱 Installing as PWA (Mobile)

**Android (Chrome):** Open app → ⋮ menu → "Add to Home Screen"

**iOS (Safari):** Open app → Share button → "Add to Home Screen"

---

Made with ❤️ for gully cricket fans everywhere
