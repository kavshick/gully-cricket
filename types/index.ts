// ============================================================
// PLAYER TYPES
// ============================================================

export type PreferredRole = 'batsman' | 'bowler' | 'allrounder' | 'wicketkeeper'

export interface Player {
  id: string
  name: string
  nickname?: string
  batting_skill: number // 1-10
  bowling_skill: number // 1-10
  fielding_skill: number // 1-10
  matches_played: number
  total_runs: number
  total_wickets: number
  strike_rate: number
  economy: number
  catches: number
  run_outs: number
  mvps: number
  wins: number
  losses: number
  avatar_url?: string
  preferred_role: PreferredRole
  ai_balance_score: number
  form_trend: 'rising' | 'stable' | 'falling'
  clutch_factor: number
  created_at: string
  updated_at: string
}

export interface PlayerStats {
  player_id: string
  match_id: string
  runs_scored: number
  balls_faced: number
  fours: number
  sixes: number
  wickets_taken: number
  balls_bowled: number
  runs_conceded: number
  catches: number
  run_outs: number
  is_out: boolean
  dismissal_type?: DismissalType
  innings: 1 | 2
  created_at: string
}

export interface PlayerAnalytics {
  player_id: string
  batting_average: number
  batting_strike_rate: number
  boundary_percentage: number
  consistency_score: number
  pressure_score: number
  bowling_economy: number
  dot_ball_percentage: number
  wicket_frequency: number
  death_over_rating: number
  fielding_impact_score: number
  overall_rating: number
  last_5_scores: number[]
  last_5_wickets: number[]
  updated_at: string
}

// ============================================================
// TEAM TYPES
// ============================================================

export interface Team {
  id: string
  name: string
  players: Player[]
  captain: Player
  strength_score: number
  batting_strength: number
  bowling_strength: number
  color: string
  match_id?: string
}

export interface TeamGeneratorConfig {
  selected_player_ids: string[]
  common_player_id?: string
  fairness_target: number
}

export interface TeamBalance {
  team_a: Team
  team_b: Team
  fairness_percentage: number
  team_a_win_probability: number
  team_b_win_probability: number
  balance_score: number
  common_player_id?: string
}

// ============================================================
// MATCH TYPES
// ============================================================

export type BallType = 'dot' | 'run' | 'four' | 'six' | 'wide' | 'no_ball' | 'wicket' | 'bounce'
export type DismissalType =
  | 'bowled'
  | 'caught'
  | 'run_out'
  | 'lbw'
  | 'stumped'
  | 'hit_wicket'
  | 'caught_behind'
  | 'one_tip_one_hand'
  | 'direct_six_out'
  | 'roof_catch'
export type RetirementMode = 'returnable' | 'retire_out' | 'score_based' | 'unlimited_swap'
export type GroundType = 'tape_ball' | 'tennis' | 'rubber' | 'leather'
export type MatchResult = 'team_a_won' | 'team_b_won' | 'tie' | 'no_result'

export interface MatchRules {
  roof_catch_enabled: boolean
  caught_behind_enabled: boolean
  one_tip_one_hand_enabled: boolean
  bounce_rule_enabled: boolean
  direct_six_out_enabled: boolean
  free_hit_enabled: boolean
  powerplay_enabled: boolean
  max_overs: number
  max_players: number
  ball_type: GroundType
  ground_type: string
  retirement_mode: RetirementMode
  retirement_score_limit: number
}

export interface Ball {
  id: string
  match_id: string
  innings: 1 | 2
  over_number: number
  ball_number: number
  type: BallType
  runs: number
  striker_id: string
  non_striker_id: string
  bowler_id: string
  wicket_type?: DismissalType
  fielder_id?: string
  is_legal: boolean
  bounce_count?: number
  commentary?: string
  timestamp: string
}

export interface BatsmanState {
  player: Player
  runs: number
  balls_faced: number
  fours: number
  sixes: number
  is_striker: boolean
  is_retired: boolean
  retirement_reason?: string
  return_eligible: boolean
}

export interface BowlerState {
  player: Player
  overs_bowled: number
  balls_in_current_over: number
  runs_conceded: number
  wickets: number
  dots: number
  wides: number
  no_balls: number
}

export interface Partnership {
  batsman1_id: string
  batsman2_id: string
  runs: number
  balls: number
  started_at_score: number
  started_at_wicket: number
}

export interface FallOfWicket {
  wicket_number: number
  player_id: string
  score: number
  over: number
  ball: number
  dismissal_type: DismissalType
}

