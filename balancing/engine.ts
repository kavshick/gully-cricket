import type { Player, Team, TeamBalance } from '@/types'
import { v4 as uuidv4 } from 'uuid'

// ============================================================
// PLAYER IMPACT SCORE
// ============================================================
export function computePlayerImpactScore(player: Player): number {
  const battingWeight = 0.35
  const bowlingWeight = 0.35
  const fieldingWeight = 0.10
  const statsWeight = 0.20

  // Normalize batting skill (1-10) to 0-1
  const battingBase = player.batting_skill / 10

  // Normalize bowling skill
  const bowlingBase = player.bowling_skill / 10

  // Fielding
  const fieldingBase = player.fielding_skill / 10

  // Historical stats contribution
  let statsScore = 0
  if (player.matches_played > 0) {
    const avgRuns = player.total_runs / player.matches_played
    const avgWickets = player.total_wickets / player.matches_played
    const winRate = player.matches_played > 0 ? player.wins / player.matches_played : 0.5

    // Normalize: 30 runs/match = 1.0 batting, 2 wickets/match = 1.0 bowling
    const runScore = Math.min(1, avgRuns / 30)
    const wicketScore = Math.min(1, avgWickets / 2)
    const winScore = winRate

    statsScore = (runScore + wicketScore + winScore) / 3
  } else {
    // No history — use skills only
    statsScore = (battingBase + bowlingBase) / 2
  }

  // Form trend multiplier
  const formMultiplier =
    player.form_trend === 'rising' ? 1.1 :
    player.form_trend === 'falling' ? 0.9 : 1.0

  const rawScore =
    battingBase * battingWeight +
    bowlingBase * bowlingWeight +
    fieldingBase * fieldingWeight +
    statsScore * statsWeight

  return Math.round(rawScore * formMultiplier * 10 * 10) / 10 // 0-10 scale
}

// ============================================================
// TEAM STRENGTH CALCULATOR
// ============================================================
function computeTeamStrength(players: Player[]): {
  overall: number
  batting: number
  bowling: number
} {
  if (players.length === 0) return { overall: 0, batting: 0, bowling: 0 }

  const batting = players.reduce((s, p) => s + p.batting_skill, 0) / players.length
  const bowling = players.reduce((s, p) => s + p.bowling_skill, 0) / players.length
  const impacts = players.map(computePlayerImpactScore)
  const overall = impacts.reduce((s, v) => s + v, 0) / impacts.length

  return {
    overall: Math.round(overall * 10) / 10,
    batting: Math.round(batting * 10) / 10,
    bowling: Math.round(bowling * 10) / 10,
  }
}

// ============================================================
// GREEDY BALANCING ALGORITHM
// ============================================================
function greedyBalance(
  players: Player[]
): { teamA: Player[]; teamB: Player[] } {
  // Sort by impact score descending
  const sorted = [...players].sort(
    (a, b) => computePlayerImpactScore(b) - computePlayerImpactScore(a)
  )

  const teamA: Player[] = []
  const teamB: Player[] = []
  let scoreA = 0
  let scoreB = 0

  for (const player of sorted) {
    const impact = computePlayerImpactScore(player)
    if (scoreA <= scoreB) {
      teamA.push(player)
      scoreA += impact
    } else {
      teamB.push(player)
      scoreB += impact
    }
  }

  return { teamA, teamB }
}

