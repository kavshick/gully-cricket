import { v4 as uuidv4 } from 'uuid'
import type {
  Ball,
  BallType,
  InningsScore,
  InningsState,
  BatsmanState,
  Partnership,
  FallOfWicket,
  Player,
  Match,
  DismissalType,
} from '@/types'

// ============================================================
// SCORING CONSTANTS
// ============================================================
export const BALLS_PER_OVER = 6
export const LEGAL_BALL_TYPES: BallType[] = ['dot', 'run', 'four', 'six', 'wicket']
export const ILLEGAL_BALL_TYPES: BallType[] = ['wide', 'no_ball']

// ============================================================
// BALL HELPERS
// ============================================================
export function isLegalBall(type: BallType): boolean {
  return LEGAL_BALL_TYPES.includes(type)
}

export function getBallRuns(type: BallType, runs: number): number {
  switch (type) {
    case 'four':
      return 4
    case 'six':
      return 6
    case 'wide':
      return 1 + runs // 1 extra + any runs scored
    case 'no_ball':
      return 1 + runs
    case 'wicket':
      return runs // runs before wicket (run-out scenario)
    case 'dot':
      return 0
    case 'bounce':
      return runs
    case 'run':
      return runs
    default:
      return runs
  }
}

export function shouldRotateStrike(type: BallType, runs: number): boolean {
  const totalRuns = getBallRuns(type, runs)
  // Odd runs rotate strike; wides/no-balls don't rotate unless runs scored
  if (type === 'wide') return false
  if (type === 'no_ball') return totalRuns % 2 !== 0
  return totalRuns % 2 !== 0
}

// ============================================================
// SCORE COMPUTATION
// ============================================================
export function computeScore(balls: Ball[]): InningsScore {
  let runs = 0
  let wickets = 0
  let legalBalls = 0
  let fours = 0
  let sixes = 0
  let dots = 0
  let extras = 0
  let wides = 0
  let noBalls = 0

  for (const ball of balls) {
    const ballRuns = getBallRuns(ball.type, ball.runs)
    runs += ballRuns

    if (isLegalBall(ball.type)) {
      legalBalls++
    }

    switch (ball.type) {
      case 'four':
        fours++
        break
      case 'six':
        sixes++
        break
      case 'dot':
        dots++
        break
      case 'wicket':
        wickets++
        if (ball.runs === 0) dots++
        break
      case 'wide':
        wides++
        extras += ballRuns
        break
      case 'no_ball':
        noBalls++
        extras += ballRuns
        break
    }
  }

  const fullOvers = Math.floor(legalBalls / BALLS_PER_OVER)
  const remBalls = legalBalls % BALLS_PER_OVER

  return {
    runs,
    wickets,
    legal_balls: legalBalls,
    full_overs: fullOvers,
    rem_balls: remBalls,
    fours,
    sixes,
    dots,
    extras,
    wides,
    no_balls: noBalls,
  }
}

// ============================================================
// CRR / RRR CALCULATION
// ============================================================
export function computeCRR(score: InningsScore): number {
  if (score.legal_balls === 0) return 0
  const overs = score.legal_balls / BALLS_PER_OVER
  return Math.round((score.runs / overs) * 100) / 100
}

export function computeRRR(
  target: number,
  currentScore: InningsScore,
  maxOvers: number
): number {
  const runsNeeded = target - currentScore.runs
  const ballsLeft = maxOvers * BALLS_PER_OVER - currentScore.legal_balls
  if (ballsLeft <= 0) return 999
  if (runsNeeded <= 0) return 0
  const oversLeft = ballsLeft / BALLS_PER_OVER
  return Math.round((runsNeeded / oversLeft) * 100) / 100
}

export function formatOvers(legalBalls: number): string {
  const overs = Math.floor(legalBalls / BALLS_PER_OVER)
  const balls = legalBalls % BALLS_PER_OVER
  return `${overs}.${balls}`
}

// ============================================================
// BOUNCE LOGIC
// ============================================================
export function processBounce(
  ball: Omit<Ball, 'id' | 'timestamp'>,
  bounceCountThisOver: number
): { isAutoWide: boolean; updatedBounceCount: number } {
  if (ball.type !== 'bounce') {
    return { isAutoWide: false, updatedBounceCount: bounceCountThisOver }
  }
  const newCount = bounceCountThisOver + 1
  if (newCount >= 2) {
    return { isAutoWide: true, updatedBounceCount: newCount }
  }
  return { isAutoWide: false, updatedBounceCount: newCount }
}

// ============================================================
// PARTNERSHIP TRACKING
// ============================================================
export function computeCurrentPartnership(
  balls: Ball[],
  lastWicketAt: number,
  striker: Player,
  nonStriker: Player
): Partnership {
  const partnershipBalls = balls.slice(lastWicketAt)
  let runs = 0
  let legalBalls = 0

  for (const b of partnershipBalls) {
    runs += getBallRuns(b.type, b.runs)
    if (isLegalBall(b.type)) legalBalls++
  }

  return {
    batsman1_id: striker.id,
    batsman2_id: nonStriker.id,
    runs,
    balls: legalBalls,
    started_at_score: 0,
    started_at_wicket: 0,
  }
}

