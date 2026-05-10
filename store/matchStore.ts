import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import type {
  Match,
  Ball,
  BallType,
  Player,
  InningsState,
  BatsmanState,
  DismissalType,
  MatchResult,
  CommentaryEntry,
} from '@/types'
import {
  computeScore,
  isLegalBall,
  shouldRotateStrike,
  getBallRuns,
  buildBallRecord,
  processBounce,
  BALLS_PER_OVER,
} from '@/scoring/engine'
import {
  generateBallCommentary,
  generateOverEndCommentary,
  buildCommentaryEntry,
} from '@/commentary/generator'

// ============================================================
// DEFAULT INNINGS STATE
// ============================================================
function createDefaultInnings(
  battingTeam: Match['innings1']['batting_team'],
  bowlingTeam: Match['innings1']['bowling_team']
): InningsState {
  return {
    batting_team: battingTeam,
    bowling_team: bowlingTeam,
    batsmen: [],
    bowler: null,
    score: {
      runs: 0,
      wickets: 0,
      legal_balls: 0,
      full_overs: 0,
      rem_balls: 0,
      fours: 0,
      sixes: 0,
      dots: 0,
      extras: 0,
      wides: 0,
      no_balls: 0,
    },
    balls: [],
    partnerships: [],
    fall_of_wickets: [],
    current_partnership: null,
    retired_players: [],
    return_eligible_players: [],
    bounce_this_over: 0,
  }
}

// ============================================================
// MATCH STORE
// ============================================================
interface MatchStoreState {
  match: Match | null
  isSyncing: boolean
  lastSyncAt: string | null

  // Match lifecycle
  initMatch: (match: Match) => void
  clearMatch: () => void

  // Ball recording
  recordBall: (
    type: BallType,
    runs: number,
    options?: {
      wicketType?: DismissalType
      fielderId?: string
      replacementPlayer?: Player
    }
  ) => void
  undoLastBall: () => void

  // Batsman management
  setOpeningBatsmen: (striker: Player, nonStriker: Player) => void
  replaceBatsman: (outPlayerId: string, inPlayer: Player) => void
  retireBatsman: (playerId: string, reason: 'voluntary' | 'score_limit') => void
  returnBatsman: (playerId: string, replacePlayerId: string) => void
  setStrike: (playerId: string) => void

  // Bowler management
  setBowler: (player: Player) => void

  // Innings management
  completeInnings: () => void
  completeMatch: (result: MatchResult, winnerTeamId?: string) => void

  // Sync
  syncToSupabase: () => Promise<void>
}