// ============================================================
// LOCAL SEARCH OPTIMIZATION
// ============================================================
function optimizeBalance(
  teamA: Player[],
  teamB: Player[],
  iterations: number = 50
): { teamA: Player[]; teamB: Player[] } {
  let bestA = [...teamA]
  let bestB = [...teamB]
  let bestDiff = Math.abs(
    bestA.reduce((s, p) => s + computePlayerImpactScore(p), 0) -
    bestB.reduce((s, p) => s + computePlayerImpactScore(p), 0)
  )

  for (let i = 0; i < iterations; i++) {
    // Pick a random player from each team and try swapping
    const idxA = Math.floor(Math.random() * bestA.length)
    const idxB = Math.floor(Math.random() * bestB.length)

    const newA = [...bestA]
    const newB = [...bestB]
    const tmp = newA[idxA]
    newA[idxA] = newB[idxB]
    newB[idxB] = tmp

    const newDiff = Math.abs(
      newA.reduce((s, p) => s + computePlayerImpactScore(p), 0) -
      newB.reduce((s, p) => s + computePlayerImpactScore(p), 0)
    )

    if (newDiff < bestDiff) {
      bestA = newA
      bestB = newB
      bestDiff = newDiff
    }
  }

  return { teamA: bestA, teamB: bestB }
}

// ============================================================
// CAPTAIN SELECTION
// ============================================================
function selectCaptain(players: Player[]): Player {
  return players.reduce((best, p) => {
    const score = computePlayerImpactScore(p) + (p.wins > 0 ? p.wins / p.matches_played : 0)
    const bestScore = computePlayerImpactScore(best) + (best.wins > 0 ? best.wins / best.matches_played : 0)
    return score > bestScore ? p : best
  })
}

// ============================================================
// FAIRNESS PERCENTAGE
// ============================================================
function computeFairness(teamA: Player[], teamB: Player[]): number {
  const strengthA = computeTeamStrength(teamA)
  const strengthB = computeTeamStrength(teamB)
  const diff = Math.abs(strengthA.overall - strengthB.overall)
  const maxPossible = 10 // max impact score
  const fairness = Math.max(0, 100 - (diff / maxPossible) * 100)
  return Math.round(fairness)
}

// ============================================================
// WIN PROBABILITY FROM TEAM BALANCE
// ============================================================
function computeTeamWinProbability(
  teamA: Player[],
  teamB: Player[]
): { probA: number; probB: number } {
  const strengthA = computeTeamStrength(teamA).overall
  const strengthB = computeTeamStrength(teamB).overall
  const total = strengthA + strengthB
  if (total === 0) return { probA: 50, probB: 50 }

  const probA = Math.round((strengthA / total) * 100)
  return { probA, probB: 100 - probA }
}

// ============================================================
// MAIN TEAM GENERATOR
// ============================================================
export function generateBalancedTeams(
  players: Player[],
  commonPlayerId?: string,
  teamAName = 'Team A',
  teamBName = 'Team B'
): TeamBalance {
  // Separate common player
  const regularPlayers = commonPlayerId
    ? players.filter(p => p.id !== commonPlayerId)
    : players

  // Handle odd number (non-common player case)
  let playersToBalance = regularPlayers

  // Initial greedy balance
  const { teamA: greedyA, teamB: greedyB } = greedyBalance(playersToBalance)

  // Optimize with local search
  const { teamA: optA, teamB: optB } = optimizeBalance(greedyA, greedyB, 100)

  const strengthA = computeTeamStrength(optA)
  const strengthB = computeTeamStrength(optB)
  const fairness = computeFairness(optA, optB)
  const { probA, probB } = computeTeamWinProbability(optA, optB)

  const teamColors = ['#22c55e', '#3b82f6']

  const teamAObj: Team = {
    id: uuidv4(),
    name: teamAName,
    players: optA,
    captain: selectCaptain(optA),
    strength_score: strengthA.overall,
    batting_strength: strengthA.batting,
    bowling_strength: strengthA.bowling,
    color: teamColors[0],
  }

  const teamBObj: Team = {
    id: uuidv4(),
    name: teamBName,
    players: optB,
    captain: selectCaptain(optB),
    strength_score: strengthB.overall,
    batting_strength: strengthB.batting,
    bowling_strength: strengthB.bowling,
    color: teamColors[1],
  }

  return {
    team_a: teamAObj,
    team_b: teamBObj,
    fairness_percentage: fairness,
    team_a_win_probability: probA,
    team_b_win_probability: probB,
    balance_score: fairness / 10,
  }
}

