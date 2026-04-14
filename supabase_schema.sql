-- Run this in Supabase → SQL Editor

-- Drop old tables if exists (removes old policies too)
DROP TABLE IF EXISTS player_stats CASCADE;
DROP TABLE IF EXISTS matches CASCADE;

-- Matches table
create table matches (
  id                 uuid primary key default gen_random_uuid(),
  game_session_id    text unique not null,
  team_a             text not null,
  team_b             text not null,
  overs              int not null,
  innings_number     int default 1,
  batting_team       text,
  bowling_team       text,
  striker            text,
  non_striker        text,
  bowler             text,
  innings1_runs      int,
  innings1_wickets   int,
  innings1_balls     jsonb default '[]',
  innings2_runs      int,
  innings2_wickets   int,
  innings2_balls     jsonb default '[]',
  result             text,
  played_at          timestamptz default now(),
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

-- Player stats (aggregated per player per team)
create table if not exists player_stats (
  id          uuid primary key default gen_random_uuid(),
  player_name text not null,
  team_name   text not null,
  runs        int default 0,
  balls_faced int default 0,
  fours       int default 0,
  sixes       int default 0,
  innings     int default 0,
  wickets     int default 0,
  updated_at  timestamptz default now(),
  unique(player_name, team_name)
);

-- Enable Row Level Security (open read/write for now — lock down later)
alter table matches      enable row level security;
alter table player_stats enable row level security;

create policy "Public read"  on matches      for select using (true);
create policy "Public write" on matches      for insert with check (true);
create policy "Public update" on matches      for update using (true);
create policy "Public delete" on matches      for delete using (true);
create policy "Public read"  on player_stats for select using (true);
create policy "Public write" on player_stats for insert with check (true);
create policy "Public update" on player_stats for update using (true);
create policy "Public delete" on player_stats for delete using (true);
