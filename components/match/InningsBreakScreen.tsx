'use client'

import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import type { Match } from '@/types'
import { computeCRR, formatOvers } from '@/scoring/engine'

interface InningsBreakScreenProps {
  match: Match
  onContinue: () => void
}

export default function InningsBreakScreen({ match, onContinue }: InningsBreakScreenProps) {
  const inn1 = match.innings1
  const target = match.target || inn1.score.runs + 1
  const crr1 = computeCRR(inn1.score)

  const runsNeeded = target - 0
  const inn2Team = inn1.bowling_team

  // Top scorers from innings 1
  const topScorers = inn1.batsmen
    .sort((a, b) => b.runs - a.runs)
    .slice(0, 3)

  // Top wicket takers
  const wicketsByBowler: Record<string, { name: string; wickets: number; runs: number }> = {}
  for (const ball of inn1.balls) {
    if (ball.type === 'wicket') {
      const bowler = inn1.bowling_team.players.find(p => p.id === ball.bowler_id)
      if (bowler) {
        if (!wicketsByBowler[ball.bowler_id]) {
          wicketsByBowler[ball.bowler_id] = { name: bowler.name, wickets: 0, runs: 0 }
        }
        wicketsByBowler[ball.bowler_id].wickets++
      }
    }
    const bowlerEntry = wicketsByBowler[ball.bowler_id]
    if (bowlerEntry && ball.is_legal) {
      bowlerEntry.runs += ball.type === 'wide' || ball.type === 'no_ball' ? 1 + ball.runs : ball.runs
    }
  }

  const topBowlers = Object.values(wicketsByBowler)
    .sort((a, b) => b.wickets - a.wickets)
    .slice(0, 2)

  return (
    <div className="min-h-screen bg-surface-950 text-white flex flex-col">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-900/40 to-surface-950 px-4 pt-16 pb-8">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 to-transparent" />
        <div className="relative text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="text-6xl mb-3"
          >
            ☕
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="font-display text-3xl font-bold"
          >
            Innings Break
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-zinc-400 mt-1"
          >
            {inn2Team.name} need {runsNeeded} runs to win
          </motion.p>
        </div>
      </div>

      <div className="px-4 pb-32 space-y-4">
        {/* Innings 1 scorecard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-5 rounded-2xl bg-white/5 border border-white/10"
        >
          <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-3">
            {inn1.batting_team.name} innings
          </p>
          <div className="flex items-end gap-2 mb-2">
            <span className="font-display text-5xl font-bold">{inn1.score.runs}</span>
            <span className="font-display text-3xl text-zinc-400 mb-0.5">/{inn1.score.wickets}</span>
            <span className="text-zinc-400 mb-1 text-sm">({formatOvers(inn1.score.legal_balls)})</span>
          </div>
          <div className="flex gap-4 text-xs text-zinc-400">
            <span>CRR: <span className="text-white font-semibold">{crr1.toFixed(2)}</span></span>
            <span>4s: <span className="text-blue-400 font-semibold">{inn1.score.fours}</span></span>
            <span>6s: <span className="text-pitch-400 font-semibold">{inn1.score.sixes}</span></span>
            <span>Extras: {inn1.score.extras}</span>
          </div>
        </motion.div>

        {/* Target box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="p-5 rounded-2xl bg-gradient-to-br from-pitch-900/50 to-pitch-800/20 border border-pitch-700/40 text-center"
        >
          <p className="text-pitch-400 text-sm font-semibold mb-1">Target</p>
          <p className="font-display text-6xl font-bold text-pitch-300">{target}</p>
          <p className="text-zinc-400 text-sm mt-2">
            {inn2Team.name} need {runsNeeded} runs in {match.rules.max_overs} overs
          </p>
        </motion.div>

        {/* Top performers */}
        {topScorers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-4 rounded-2xl bg-white/5 border border-white/10"
          >
            <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-3">
              🏏 Top Scorers
            </p>
            <div className="space-y-2">
              {topScorers.map((b, i) => (
                <div key={b.player.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500 text-xs w-4">{i + 1}</span>
                    <span className="text-sm font-medium">{b.player.name}</span>
                    {i === 0 && <span className="text-xs">⭐</span>}
                  </div>
                  <div className="text-right">
                    <span className="font-display font-bold text-sm">{b.runs}</span>
                    <span className="text-zinc-500 text-xs"> ({b.balls_faced})</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {topBowlers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="p-4 rounded-2xl bg-white/5 border border-white/10"
          >
            <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-3">
              🎯 Best Bowlers
            </p>
            <div className="space-y-2">
              {topBowlers.map((b, i) => (
                <div key={b.name} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{b.name}</span>
                  <span className="font-display font-bold text-sm">
                    {b.wickets}W / {b.runs}R
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface-950/95 backdrop-blur-md border-t border-white/5">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onContinue}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="w-full py-4 rounded-2xl bg-pitch-600 text-white font-display font-bold text-base flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(34,197,94,0.3)]"
        >
          Start Innings 2
          <ArrowRight size={18} />
        </motion.button>
      </div>
    </div>
  )
}
