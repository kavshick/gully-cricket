'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  RotateCcw, ChevronRight, Mic2, BarChart2, BookOpen, Target,
} from 'lucide-react'
import { useMatchStore } from '@/store/matchStore'
import {
  computeCRR, computeRRR, formatOvers, getOverSummaries,
  computeWinProbability, BALLS_PER_OVER,
} from '@/scoring/engine'
import WicketModal from '@/components/modals/WicketModal'
import SelectBatsmanModal from '@/components/modals/SelectBatsmanModal'
import SelectBowlerModal from '@/components/modals/SelectBowlerModal'
import RetireModal from '@/components/modals/RetireModal'
import InningsBreakScreen from '@/components/match/InningsBreakScreen'
import type { Player, BallType } from '@/types'

type TabKey = 'score' | 'overs' | 'batting' | 'commentary'

// Score button config
const SCORE_BUTTONS: Array<{
  type: BallType
  runs: number
  label: string
  sub?: string
  color: string
  size?: 'large' | 'normal'
}> = [
  { type: 'dot', runs: 0, label: '•', sub: 'Dot', color: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300', size: 'large' },
  { type: 'run', runs: 1, label: '1', sub: 'Single', color: 'bg-white/10 hover:bg-white/15 text-white', size: 'large' },
  { type: 'run', runs: 2, label: '2', sub: 'Double', color: 'bg-white/10 hover:bg-white/15 text-white' },
  { type: 'run', runs: 3, label: '3', sub: 'Triple', color: 'bg-white/10 hover:bg-white/15 text-white' },
  { type: 'four', runs: 4, label: '4', sub: 'Four', color: 'bg-blue-700 hover:bg-blue-600 text-white', size: 'large' },
  { type: 'six', runs: 6, label: '6', sub: 'Six', color: 'bg-pitch-700 hover:bg-pitch-600 text-white', size: 'large' },
  { type: 'wide', runs: 0, label: 'Wd', sub: 'Wide', color: 'bg-yellow-700 hover:bg-yellow-600 text-white' },
  { type: 'no_ball', runs: 0, label: 'NB', sub: 'No Ball', color: 'bg-orange-700 hover:bg-orange-600 text-white' },
  { type: 'bounce', runs: 0, label: 'B', sub: 'Bounce', color: 'bg-purple-700 hover:bg-purple-600 text-white' },
]

export default function LiveMatchPage() {
  const router = useRouter()
  const { match, recordBall, undoLastBall, setOpeningBatsmen, setBowler, completeInnings, completeMatch } = useMatchStore()

  const [activeTab, setActiveTab] = useState<TabKey>('score')
  const [showWicketModal, setShowWicketModal] = useState(false)
  const [showBatsmanModal, setShowBatsmanModal] = useState(false)
  const [showBowlerModal, setShowBowlerModal] = useState(false)
  const [showRetireModal, setShowRetireModal] = useState(false)
  const [lastBallFlash, setLastBallFlash] = useState<string | null>(null)
  const [pendingBall, setPendingBall] = useState<{ type: BallType; runs: number } | null>(null)

  useEffect(() => {
    if (!match) { router.push('/'); return }
  }, [match])

  useEffect(() => {
    // Auto-sync every 30s
    const interval = setInterval(() => {
      useMatchStore.getState().syncToSupabase()
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  if (!match) return null

  const innings = match.current_innings
  const striker = innings.batsmen.find(b => b.is_striker)
  const nonStriker = innings.batsmen.find(b => !b.is_striker)
  const needsOpeningBatsmen = innings.batsmen.length === 0
  const needsBowler = !innings.bowler
  const isInningsBreak = match.status === 'innings_break'

  const crr = computeCRR(innings.score)
  const rrr = match.target
    ? computeRRR(match.target, innings.score, match.rules.max_overs)
    : null

  const overSummaries = getOverSummaries(innings.balls)

  const isInningsOver = (
    innings.score.full_overs >= match.rules.max_overs ||
    innings.score.wickets >= (match.rules.max_players - 1)
  )

  const isMatchWon = match.innings === 2 && match.target &&
    innings.score.runs >= match.target

  function handleScoreButton(type: BallType, runs: number) {
    if (type === 'wicket') {
      setPendingBall({ type, runs })
      setShowWicketModal(true)
      return
    }

    flashBall(type, runs)
    recordBall(type, runs)

    // Check innings completion
    setTimeout(() => {
      const current = useMatchStore.getState().match?.current_innings
      if (!current) return
      const overs = current.score.full_overs >= match.rules.max_overs
      const allOut = current.score.wickets >= (match.rules.max_players - 1)
      if (overs || allOut) {
        if (match.innings === 1) completeInnings()
        else handleEndMatch()
      }
    }, 100)
  }

  function flashBall(type: BallType, runs: number) {
    const key = `${type}-${runs}-${Date.now()}`
    setLastBallFlash(key)
    setTimeout(() => setLastBallFlash(null), 600)
  }

  function handleEndMatch() {
    const inn1 = match.innings1.score.runs
    const inn2 = match.current_innings.score.runs
    if (inn2 >= inn1 + 1) {
      completeMatch('team_b_won', match.innings2?.batting_team.id)
    } else {
      completeMatch('team_a_won', match.innings1.batting_team.id)
    }
    router.push('/match/summary')
  }

  if (isInningsBreak) {
    return <InningsBreakScreen match={match} onContinue={() => {
      setShowBatsmanModal(true)
    }} />
  }

  if (match.status === 'completed') {
    router.push('/match/summary')
    return null
  }

  return (
    <div className="min-h-screen bg-surface-950 text-white flex flex-col">
      {/* Live Score Header */}
      <div className="bg-gradient-to-b from-surface-900 to-surface-950 px-4 pt-12 pb-3">
        {/* Team names */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 live-indicator" />
            <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">Live</span>
          </div>
          <span className="text-xs text-zinc-500">
            Innings {match.innings} • {innings.batting_team.name} batting
          </span>
          <button
            onClick={() => setShowRetireModal(true)}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Retire
          </button>
        </div>

        {/* Main score */}
        <div className="flex items-end gap-2 mb-1">
          <motion.span
            key={innings.score.runs}
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 0.3 }}
            className="font-display text-6xl font-bold leading-none"
          >
            {innings.score.runs}
          </motion.span>
          <span className="font-display text-4xl font-semibold text-zinc-400 mb-1">
            /{innings.score.wickets}
          </span>
          <span className="text-zinc-400 mb-1.5 text-sm">
            ({formatOvers(innings.score.legal_balls)}/{match.rules.max_overs})
          </span>
        </div>

        {/* Target & rates */}
        <div className="flex items-center gap-3 text-xs text-zinc-400">
          <span>CRR: <span className="text-white font-semibold">{crr.toFixed(2)}</span></span>
          {rrr !== null && match.target && (
            <>
              <span className="text-zinc-700">|</span>
              <span>Need: <span className="text-white font-semibold">{match.target - innings.score.runs}</span></span>
              <span className="text-zinc-700">|</span>
              <span>RRR: <span className={`font-semibold ${rrr > crr ? 'text-red-400' : 'text-pitch-400'}`}>{rrr.toFixed(2)}</span></span>
            </>
          )}
        </div>

        {/* Last over balls */}
        {overSummaries.length > 0 && (
          <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1">
            {(overSummaries[overSummaries.length - 1]?.balls || []).map((ball, i) => (
              <div
                key={ball.id}
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  ball.type === 'wicket' ? 'bg-red-600 text-white' :
                  ball.type === 'six' ? 'bg-pitch-600 text-white' :
                  ball.type === 'four' ? 'bg-blue-600 text-white' :
                  ball.type === 'wide' ? 'bg-yellow-600 text-black' :
                  ball.type === 'no_ball' ? 'bg-orange-600 text-white' :
                  ball.type === 'bounce' ? 'bg-purple-600 text-white' :
                  ball.runs > 0 ? 'bg-white/15 text-white' :
                  'bg-white/5 text-zinc-500'
                }`}
              >
                {ball.type === 'wicket' ? 'W' :
                 ball.type === 'wide' ? 'Wd' :
                 ball.type === 'no_ball' ? 'NB' :
                 ball.type === 'bounce' ? 'B' :
                 ball.runs || '•'}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 px-4">
        {(['score', 'overs', 'batting', 'commentary'] as TabKey[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
              activeTab === tab
                ? 'text-pitch-400 border-b-2 border-pitch-500'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'score' && (
            <motion.div
              key="score"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-4 space-y-3"
            >
              {/* Batsmen */}
              {needsOpeningBatsmen ? (
                <button
                  onClick={() => setShowBatsmanModal(true)}
                  className="w-full py-4 rounded-2xl border-2 border-dashed border-pitch-600/50 text-pitch-400 font-semibold"
                >
                  + Select Opening Batsmen
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {[striker, nonStriker].filter(Boolean).map(b => b && (
                    <div
                      key={b.player.id}
                      className={`p-3 rounded-2xl border ${
                        b.is_striker
                          ? 'bg-pitch-900/30 border-pitch-600/50'
                          : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold ${b.is_striker ? 'text-pitch-400' : 'text-zinc-500'}`}>
                          {b.is_striker ? '🏏' : ''}
                        </span>
                        <span className="font-semibold text-sm truncate">{b.player.name}</span>
                      </div>
                      <p className="font-display font-bold text-xl">{b.runs}</p>
                      <p className="text-xs text-zinc-500">({b.balls_faced}) SR: {
                        b.balls_faced > 0 ? Math.round((b.runs / b.balls_faced) * 100) : 0
                      }</p>
                      <p className="text-xs text-zinc-600 mt-1">
                        {b.fours > 0 && `${b.fours}×4`} {b.sixes > 0 && `${b.sixes}×6`}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Bowler */}
              {needsBowler ? (
                <button
                  onClick={() => setShowBowlerModal(true)}
                  className="w-full py-3 rounded-2xl border border-dashed border-white/20 text-zinc-400 text-sm"
                >
                  + Select Bowler
                </button>
              ) : innings.bowler && (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10">
                  <div>
                    <p className="text-xs text-zinc-500">Bowling</p>
                    <p className="font-semibold text-sm">{innings.bowler.player.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-bold">
                      {innings.bowler.wickets}/{innings.bowler.runs_conceded}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {formatOvers(innings.bowler.overs_bowled * BALLS_PER_OVER + innings.bowler.balls_in_current_over)} ov
                    </p>
                  </div>
                  <button
                    onClick={() => setShowBowlerModal(true)}
                    className="ml-3 text-xs text-zinc-500 hover:text-white"
                  >
                    Change
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'overs' && (
            <motion.div
              key="overs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-4 space-y-3"
            >
              {overSummaries.length === 0 ? (
                <p className="text-center text-zinc-500 py-10 text-sm">No overs bowled yet</p>
              ) : (
                [...overSummaries].reverse().map(over => (
                  <div key={over.overNumber} className="p-3 rounded-2xl bg-white/5 border border-white/10">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-semibold text-zinc-400">Over {over.overNumber + 1}</span>
                      <span className="text-sm font-bold">{over.runs} runs {over.wickets > 0 && `• ${over.wickets}W`}</span>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {over.balls.map((ball, i) => (
                        <div
                          key={ball.id}
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                            ball.type === 'wicket' ? 'bg-red-600 text-white' :
                            ball.type === 'six' ? 'bg-pitch-600 text-white' :
                            ball.type === 'four' ? 'bg-blue-600 text-white' :
                            ball.type === 'wide' ? 'bg-yellow-600 text-black' :
                            ball.type === 'no_ball' ? 'bg-orange-600 text-white' :
                            ball.type === 'bounce' ? 'bg-purple-600 text-white' :
                            ball.runs > 0 ? 'bg-zinc-600 text-white' :
                            'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {ball.type === 'wicket' ? 'W' :
                           ball.type === 'wide' ? 'Wd' :
                           ball.type === 'no_ball' ? 'NB' :
                           ball.type === 'bounce' ? 'B' :
                           ball.runs || '•'}
                        </div>
                      ))}
                    </div>
                    {over.extras > 0 && (
                      <p className="text-xs text-zinc-500 mt-1">Extras: {over.extras}</p>
                    )}
                  </div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'batting' && (
            <motion.div
              key="batting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-4"
            >
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-zinc-500 border-b border-white/10">
                    <th className="text-left pb-2 font-semibold">Batter</th>
                    <th className="text-center pb-2 font-semibold">R</th>
                    <th className="text-center pb-2 font-semibold">B</th>
                    <th className="text-center pb-2 font-semibold">4s</th>
                    <th className="text-center pb-2 font-semibold">6s</th>
                    <th className="text-center pb-2 font-semibold">SR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {innings.batsmen.map(b => (
                    <tr key={b.player.id} className={b.is_striker ? 'text-pitch-300' : 'text-zinc-200'}>
                      <td className="py-2.5">
                        <div className="flex items-center gap-1.5">
                          {b.is_striker && <span className="text-pitch-400">🏏</span>}
                          <span className="font-medium">{b.player.name}</span>
                          {b.is_striker && <span className="text-xs text-zinc-500">*</span>}
                        </div>
                      </td>
                      <td className="text-center font-bold py-2.5">{b.runs}</td>
                      <td className="text-center text-zinc-400 py-2.5">{b.balls_faced}</td>
                      <td className="text-center text-zinc-400 py-2.5">{b.fours}</td>
                      <td className="text-center text-zinc-400 py-2.5">{b.sixes}</td>
                      <td className="text-center text-zinc-400 py-2.5">
                        {b.balls_faced > 0 ? Math.round((b.runs / b.balls_faced) * 100) : '-'}
                      </td>
                    </tr>
                  ))}
                  {innings.retired_players.map(b => (
                    <tr key={b.player.id} className="text-zinc-500">
                      <td className="py-2 text-xs">
                        {b.player.name} <span className="text-yellow-600">(ret)</span>
                      </td>
                      <td className="text-center text-xs">{b.runs}</td>
                      <td className="text-center text-xs">{b.balls_faced}</td>
                      <td className="text-center text-xs">{b.fours}</td>
                      <td className="text-center text-xs">{b.sixes}</td>
                      <td className="text-center text-xs">-</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}

          {activeTab === 'commentary' && (
            <motion.div
              key="commentary"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-4 space-y-2"
            >
              {match.commentary.length === 0 ? (
                <p className="text-center text-zinc-500 py-10 text-sm">Commentary will appear here</p>
              ) : (
                [...match.commentary].reverse().map(entry => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`p-3 rounded-xl ${
                      entry.is_highlight
                        ? 'bg-pitch-900/30 border border-pitch-700/30'
                        : 'bg-white/5'
                    }`}
                  >
                    <p className={`text-sm ${entry.is_highlight ? 'text-pitch-200 font-semibold' : 'text-zinc-300'}`}>
                      {entry.text}
                    </p>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Scoring Keypad */}
      <div className="bg-surface-900 border-t border-white/5 p-3 pb-6">
        <div className="grid grid-cols-3 gap-2 mb-2">
          {SCORE_BUTTONS.slice(0, 6).map(btn => (
            <motion.button
              key={`${btn.type}-${btn.runs}`}
              whileTap={{ scale: 0.92 }}
              onClick={() => handleScoreButton(btn.type, btn.runs)}
              disabled={needsOpeningBatsmen || needsBowler}
              className={`score-btn py-4 ${btn.color} rounded-2xl disabled:opacity-30`}
            >
              <span className="font-display text-2xl font-bold">{btn.label}</span>
              <span className="text-xs opacity-60">{btn.sub}</span>
            </motion.button>
          ))}
        </div>

        <div className="grid grid-cols-4 gap-2">
          {/* Wicket */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => { setPendingBall({ type: 'wicket', runs: 0 }); setShowWicketModal(true) }}
            disabled={needsOpeningBatsmen || needsBowler}
            className="score-btn py-3 bg-red-800 hover:bg-red-700 text-white rounded-2xl disabled:opacity-30 col-span-1"
          >
            <span className="font-display text-xl font-bold">W</span>
            <span className="text-xs opacity-60">Wicket</span>
          </motion.button>

          {SCORE_BUTTONS.slice(6).map(btn => (
            <motion.button
              key={`${btn.type}-${btn.runs}`}
              whileTap={{ scale: 0.92 }}
              onClick={() => handleScoreButton(btn.type, btn.runs)}
              disabled={needsOpeningBatsmen || needsBowler}
              className={`score-btn py-3 ${btn.color} rounded-2xl disabled:opacity-30`}
            >
              <span className="font-display text-lg font-bold">{btn.label}</span>
              <span className="text-xs opacity-60">{btn.sub}</span>
            </motion.button>
          ))}

          {/* Undo */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={undoLastBall}
            disabled={innings.balls.length === 0}
            className="score-btn py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-2xl disabled:opacity-30"
          >
            <RotateCcw size={18} />
            <span className="text-xs opacity-60">Undo</span>
          </motion.button>
        </div>

        {/* End innings button */}
        {isInningsOver && match.innings === 1 && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.97 }}
            onClick={completeInnings}
            className="w-full mt-3 py-3 rounded-2xl bg-blue-600 text-white font-display font-bold"
          >
            End Innings →
          </motion.button>
        )}
        {isInningsOver && match.innings === 2 && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleEndMatch}
            className="w-full mt-3 py-3 rounded-2xl bg-red-600 text-white font-display font-bold"
          >
            End Match →
          </motion.button>
        )}
      </div>

      {/* Modals */}
      {showWicketModal && (
        <WicketModal
          match={match}
          innings={innings}
          rules={match.rules}
          onConfirm={(wicketType, outPlayerId, replacementPlayer, fielder, runs) => {
            setShowWicketModal(false)
            recordBall('wicket', runs, {
              wicketType,
              fielderId: fielder?.id,
              replacementPlayer,
            })
          }}
          onClose={() => setShowWicketModal(false)}
        />
      )}

      {(showBatsmanModal || needsOpeningBatsmen) && (
        <SelectBatsmanModal
          match={match}
          innings={innings}
          isOpening={needsOpeningBatsmen}
          onSelect={(striker, nonStriker) => {
            setShowBatsmanModal(false)
            if (nonStriker) setOpeningBatsmen(striker, nonStriker)
          }}
          onClose={() => setShowBatsmanModal(false)}
        />
      )}

      {(showBowlerModal || needsBowler) && !needsOpeningBatsmen && (
        <SelectBowlerModal
          match={match}
          innings={innings}
          onSelect={(player) => {
            setShowBowlerModal(false)
            setBowler(player)
          }}
          onClose={() => setShowBowlerModal(false)}
        />
      )}

      {showRetireModal && (
        <RetireModal
          match={match}
          innings={innings}
          onClose={() => setShowRetireModal(false)}
        />
      )}
    </div>
  )
}
