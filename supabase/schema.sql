-- ============================================================
-- GULLY CRICKET - CLEAN RESET SCHEMA (NO LOGIN REQUIRED)
-- Run this in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- DROP EXISTING OBJECTS
-- ============================================================
DROP VIEW IF EXISTS public.player_analytics;

DROP TABLE IF EXISTS public.player_stats CASCADE;
DROP TABLE IF EXISTS public.balls CASCADE;
DROP TABLE IF EXISTS public.matches CASCADE;
DROP TABLE IF EXISTS public.players CASCADE;

DROP FUNCTION IF EXISTS update_updated_at() CASCADE;

-- ============================================================
-- ENABLE EXTENSION
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PLAYERS TABLE
-- ============================================================
CREATE TABLE public.players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  name TEXT NOT NULL,
  nickname TEXT,
  batting_skill INTEGER NOT NULL DEFAULT 5 CHECK (batting_skill BETWEEN 1 AND 10),
  bowling_skill INTEGER NOT NULL DEFAULT 5 CHECK (bowling_skill BETWEEN 1 AND 10),
  fielding_skill INTEGER NOT NULL DEFAULT 5 CHECK (fielding_skill BETWEEN 1 AND 10),
  matches_played INTEGER NOT NULL DEFAULT 0,
  total_runs INTEGER NOT NULL DEFAULT 0,
  total_wickets INTEGER NOT NULL DEFAULT 0,
  strike_rate DECIMAL(6,2) NOT NULL DEFAULT 0,
  economy DECIMAL(5,2) NOT NULL DEFAULT 0,
  catches INTEGER NOT NULL DEFAULT 0,
  run_outs INTEGER NOT NULL DEFAULT 0,
  mvps INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  avatar_url TEXT,
  preferred_role TEXT NOT NULL DEFAULT 'allrounder' CHECK (preferred_role IN ('batsman', 'bowler', 'allrounder', 'wicketkeeper')),
  ai_balance_score DECIMAL(5,2) NOT NULL DEFAULT 5.0,
  form_trend TEXT NOT NULL DEFAULT 'stable' CHECK (form_trend IN ('rising', 'stable', 'falling')),
  clutch_factor DECIMAL(5,2) NOT NULL DEFAULT 5.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MATCHES TABLE
-- ============================================================
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  state JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'setup' CHECK (status IN ('setup', 'toss', 'live', 'innings_break', 'completed')),
  team_a_name TEXT,
  team_b_name TEXT,
  winner_team TEXT,
  total_overs INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================================
-- BALLS TABLE
-- ============================================================
CREATE TABLE public.balls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  innings INTEGER NOT NULL CHECK (innings IN (1, 2)),
  over_number INTEGER NOT NULL,
  ball_number INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('dot', 'run', 'four', 'six', 'wide', 'no_ball', 'wicket', 'bounce')),
  runs INTEGER NOT NULL DEFAULT 0,
  striker_id UUID REFERENCES public.players(id),
  non_striker_id UUID REFERENCES public.players(id),
  bowler_id UUID REFERENCES public.players(id),
  wicket_type TEXT CHECK (wicket_type IN ('bowled', 'caught', 'run_out', 'lbw', 'stumped', 'hit_wicket', 'caught_behind', 'one_tip_one_hand', 'direct_six_out', 'roof_catch')),
  fielder_id UUID REFERENCES public.players(id),
  is_legal BOOLEAN NOT NULL DEFAULT TRUE,
  bounce_count INTEGER DEFAULT 0,
  commentary TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PLAYER STATS TABLE