export interface InningsScore {
  runs: number
  wickets: number
  legal_balls: number
  full_overs: number
  rem_balls: number
  fours: number
  sixes: number
  dots: number
  extras: number
  wides: number
  no_balls: number
}

export interface InningsState {
  batting_team: Team
  bowling_team: Team
  batsmen: BatsmanState[]
  bowler: BowlerState | null
  score: InningsScore
  balls: Ball[]
  partnerships: Partnership[]
  fall_of_wickets: FallOfWicket[]
  current_partnership: Partnership | null
  retired_players: BatsmanState[]
  return_eligible_players: Player[]
  bounce_this_over: number
}

export interface Match {
  id: string
  team_a: Team
  team_b: Team
  rules: MatchRules
  toss_winner_id: string
  toss_decision: 'bat' | 'bowl'
  innings: 1 | 2
  innings1: InningsState
  innings2: InningsState | null
  current_innings: InningsState
  target?: number
  result?: MatchResult
  winner_team_id?: string
  mvp_player_id?: string
  commentary: CommentaryEntry[]
  momentum: MomentumPoint[]
  is_super_over: boolean
  created_at: string
  completed_at?: string
  status: 'setup' | 'toss' | 'live' | 'innings_break' | 'completed'
}

export interface MatchSetupState {
  team_balance: TeamBalance | null
  rules: MatchRules
  selected_players: string[]
  common_player_id?: string
}

// ============================================================
// COMMENTARY TYPES
// ============================================================

export interface CommentaryEntry {
  id: string
  ball_id?: string
  text: string
  type: 'ball' | 'wicket' | 'boundary' | 'over' | 'milestone' | 'innings' | 'match'
  timestamp: string
  is_highlight: boolean
}

export interface MomentumPoint {
  over: number
  ball: number
  team_a_momentum: number
  team_b_momentum: number
  win_probability_a: number
}

// ============================================================
// LEADERBOARD TYPES
// ============================================================

export interface LeaderboardEntry {
  player: Player
  rank: number
  value: number
  trend: 'up' | 'down' | 'same'
}

export type LeaderboardCategory =
  | 'most_runs'
  | 'most_wickets'
  | 'best_average'
  | 'best_strike_rate'
  | 'best_economy'
  | 'most_fours'
  | 'most_sixes'
  | 'most_mvps'
  | 'most_catches'

// ============================================================
// STORE TYPES
// ============================================================

export interface MatchStore {
  match: Match | null
  history: Ball[]
  isLoading: boolean

  // Actions
  initMatch: (match: Match) => void
  recordBall: (ball: Omit<Ball, 'id' | 'timestamp'>) => void
  undoLastBall: () => void
  retireBatsman: (playerId: string, reason: string) => void
  returnBatsman: (playerId: string) => void
  swapBatsman: (outPlayerId: string, inPlayer: Player) => void
  changeBowler: (player: Player) => void
  completeInnings: () => void
  completeMatch: (result: MatchResult, winnerTeamId?: string) => void
  setStrike: (playerId: string) => void
  syncToSupabase: () => Promise<void>
}

export interface PlayerStore {
  players: Player[]
  isLoading: boolean
  error: string | null

  // Actions
  fetchPlayers: () => Promise<void>
  addPlayer: (player: Omit<Player, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  updatePlayer: (id: string, updates: Partial<Player>) => Promise<void>
  deletePlayer: (id: string) => Promise<void>
  updatePlayerStats: (playerId: string, stats: Partial<PlayerStats>) => Promise<void>
}

export interface SettingsStore {
  defaultRules: MatchRules
  theme: 'dark' | 'light' | 'system'
  soundEnabled: boolean
  hapticEnabled: boolean

  // Actions
  updateDefaultRules: (rules: Partial<MatchRules>) => void
  setTheme: (theme: 'dark' | 'light' | 'system') => void
  toggleSound: () => void
  toggleHaptic: () => void
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface ApiResponse<T> {
  data: T | null
  error: string | null
  status: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  has_more: boolean
}

// ============================================================
// SUPABASE DATABASE TYPES
// ============================================================

export interface Database {
  public: {
    Tables: {
      players: {
        Row: Player
        Insert: Omit<Player, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Player, 'id' | 'created_at'>>
      }
      matches: {
        Row: {
          id: string
          state: Match
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          state: Match
          user_id: string
        }
        Update: {
          state?: Match
          updated_at?: string
        }
      }
      balls: {
        Row: Ball
        Insert: Omit<Ball, 'id'>
        Update: Partial<Ball>
      }
      player_stats: {
        Row: PlayerStats
        Insert: Omit<PlayerStats, 'created_at'>
        Update: Partial<PlayerStats>
      }
    }
  }
}
