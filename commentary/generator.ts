import type { BallType, DismissalType, CommentaryEntry } from '@/types'
import { v4 as uuidv4 } from 'uuid'

// ============================================================
// COMMENTARY TEMPLATES
// ============================================================

const SIX_LINES = [
  "BOOM! Straight over the boundary! That's a maximum!",
  "What a shot! Clear out of the ground! SIX!",
  "He's hit that into the next colony! Massive SIX!",
  "Gone! Gone! Gone! Into orbit! Six runs!",
  "Bhai ne udar se udhar kar diya! SIX!",
  "That's HUGE! Right over the roof! Six!",
  "Classic gully shot! No one's going to find that ball! SIX!",
  "Pure timing! The ball disappeared! Six runs!",
  "Maximum! Didn't even look, just swung and connected!",
  "ROOF CLEAR! That's six runs and possibly a broken window!",
]

const FOUR_LINES = [
  "Cracked! Along the ground, four runs!",
  "Beautiful timing — races away to the boundary!",
  "Whipped off the pads, FOUR!",
  "Cut shot! Like butter! Four runs!",
  "Driven hard — nobody stopping that! Four!",
  "Bisects the field perfectly — FOUR runs!",
  "Too full, too straight — punished for FOUR!",
  "Ramp over the keeper! Cheeky four!",
  "Edge... but it goes for FOUR! Lucky or smart?",
  "Gully style — anywhere will do! Four runs!",
]

const WICKET_LINES: Record<DismissalType, string[]> = {
  bowled: [
    "BOWLED HIM! The stumps are rattling!",
    "Clean bowled! That ball was unplayable!",
    "Through the gate! Middle stump gone!",
    "He's been castled! Direct hit on the stumps!",
    "Too quick, too straight — OUT BOWLED!",
  ],
  caught: [
    "CAUGHT! What a take in the deep!",
    "He's skied it and they've taken the catch! Out!",
    "Straight to the fielder — OUT CAUGHT!",
    "Oh no! Mistimed completely, easy catch — OUT!",
    "CAUGHT! The fielder barely had to move!",
  ],
  run_out: [
    "RUN OUT! Direct hit! He was never going to make it!",
    "CHAOS between the wickets — RUN OUT!",
    "Direct throw — he's short of his ground! Run Out!",
    "Poor call! Poor running! RUN OUT!",
    "Brilliant fielding! Run Out!",
  ],
  lbw: [
    "LBW! Plumb in front! The finger is up!",
    "That's hitting the stumps — LBW!",
    "Trapped in front! LBW!",
    "No bat, no luck — LBW! Out!",
    "Dead in front — LBW! Out!",
  ],
  stumped: [
    "STUMPED! Too far down the pitch!",
    "He's gone down the track and missed — stumped!",
    "Dancing but didn't connect — stumped out!",
  ],
  hit_wicket: [
    "Oh no! He's hit his own wicket! Out!",
    "What a way to go — hit wicket!",
    "Unfortunate! Hit wicket — OUT!",
  ],
  caught_behind: [
    "Feathered it behind! Caught behind!",
    "Thin edge through to the keeper — CAUGHT BEHIND!",
    "Nicked it! Behind the stumps — out!",
  ],
  one_tip_one_hand: [
    "One tip, one hand — OUT! That's the gully rule!",
    "Caught one tip one hand! Local rules apply!",
    "The fielder takes it clean on one bounce with one hand — OUT!",
  ],
  direct_six_out: [
    "HIT THE BOUNDARY FENCE DIRECT — OUT! Direct six rule!",
    "DIRECT SIX OUT! He's overcooked it!",
    "Too much power! Direct six out — OUT!",
  ],
  roof_catch: [
    "ROOF CATCH! The fielder takes it off the roof — OUT!",
    "Off the roof, right into the fielder's hands — OUT!",
    "Roof rule! That's out according to gully cricket law!",
  ],
}

const DOT_LINES = [
  "Dot ball. Pressure building.",
  "Defended. Good delivery.",
  "Played and missed! Lucky!",
  "Tight bowling — no run.",
  "Dot ball. The bowler's in control.",
  "Left alone. Dot ball.",
  "Good length, no shot offered — dot.",
  "Batsman in trouble. Another dot!",
  "Kept on a tight leash. Dot ball.",
  "Pressure, pressure, pressure — dot ball!",
]

const WIDE_LINES = [
  "Too wide! One extra run.",
  "Down the leg side — WIDE!",
  "That's going down leg — wide ball.",
  "Loose delivery, wide — free run.",
  "Wide down the off side. Wasted ball.",
]

const NO_BALL_LINES = [
  "NO BALL! Free hit coming up!",
  "Front foot no ball — free run and a free hit!",
  "Extra no ball! Batsman can't be caught out next ball!",
  "No ball called — bonus run!",
]

const BOUNCE_LINES = [
  "Bouncer! First one of the over.",
  "Bounce ball! Watch for the second one!",
  "Testing bounce delivery — first of the over.",
]