// ============================================================
// WIN PROBABILITY ENGINE
// ============================================================
export function computeWinProbability(
  currentScore: InningsScore,
  target: number,
  maxOvers: number,
  wicketsDown: number,
  maxWickets: number
): number {
  if (!target || target <= 0) return 50

  const runsNeeded = target - currentScore.runs
  const ballsLeft = maxOvers * BALLS_PER_OVER - currentScore.legal_balls
  const wicketsLeft = maxWickets - wicketsDown

  if (runsNeeded <= 0) return 100
  if (ballsLeft <= 0) return 0
  if (wicketsLeft <= 0) return 0

  const rrrRequired = (runsNeeded / ballsLeft) * 6
  const crr = computeCRR(currentScore)

  // Sigmoid-based probability
  const diff = crr - rrrRequired
  const wicketFactor = wicketsLeft / maxWickets
  const ballsFactor = ballsLeft / (maxOvers * BALLS_PER_OVER)

  // Base probability from run rate difference
  let prob = 1 / (1 + Math.exp(-diff * 0.8))

  // Adjust for resources (wickets + balls remaining)
  const resourceFactor = (wicketFactor * 0.6 + ballsFactor * 0.4)
  prob = prob * 0.7 + resourceFactor * 0.3

  return Math.round(Math.min(98, Math.max(2, prob * 100)))
}

// ============================================================
// MVP CALCULATION
// ============================================================
export function calculateMVPScore(
  runs: number,
  wickets: number,
  catches: number,
  strikeRate: number,
  economy: number,
  ballsBowled: number
): number {
  let score = 0

  // Batting contribution (0-50 points)
  score += Math.min(50, runs * 0.5)
  if (strikeRate > 150) score += 10
  else if (strikeRate > 120) score += 6
  else if (strikeRate > 100) score += 3

  // Bowling contribution (0-40 points)
  score += wickets * 10
  if (ballsBowled >= 6) {
    if (economy < 6) score += 10
    else if (economy < 8) score += 6
    else if (economy < 10) score += 3
  }

  // Fielding (0-10 points)
  score += catches * 5

  return Math.round(score * 10) / 10
}

// ============================================================
// BALL RECORD BUILDER
// ============================================================
export function buildBallRecord(
  matchId: string,
  innings: 1 | 2,
  overNumber: number,
  ballInOver: number,
  type: BallType,
  runs: number,
  strikerId: string,
  nonStrikerId: string,
  bowlerId: string,
  options: {
    wicketType?: DismissalType
    fielderId?: string
    bounceCount?: number
    commentary?: string
  } = {}
): Ball {
  return {
    id: uuidv4(),
    match_id: matchId,
    innings,
    over_number: overNumber,
    ball_number: ballInOver,
    type,
    runs,
    striker_id: strikerId,
    non_striker_id: nonStrikerId,
    bowler_id: bowlerId,
    wicket_type: options.wicketType,
    fielder_id: options.fielderId,
    is_legal: isLegalBall(type),
    bounce_count: options.bounceCount,
    commentary: options.commentary,
    timestamp: new Date().toISOString(),
  }
}

// ============================================================
// UNDO ENGINE
// ============================================================
export function undoLastBall(innings: InningsState): InningsState {
  if (innings.balls.length === 0) return innings

  const newBalls = [...innings.balls]
  const removedBall = newBalls.pop()!

  const newScore = computeScore(newBalls)

  // Rebuild batsmen states from balls
  let striker = innings.batsmen.find(b => b.is_striker)
  let nonStriker = innings.batsmen.find(b => !b.is_striker)

  // Undo strike rotation
  if (removedBall && shouldRotateStrike(removedBall.type, removedBall.runs)) {
    // Swap back
    const temp = striker
    striker = nonStriker
    nonStriker = temp
  }

  return {
    ...innings,
    balls: newBalls,
    score: newScore,
  }
}

// ============================================================
// OVER SUMMARY
// ============================================================
export interface OverSummary {
  overNumber: number
  balls: Ball[]
  runs: number
  wickets: number
  extras: number
}

export function getOverSummaries(balls: Ball[]): OverSummary[] {
  const overs: Map<number, Ball[]> = new Map()

  for (const ball of balls) {
    if (!overs.has(ball.over_number)) {
      overs.set(ball.over_number, [])
    }
    overs.get(ball.over_number)!.push(ball)
  }

  return Array.from(overs.entries()).map(([overNumber, overBalls]) => {
    const runs = overBalls.reduce((sum, b) => sum + getBallRuns(b.type, b.runs), 0)
    const wickets = overBalls.filter(b => b.type === 'wicket').length
    const extras = overBalls
      .filter(b => b.type === 'wide' || b.type === 'no_ball')
      .reduce((sum, b) => sum + getBallRuns(b.type, b.runs), 0)
    return { overNumber, balls: overBalls, runs, wickets, extras }
  })
}

// ============================================================
// MATCH RESULT COMPUTATION
// ============================================================
export function determineMatchResult(
  inn1Score: InningsScore,
  inn2Score: InningsScore,
  inn2MaxWickets: number
): { result: string; winnerInnings: 1 | 2 | null } {
  if (inn2Score.runs > inn1Score.runs) {
    const wicketsLeft = inn2MaxWickets - inn2Score.wickets
    return {
      result: `Team batting second won by ${wicketsLeft} wicket${wicketsLeft !== 1 ? 's' : ''}`,
      winnerInnings: 2,
    }
  } else if (inn1Score.runs > inn2Score.runs) {
    const runDiff = inn1Score.runs - inn2Score.runs
    return {
      result: `Team batting first won by ${runDiff} run${runDiff !== 1 ? 's' : ''}`,
      winnerInnings: 1,
    }
  } else {
    return { result: 'Match tied!', winnerInnings: null }
  }
}