export const useMatchStore = create<MatchStoreState>()(
  persist(
    (set, get) => ({
      match: null,
      isSyncing: false,
      lastSyncAt: null,

      initMatch: (match) => set({ match }),

      clearMatch: () => set({ match: null }),

      recordBall: (type, runs, options = {}) => {
        const state = get()
        const match = state.match
        if (!match) return

        const innings = match.innings === 1 ? match.innings1 : match.innings2
        if (!innings) return

        const striker = innings.batsmen.find(b => b.is_striker)
        const nonStriker = innings.batsmen.find(b => !b.is_striker)
        const bowler = innings.bowler

        if (!striker || !nonStriker || !bowler) return

        // Process bounce rule
        let actualType = type
        let bounceCount = innings.bounce_this_over
        if (type === 'bounce') {
          const { isAutoWide, updatedBounceCount } = processBounce(
            { type, runs, striker_id: striker.player.id, non_striker_id: nonStriker.player.id, bowler_id: bowler.player.id } as any,
            bounceCount
          )
          bounceCount = updatedBounceCount
          if (isAutoWide) {
            actualType = 'wide'
          }
        }

        const currentOver = innings.score.full_overs
        const currentBallInOver = innings.score.rem_balls

        const ball = buildBallRecord(
          match.id,
          match.innings as 1 | 2,
          currentOver,
          currentBallInOver + 1,
          actualType,
          runs,
          striker.player.id,
          nonStriker.player.id,
          bowler.player.id,
          {
            wicketType: options.wicketType,
            fielderId: options.fielderId,
            bounceCount,
          }
        )

        const newBalls = [...innings.balls, ball]
        const newScore = computeScore(newBalls)

        // Generate commentary
        const commentaryText = generateBallCommentary(
          actualType,
          runs,
          striker.player.name,
          bowler.player.name,
          {
            wicketType: options.wicketType,
            isSecondBounce: type === 'bounce' && bounceCount >= 2,
            strikerRuns: striker.runs + getBallRuns(actualType, runs),
          }
        )
        const commentaryEntry = buildCommentaryEntry(
          commentaryText,
          actualType === 'wicket' ? 'wicket' :
          actualType === 'four' || actualType === 'six' ? 'boundary' : 'ball',
          ball.id
        )

        // Update batsman stats
        let newBatsmen = innings.batsmen.map(b => {
          if (b.player.id === striker.player.id && isLegalBall(actualType)) {
            const ballRuns = getBallRuns(actualType, runs)
            return {
              ...b,
              runs: b.runs + ballRuns,
              balls_faced: b.balls_faced + 1,
              fours: b.fours + (actualType === 'four' ? 1 : 0),
              sixes: b.sixes + (actualType === 'six' ? 1 : 0),
            }
          }
          return b
        })

        // Update current bowler stats for this delivery
        let newBowlerState = innings.bowler
        if (newBowlerState) {
          const concededRuns = getBallRuns(actualType, runs)
          const legalDelivery = isLegalBall(actualType)
          const isBowlerWicket =
            actualType === 'wicket' &&
            options.wicketType !== 'run_out'

          const nextBallsInOver = legalDelivery
            ? newBowlerState.balls_in_current_over + 1
            : newBowlerState.balls_in_current_over

          newBowlerState = {
            ...newBowlerState,
            runs_conceded: newBowlerState.runs_conceded + concededRuns,
            wickets: newBowlerState.wickets + (isBowlerWicket ? 1 : 0),
            dots: newBowlerState.dots + (legalDelivery && concededRuns === 0 ? 1 : 0),
            wides: newBowlerState.wides + (actualType === 'wide' ? 1 : 0),
            no_balls: newBowlerState.no_balls + (actualType === 'no_ball' ? 1 : 0),
            overs_bowled:
              newBowlerState.overs_bowled +
              (legalDelivery && nextBallsInOver === BALLS_PER_OVER ? 1 : 0),
            balls_in_current_over:
              legalDelivery && nextBallsInOver === BALLS_PER_OVER ? 0 : nextBallsInOver,
          }
        }

        // Handle wicket
        let retiredPlayers = [...innings.retired_players]
        let returnEligible = [...innings.return_eligible_players]

        if (actualType === 'wicket' && options.replacementPlayer) {
          const returningEntry = innings.retired_players.find(
            r => r.player.id === options.replacementPlayer?.id
          )
          // Remove out batsman, add replacement
          newBatsmen = newBatsmen.filter(b => b.player.id !== striker.player.id)
          if (returningEntry) {
            newBatsmen.push({
              ...returningEntry,
              is_striker: true,
              is_retired: false,
            })
            retiredPlayers = retiredPlayers.filter(r => r.player.id !== returningEntry.player.id)
            returnEligible = returnEligible.filter(p => p.id !== returningEntry.player.id)
          } else {
            newBatsmen.push({
              player: options.replacementPlayer,
              runs: 0,
              balls_faced: 0,
              fours: 0,
              sixes: 0,
              is_striker: true,
              is_retired: false,
              return_eligible: false,
            })
          }
        }

        // Handle strike rotation
        if (shouldRotateStrike(actualType, runs)) {
          newBatsmen = newBatsmen.map(b => ({
            ...b,
            is_striker: !b.is_striker,
          }))
        }

        // Check for over completion
        let newBounceThisOver = type === 'bounce' ? bounceCount : innings.bounce_this_over
        let overCommentary: CommentaryEntry | null = null

        const overCompleted = newScore.rem_balls === 0 && newScore.full_overs > innings.score.full_overs

        if (overCompleted) {
          // Over complete — rotate strike
          newBatsmen = newBatsmen.map(b => ({ ...b, is_striker: !b.is_striker }))
          newBounceThisOver = 0 // reset bounce count for new over

          const overRuns = newBalls
            .filter(b => b.over_number === currentOver)
            .reduce((s, b) => s + getBallRuns(b.type, b.runs), 0)
          const overWickets = newBalls
            .filter(b => b.over_number === currentOver && b.type === 'wicket')
            .length

          overCommentary = buildCommentaryEntry(
            generateOverEndCommentary(currentOver + 1, overRuns, overWickets, bowler.player.name),
            'over'
          )
        }

        const newCommentary = [
          ...match.commentary,
          commentaryEntry,
          ...(overCommentary ? [overCommentary] : []),
        ]

        let nextBowler = innings.bowler
        const conflictedBowlerId = nextBowler?.player.id
        if (conflictedBowlerId && newBatsmen.some(b => b.player.id === conflictedBowlerId)) {
          const alternateBowler = innings.bowling_team.players.find(p => p.id !== conflictedBowlerId)
          if (alternateBowler) {
            nextBowler = {
              player: alternateBowler,
              overs_bowled: 0,
              balls_in_current_over: 0,
              runs_conceded: 0,
              wickets: 0,
              dots: 0,
              wides: 0,
              no_balls: 0,
            }
          } else {
            nextBowler = null
          }
        }

        const updatedInnings: InningsState = {
          ...innings,
          balls: newBalls,
          score: newScore,
          batsmen: newBatsmen,
          bowler: overCompleted ? null : (newBowlerState ?? nextBowler),
          retired_players: retiredPlayers,
          return_eligible_players: returnEligible,
          bounce_this_over: newBounceThisOver,
        }

        set({
          match: {
            ...match,
            innings1: match.innings === 1 ? updatedInnings : match.innings1,
            innings2: match.innings === 2 ? updatedInnings : match.innings2,
            current_innings: updatedInnings,
            commentary: newCommentary,
          },
        })
      },

      undoLastBall: () => {
        const { match } = get()
        if (!match) return

        const innings = match.innings === 1 ? match.innings1 : match.innings2
        if (!innings || innings.balls.length === 0) return

        const newBalls = innings.balls.slice(0, -1)
        const newScore = computeScore(newBalls)

        // Remove last commentary entry
        const newCommentary = match.commentary.slice(0, -1)

        const updatedInnings: InningsState = {
          ...innings,
          balls: newBalls,
          score: newScore,
        }

        set({
          match: {
            ...match,
            innings1: match.innings === 1 ? updatedInnings : match.innings1,
            innings2: match.innings === 2 ? updatedInnings : match.innings2,
            current_innings: updatedInnings,
            commentary: newCommentary,
          },
        })
      },

      setOpeningBatsmen: (striker, nonStriker) => {
        const { match } = get()
        if (!match) return

        const innings = match.innings === 1 ? match.innings1 : match.innings2
        if (!innings) return

        const newBatsmen: BatsmanState[] = [
          {
            player: striker,
            runs: 0,
            balls_faced: 0,
            fours: 0,
            sixes: 0,
            is_striker: true,
            is_retired: false,
            return_eligible: false,
          },
          {
            player: nonStriker,
            runs: 0,
            balls_faced: 0,
            fours: 0,
            sixes: 0,
            is_striker: false,
            is_retired: false,
            return_eligible: false,
          },
        ]

        const updatedInnings = { ...innings, batsmen: newBatsmen }

        set({
          match: {
            ...match,
            innings1: match.innings === 1 ? updatedInnings : match.innings1,
            innings2: match.innings === 2 ? updatedInnings : match.innings2,
            current_innings: updatedInnings,
          },
        })
      },

      replaceBatsman: (outPlayerId, inPlayer) => {
        const { match } = get()
        if (!match) return

        const innings = match.innings === 1 ? match.innings1 : match.innings2
        if (!innings) return

        const returningEntry = innings.retired_players.find(r => r.player.id === inPlayer.id)
        const incomingBatsman = returningEntry
          ? {
              ...returningEntry,
              is_striker: true,
              is_retired: false,
            }
          : {
              player: inPlayer,
              runs: 0,
              balls_faced: 0,
              fours: 0,
              sixes: 0,
              is_striker: true,
              is_retired: false,
              return_eligible: false,
            }

        const newBatsmen = innings.batsmen
          .filter(b => b.player.id !== outPlayerId)
          .concat([incomingBatsman])

        const newRetiredPlayers = returningEntry
          ? innings.retired_players.filter(r => r.player.id !== inPlayer.id)
          : innings.retired_players
        const newReturnEligible = returningEntry
          ? innings.return_eligible_players.filter(p => p.id !== inPlayer.id)
          : innings.return_eligible_players

        let nextBowler = innings.bowler
        if (nextBowler?.player.id === inPlayer.id) {
          const alternateBowler = innings.bowling_team.players.find(p => p.id !== inPlayer.id)
          if (alternateBowler) {
            nextBowler = {
              player: alternateBowler,
              overs_bowled: 0,
              balls_in_current_over: 0,
              runs_conceded: 0,
              wickets: 0,
              dots: 0,
              wides: 0,
              no_balls: 0,
            }
          } else {
            nextBowler = null
          }
        }

        const updatedInnings = {
          ...innings,
          batsmen: newBatsmen,
          bowler: nextBowler,
          retired_players: newRetiredPlayers,
          return_eligible_players: newReturnEligible,
        }

        set({
          match: {
            ...match,
            innings1: match.innings === 1 ? updatedInnings : match.innings1,
            innings2: match.innings === 2 ? updatedInnings : match.innings2,
            current_innings: updatedInnings,
          },
        })
      },

      retireBatsman: (playerId, reason) => {
        const { match } = get()
        if (!match) return

        const innings = match.innings === 1 ? match.innings1 : match.innings2
        if (!innings) return

        const batsmanToRetire = innings.batsmen.find(b => b.player.id === playerId)
        if (!batsmanToRetire) return

        const retiredEntry: BatsmanState = {
          ...batsmanToRetire,
          is_retired: true,
          return_eligible: match.rules.retirement_mode !== 'retire_out',
          retirement_reason: reason,
        }

        const newBatsmen = innings.batsmen.filter(b => b.player.id !== playerId)
        const newRetired = [...innings.retired_players, retiredEntry]
        const newReturnEligible = retiredEntry.return_eligible
          ? [...innings.return_eligible_players, retiredEntry.player]
          : innings.return_eligible_players

        const updatedInnings = {
          ...innings,
          batsmen: newBatsmen,
          retired_players: newRetired,
          return_eligible_players: newReturnEligible,
        }

        set({
          match: {
            ...match,
            innings1: match.innings === 1 ? updatedInnings : match.innings1,
            innings2: match.innings === 2 ? updatedInnings : match.innings2,
            current_innings: updatedInnings,
          },
        })
      },

      returnBatsman: (playerId, replacePlayerId) => {
        const { match } = get()
        if (!match) return

        const innings = match.innings === 1 ? match.innings1 : match.innings2
        if (!innings) return

        const returningPlayer = innings.retired_players.find(r => r.player.id === playerId)
        if (!returningPlayer) return

        const newRetired = innings.retired_players.filter(r => r.player.id !== playerId)
        const newReturnEligible = innings.return_eligible_players.filter(p => p.id !== playerId)
        const newBatsmen = innings.batsmen
          .filter(b => b.player.id !== replacePlayerId)
          .concat([{ ...returningPlayer, is_retired: false, is_striker: true }])

        const updatedInnings = {
          ...innings,
          batsmen: newBatsmen,
          retired_players: newRetired,
          return_eligible_players: newReturnEligible,
        }

        set({
          match: {
            ...match,
            innings1: match.innings === 1 ? updatedInnings : match.innings1,
            innings2: match.innings === 2 ? updatedInnings : match.innings2,
            current_innings: updatedInnings,
          },
        })
      },

      setStrike: (playerId) => {
        const { match } = get()
        if (!match) return

        const innings = match.innings === 1 ? match.innings1 : match.innings2
        if (!innings) return

        const newBatsmen = innings.batsmen.map(b => ({
          ...b,
          is_striker: b.player.id === playerId,
        }))

        const updatedInnings = { ...innings, batsmen: newBatsmen }

        set({
          match: {
            ...match,
            innings1: match.innings === 1 ? updatedInnings : match.innings1,
            innings2: match.innings === 2 ? updatedInnings : match.innings2,
            current_innings: updatedInnings,
          },
        })
      },

      setBowler: (player) => {
        const { match } = get()
        if (!match) return

        const innings = match.innings === 1 ? match.innings1 : match.innings2
        if (!innings) return
        if (innings.batsmen.some(b => b.player.id === player.id)) return

        const newBowler = {
          player,
          overs_bowled: 0,
          balls_in_current_over: 0,
          runs_conceded: 0,
          wickets: 0,
          dots: 0,
          wides: 0,
          no_balls: 0,
        }

        const updatedInnings = { ...innings, bowler: newBowler }

        set({
          match: {
            ...match,
            innings1: match.innings === 1 ? updatedInnings : match.innings1,
            innings2: match.innings === 2 ? updatedInnings : match.innings2,
            current_innings: updatedInnings,
          },
        })
      },

      completeInnings: () => {
        const { match } = get()
        if (!match || match.innings !== 1) return

        // Setup innings 2
        const innings2: InningsState = {
          batting_team: match.innings1.bowling_team,
          bowling_team: match.innings1.batting_team,
          batsmen: [],
          bowler: null,
          score: {
            runs: 0, wickets: 0, legal_balls: 0, full_overs: 0,
            rem_balls: 0, fours: 0, sixes: 0, dots: 0, extras: 0,
            wides: 0, no_balls: 0,
          },
          balls: [],
          partnerships: [],
          fall_of_wickets: [],
          current_partnership: null,
          retired_players: [],
          return_eligible_players: [],
          bounce_this_over: 0,
        }

        set({
          match: {
            ...match,
            innings: 2,
            innings2,
            current_innings: innings2,
            target: match.innings1.score.runs + 1,
            status: 'innings_break',
          },
        })
      },

      completeMatch: (result, winnerTeamId) => {
        const { match } = get()
        if (!match) return

        set({
          match: {
            ...match,
            result,
            winner_team_id: winnerTeamId,
            status: 'completed',
            completed_at: new Date().toISOString(),
          },
        })
      },

      syncToSupabase: async () => {
        const { match } = get()
        if (!match) return

        set({ isSyncing: true })

        try {
          const response = await fetch('/api/matches/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ match }),
          })

          if (response.ok) {
            set({ lastSyncAt: new Date().toISOString() })
          }
        } catch (error) {
          console.error('Sync failed:', error)
        } finally {
          set({ isSyncing: false })
        }
      },
    }),
    {
      name: 'gully-cricket-match',
      partialize: (state) => ({ match: state.match }),
    }
  )
)