const SECOND_BOUNCE_WIDE = [
  "SECOND BOUNCE — automatically wide! Good gully rule!",
  "Two bounces in the over — that's a wide! Gully cricket at its finest!",
  "The bounce rule kicks in — wide called for second bouncer!",
]

const MILESTONE_LINES: Record<string, string[]> = {
  fifty: [
    "FIFTY UP! Brilliant innings! Half century!",
    "50 runs! What a knock! The crowd goes wild!",
    "Fifty! Gully cricket royalty right there!",
  ],
  hundred: [
    "CENTURY! Unbelievable innings! 100 runs!",
    "A HUNDRED in gully cricket! Legendary!",
    "100 UP! All-time performance!",
  ],
  fiveWickets: [
    "FIVE WICKETS! That's a gully cricket fifer!",
    "5 wickets for the bowler! Phenomenal!",
    "FIVE-FOR! The bowler's having the game of his life!",
  ],
  team50: [
    "Team 50 up! Good start from the batting side!",
    "Fifty on the board! Momentum building!",
  ],
  team100: [
    "TEAM HUNDRED! Century partnership for the team!",
    "100 runs on the board! What a scoring rate!",
  ],
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ============================================================
// MAIN COMMENTARY GENERATOR
// ============================================================
export function generateBallCommentary(
  type: BallType,
  runs: number,
  strikerName: string,
  bowlerName: string,
  options: {
    wicketType?: DismissalType
    isSecondBounce?: boolean
    strikerRuns?: number
    wicketsThisSpell?: number
    teamScore?: number
  } = {}
): string {
  let base = ''

  switch (type) {
    case 'six':
      base = pickRandom(SIX_LINES)
      break
    case 'four':
      base = pickRandom(FOUR_LINES)
      break
    case 'wicket':
      if (options.wicketType && WICKET_LINES[options.wicketType]) {
        base = pickRandom(WICKET_LINES[options.wicketType])
      } else {
        base = 'WICKET! OUT!'
      }
      break
    case 'wide':
      base = pickRandom(WIDE_LINES)
      break
    case 'no_ball':
      base = pickRandom(NO_BALL_LINES)
      break
    case 'bounce':
      if (options.isSecondBounce) {
        base = pickRandom(SECOND_BOUNCE_WIDE)
      } else {
        base = pickRandom(BOUNCE_LINES)
      }
      break
    case 'dot':
      base = pickRandom(DOT_LINES)
      break
    case 'run':
      if (runs === 1) base = `${strikerName} picks up a single.`
      else if (runs === 2) base = `Good running! Two runs taken.`
      else if (runs === 3) base = `Excellent! Three runs — good running between the wickets!`
      else base = `${runs} runs taken.`
      break
    default:
      base = `${runs} run${runs !== 1 ? 's' : ''} scored.`
  }

  // Add milestone checks
  if (options.strikerRuns) {
    if (options.strikerRuns === 50) {
      base += ' ' + pickRandom(MILESTONE_LINES.fifty)
    } else if (options.strikerRuns === 100) {
      base += ' ' + pickRandom(MILESTONE_LINES.hundred)
    }
  }

  if (options.wicketsThisSpell === 5) {
    base += ' ' + pickRandom(MILESTONE_LINES.fiveWickets)
  }

  return base
}

export function generateOverEndCommentary(
  overNumber: number,
  overRuns: number,
  overWickets: number,
  bowlerName: string
): string {
  const lines = [
    `End of over ${overNumber}. ${overRuns} runs, ${overWickets} wicket${overWickets !== 1 ? 's' : ''} for ${bowlerName}.`,
    `Over ${overNumber} done — ${bowlerName} concedes ${overRuns}. Pressure ${overRuns < 6 ? 'maintained' : overRuns > 12 ? 'released completely' : 'steady'}.`,
    `That's the over! ${overRuns} runs off it. ${overWickets > 0 ? `${overWickets} wicket${overWickets !== 1 ? 's' : ''} for ${bowlerName}!` : ''}`,
  ]
  return pickRandom(lines)
}

export function generateInningsStartCommentary(teamName: string, target?: number): string {
  if (target) {
    return `${teamName} need ${target} to win. The chase begins!`
  }
  return `${teamName} take the crease. Gully cricket time — let's go!`
}

export function generateMatchResultCommentary(result: string, mvpName?: string): string {
  return `${result}${mvpName ? ` Player of the Match: ${mvpName}!` : ''} What a game of gully cricket!`
}

export function buildCommentaryEntry(
  text: string,
  type: CommentaryEntry['type'],
  ballId?: string
): CommentaryEntry {
  return {
    id: uuidv4(),
    ball_id: ballId,
    text,
    type,
    timestamp: new Date().toISOString(),
    is_highlight: type === 'wicket' || type === 'boundary' || type === 'milestone' || type === 'match',
  }
}
