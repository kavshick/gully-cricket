// ── Gully Cricket Rules Engine ─────────────────────────────────
// Rules:
//  - One-hand catch after hitting roof → OUT
//  - Direct straight hit → SIX
//  - Indirect / off walls → FOUR (boundary)
//  - No LBW
//  - Edge behind stumps without bouncing, within wide line → OUT (caught behind)
//  - No standard fielding restrictions (no powerplay field rules)

export const BALL_TYPES = {
  DOT:       'dot',
  RUN:       'run',
  FOUR:      'four',
  SIX:       'six',
  WIDE:      'wide',
  NO_BALL:   'no_ball',
  WICKET:    'wicket',
  BOUNCE:    'bounce',
}

export const WICKET_TYPES = {
  ROOF_CATCH:     'Roof Catch',
  CAUGHT_BEHIND:  'Caught Behind',
  BOWLED:         'Bowled',
  RUN_OUT:        'Run Out',
  OTHER:          'Other',
}

export const OUTCOMES = [
  { id: 'dot',     label: '•',   runs: 0, type: BALL_TYPES.DOT,     color: '#4a5568', legal: true  },
  { id: 'one',     label: '1',   runs: 1, type: BALL_TYPES.RUN,     color: '#38a169', legal: true  },
  { id: 'two',     label: '2',   runs: 2, type: BALL_TYPES.RUN,     color: '#38a169', legal: true  },
  { id: 'three',   label: '3',   runs: 3, type: BALL_TYPES.RUN,     color: '#38a169', legal: true  },
  { id: 'four',    label: '4',   runs: 4, type: BALL_TYPES.FOUR,    color: '#3182ce', legal: true  },
  { id: 'six',     label: '6',   runs: 6, type: BALL_TYPES.SIX,     color: '#d69e2e', legal: true  },
  { id: 'wide',    label: 'WD',  runs: 1, type: BALL_TYPES.WIDE,    color: '#805ad5', legal: false },
  { id: 'noball',  label: 'NB',  runs: 1, type: BALL_TYPES.NO_BALL, color: '#c05621', legal: false },
  { id: 'wicket',  label: 'W',   runs: 0, type: BALL_TYPES.WICKET,  color: '#e53e3e', legal: true  },
  { id: 'bounce',  label: 'B',   runs: 0, type: BALL_TYPES.BOUNCE,  color: '#48bb78', legal: true, isBounce: true },
]

// ── Score calculator ───────────────────────────────────────────
export function calcInningsScore(balls) {
  let runs = 0, wickets = 0, legalBalls = 0, fours = 0, sixes = 0, dots = 0, extras = 0

  for (const b of balls) {
    runs += b.runs
    if (b.type === BALL_TYPES.WICKET) wickets++
    if (b.type === BALL_TYPES.FOUR) fours++
    if (b.type === BALL_TYPES.SIX) sixes++
    if (b.type === BALL_TYPES.WIDE || b.type === BALL_TYPES.NO_BALL) extras += b.runs
    if (b.type === BALL_TYPES.DOT) dots++
    // Legal balls: include bounces (only exclude wide, no-ball)
    if (b.type !== BALL_TYPES.WIDE && b.type !== BALL_TYPES.NO_BALL) legalBalls++
  }

  const fullOvers = Math.floor(legalBalls / 6)
  const remBalls  = legalBalls % 6

  return { runs, wickets, legalBalls, fullOvers, remBalls, fours, sixes, dots, extras }
}

// ── Over grouping for display ──────────────────────────────────
export function groupByOvers(balls) {
  const overs = []
  let cur = [], legal = 0

  for (const b of balls) {
    cur.push(b)
    // Count legal: include bounces, exclude only wide/no-ball
    if (b.type !== BALL_TYPES.WIDE && b.type !== BALL_TYPES.NO_BALL) legal++
    if (legal === 6) { overs.push([...cur]); cur = []; legal = 0 }
  }
  if (cur.length) overs.push(cur)
  return overs
}

// ── Check innings complete ─────────────────────────────────────
export function isInningsComplete(balls, maxOvers, maxWickets = 10) {
  const { legalBalls, wickets } = calcInningsScore(balls)
  return legalBalls >= maxOvers * 6 || wickets >= maxWickets
}

// ── Required run rate ──────────────────────────────────────────
export function calcRequiredRR(target, balls, maxOvers) {
  const { runs, legalBalls } = calcInningsScore(balls)
  const needed = target - runs
  const ballsLeft = (maxOvers * 6) - legalBalls
  if (ballsLeft <= 0) return null
  return { needed, ballsLeft, rr: ((needed / ballsLeft) * 6).toFixed(2) }
}

// ── Current run rate ──────────────────────────────────────────
export function calcCRR(balls) {
  const { runs, legalBalls } = calcInningsScore(balls)
  if (legalBalls === 0) return '0.00'
  return ((runs / legalBalls) * 6).toFixed(2)
}

// ── Ball dot display helper ────────────────────────────────────
export function ballDisplay(ball) {
  switch (ball.type) {
    case BALL_TYPES.WICKET:  return { label: 'W',  bg: '#e53e3e', fg: '#fff' }
    case BALL_TYPES.WIDE:    return { label: ball.isSecondBounce ? `Wd\n${ball.runs}(b)` : 'Wd', bg: '#805ad5', fg: '#fff' }
    case BALL_TYPES.NO_BALL: return { label: 'Nb', bg: '#c05621', fg: '#fff' }
    case BALL_TYPES.SIX:     return { label: '6',  bg: '#d69e2e', fg: '#000' }
    case BALL_TYPES.FOUR:    return { label: '4',  bg: '#3182ce', fg: '#fff' }
    case BALL_TYPES.DOT:     return { label: '•',  bg: '#2d3748', fg: '#718096' }
    case BALL_TYPES.BOUNCE:  return { label: ball.runs > 0 ? `${ball.runs}(b)` : 'B',  bg: '#48bb78', fg: '#fff' }
    default:                 return { label: String(ball.runs), bg: '#276749', fg: '#9ae6b4' }
  }
}

// ── Generate match summary for Supabase ───────────────────────
export function buildMatchRecord(setup, innings1, innings2, result, gameSessionId, matchState = {}) {
  const s1 = calcInningsScore(innings1.balls)
  const s2 = calcInningsScore(innings2.balls)
  return {
    game_session_id: gameSessionId,
    team_a: setup.teamA,
    team_b: setup.teamB,
    overs: setup.overs,
    innings_number: matchState.innings || 1,
    batting_team: matchState.battingTeam,
    bowling_team: matchState.bowlingTeam,
    striker: matchState.striker,
    non_striker: matchState.nonStriker,
    bowler: matchState.bowler,
    innings1_runs: s1.runs,
    innings1_wickets: s1.wickets,
    innings1_balls: innings1.balls,
    innings2_runs: s2.runs,
    innings2_wickets: s2.wickets,
    innings2_balls: innings2.balls,
    result,
    played_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}