-- ============================================================
CREATE TABLE public.player_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  runs_scored INTEGER NOT NULL DEFAULT 0,
  balls_faced INTEGER NOT NULL DEFAULT 0,
  fours INTEGER NOT NULL DEFAULT 0,
  sixes INTEGER NOT NULL DEFAULT 0,
  wickets_taken INTEGER NOT NULL DEFAULT 0,
  balls_bowled INTEGER NOT NULL DEFAULT 0,
  runs_conceded INTEGER NOT NULL DEFAULT 0,
  catches INTEGER NOT NULL DEFAULT 0,
  run_outs INTEGER NOT NULL DEFAULT 0,
  is_out BOOLEAN NOT NULL DEFAULT FALSE,
  dismissal_type TEXT,
  innings INTEGER NOT NULL CHECK (innings IN (1, 2)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(player_id, match_id, innings)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_players_user_id ON public.players(user_id);
CREATE INDEX idx_matches_user_id ON public.matches(user_id);
CREATE INDEX idx_matches_status ON public.matches(status);
CREATE INDEX idx_balls_match_id ON public.balls(match_id);
CREATE INDEX idx_balls_innings ON public.balls(match_id, innings);
CREATE INDEX idx_player_stats_player_id ON public.player_stats(player_id);
CREATE INDEX idx_player_stats_match_id ON public.player_stats(match_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER players_updated_at
  BEFORE UPDATE ON public.players
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER matches_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- NO-LOGIN MODE: DISABLE RLS
-- ============================================================
ALTER TABLE public.players DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.balls DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_stats DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- ANALYTICS VIEW
-- ============================================================
CREATE OR REPLACE VIEW public.player_analytics AS
SELECT
  p.id AS player_id,
  p.name,
  p.nickname,
  p.user_id,
  COUNT(DISTINCT ps.match_id) AS total_matches,
  COALESCE(SUM(ps.runs_scored), 0) AS total_runs,
  COALESCE(SUM(ps.wickets_taken), 0) AS total_wickets,
  COALESCE(SUM(ps.balls_faced), 0) AS total_balls_faced,
  COALESCE(SUM(ps.balls_bowled), 0) AS total_balls_bowled,
  COALESCE(SUM(ps.runs_conceded), 0) AS total_runs_conceded,
  COALESCE(SUM(ps.catches), 0) AS total_catches,
  COALESCE(SUM(ps.fours), 0) AS total_fours,
  COALESCE(SUM(ps.sixes), 0) AS total_sixes,
  CASE
    WHEN SUM(ps.balls_faced) > 0
    THEN ROUND((SUM(ps.runs_scored)::DECIMAL / SUM(ps.balls_faced)) * 100, 2)
    ELSE 0
  END AS batting_strike_rate,
  CASE
    WHEN SUM(ps.balls_bowled) > 0
    THEN ROUND((SUM(ps.runs_conceded)::DECIMAL / SUM(ps.balls_bowled)) * 6, 2)
    ELSE 0
  END AS bowling_economy,
  CASE
    WHEN COUNT(CASE WHEN ps.is_out = TRUE THEN 1 END) > 0
    THEN ROUND(SUM(ps.runs_scored)::DECIMAL / COUNT(CASE WHEN ps.is_out = TRUE THEN 1 END), 2)
    ELSE SUM(ps.runs_scored)
  END AS batting_average
FROM public.players p
LEFT JOIN public.player_stats ps ON p.id = ps.player_id
GROUP BY p.id, p.name, p.nickname, p.user_id;

GRANT SELECT ON public.player_analytics TO anon, authenticated;

-- ============================================================
-- SEED PLAYERS
-- ============================================================
INSERT INTO public.players (user_id, name, nickname, preferred_role, batting_skill, bowling_skill, fielding_skill)
VALUES
  (NULL, 'Darshan', NULL, 'allrounder', 5, 5, 5),
  (NULL, 'Kavshick', NULL, 'allrounder', 5, 5, 5),
  (NULL, 'Sai', NULL, 'allrounder', 5, 5, 5),
  (NULL, 'Satvik', NULL, 'allrounder', 5, 5, 5),
  (NULL, 'Jayan', NULL, 'allrounder', 5, 5, 5),
  (NULL, 'Rathish', NULL, 'allrounder', 5, 5, 5),
  (NULL, 'Prasanna', NULL, 'allrounder', 5, 5, 5),
  (NULL, 'Hari', NULL, 'allrounder', 5, 5, 5),
  (NULL, 'Gopi', NULL, 'allrounder', 5, 5, 5),
  (NULL, 'Vishnu', NULL, 'allrounder', 5, 5, 5),
  (NULL, 'Sanjai', 'Tall', 'allrounder', 5, 5, 5),
  (NULL, 'Sanjai', 'Short', 'allrounder', 5, 5, 5),
  (NULL, 'Vishal', NULL, 'allrounder', 5, 5, 5),
  (NULL, 'Siva', NULL, 'allrounder', 5, 5, 5),
  (NULL, 'Venkat', NULL, 'allrounder', 5, 5, 5),
  (NULL, 'Manish', NULL, 'allrounder', 5, 5, 5),
  (NULL, 'Sriram', NULL, 'allrounder', 5, 5, 5);