// ============================================================
// POST-MATCH PLAYER RATING UPDATE
// ============================================================
export function updatePlayerAIScore(
  player: Player,
  matchRuns: number,
  matchWickets: number,
  matchCatches: number,
  won: boolean,
  strikeRate: number,
  economy: number,
  ballsBowled: number
): Partial<Player> {
  const currentScore = player.ai_balance_score

  // Performance delta this match
  const runScore = Math.min(3, matchRuns / 20)
  const wicketScore = matchWickets * 0.75
  const fieldingScore = matchCatches * 0.5
  const winBonus = won ? 0.5 : 0

  const srBonus = strikeRate > 150 ? 0.5 : strikeRate > 120 ? 0.25 : 0
  const econBonus = ballsBowled >= 6 ? (economy < 6 ? 0.5 : economy < 8 ? 0.25 : 0) : 0

  const matchScore = runScore + wicketScore + fieldingScore + winBonus + srBonus + econBonus

  // ELO-style moving average (weighted toward recent performance)
  const alpha = 0.2 // learning rate
  const newScore = Math.min(10, Math.max(1, currentScore * (1 - alpha) + matchScore * alpha))

  // Form trend
  const formTrend: Player['form_trend'] =
    newScore > currentScore + 0.3 ? 'rising' :
    newScore < currentScore - 0.3 ? 'falling' : 'stable'

  return {
    ai_balance_score: Math.round(newScore * 10) / 10,
    form_trend: formTrend,
    total_runs: player.total_runs + matchRuns,
    total_wickets: player.total_wickets + matchWickets,
    catches: player.catches + matchCatches,
    matches_played: player.matches_played + 1,
    wins: player.wins + (won ? 1 : 0),
    losses: player.losses + (won ? 0 : 1),
  }
}

// ============================================================
// MANUAL SHUFFLE
// ============================================================
export function shuffleTeams(teamBalance: TeamBalance): TeamBalance {
  const allPlayers = [...teamBalance.team_a.players, ...teamBalance.team_b.players]
  // Fisher-Yates shuffle then re-split
  for (let i = allPlayers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allPlayers[i], allPlayers[j]] = [allPlayers[j], allPlayers[i]]
  }

  const half = Math.ceil(allPlayers.length / 2)
  const newA = allPlayers.slice(0, half)
  const newB = allPlayers.slice(half)

  return generateBalancedTeams(
    [...newA, ...newB],
    undefined,
    teamBalance.team_a.name,
    teamBalance.team_b.name
  )
}

// ============================================================
// SWAP PLAYER BETWEEN TEAMS
// ============================================================
export function swapPlayerBetweenTeams(
  teamBalance: TeamBalance,
  playerIdFromA: string,
  playerIdFromB: string
): TeamBalance {
  const newA = teamBalance.team_a.players.map(p =>
    p.id === playerIdFromA
      ? teamBalance.team_b.players.find(bp => bp.id === playerIdFromB)!
      : p
  ).filter(Boolean)

  const newB = teamBalance.team_b.players.map(p =>
    p.id === playerIdFromB
      ? teamBalance.team_a.players.find(ap => ap.id === playerIdFromA)!
      : p
  ).filter(Boolean)

  const strengthA = computeTeamStrength(newA)
  const strengthB = computeTeamStrength(newB)
  const fairness = computeFairness(newA, newB)
  const { probA, probB } = computeTeamWinProbability(newA, newB)

  return {
    ...teamBalance,
    team_a: {
      ...teamBalance.team_a,
      players: newA,
      captain: selectCaptain(newA),
      strength_score: strengthA.overall,
      batting_strength: strengthA.batting,
      bowling_strength: strengthA.bowling,
    },
    team_b: {
      ...teamBalance.team_b,
      players: newB,
      captain: selectCaptain(newB),
      strength_score: strengthB.overall,
      batting_strength: strengthB.batting,
      bowling_strength: strengthB.bowling,
    },
    fairness_percentage: fairness,
    team_a_win_probability: probA,
    team_b_win_probability: probB,
  }
}
