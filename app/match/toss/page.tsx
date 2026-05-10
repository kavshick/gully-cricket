'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'
import { useMatchSetupStore } from '@/store/settingsStore'
import { useMatchStore } from '@/store/matchStore'
import { v4 as uuidv4 } from 'uuid'
import type { Match, InningsState } from '@/types'

export default function TossPage() {
  const router = useRouter()
  const { team_balance, rules } = useMatchSetupStore()
  const { initMatch } = useMatchStore()

  const [tossWinner, setTossWinner] = useState<string | null>(null)
  const [tossDecision, setTossDecision] = useState<'bat' | 'bowl' | null>(null)
  const [isFlipping, setIsFlipping] = useState(false)
  const [flipResult, setFlipResult] = useState<'heads' | 'tails' | null>(null)
  const [selectedCaller, setSelectedCaller] = useState<string | null>(null)
  const [calledSide, setCalledSide] = useState<'heads' | 'tails' | null>(null)

  if (!team_balance) {
    return (
      <div className="min-h-screen bg-surface-950 text-white flex items-center justify-center">
        <Link href="/teams/generator" className="btn-neon">Start Over</Link>
      </div>
    )
  }

  const { team_a, team_b } = team_balance

  async function flipCoin() {
    if (!selectedCaller || !calledSide) return
    setIsFlipping(true)
    await new Promise(r => setTimeout(r, 1800))
    const result: 'heads' | 'tails' = Math.random() > 0.5 ? 'heads' : 'tails'
    setFlipResult(result)
    const won = result === calledSide
    setTossWinner(won ? selectedCaller : (selectedCaller === team_a.id ? team_b.id : team_a.id))
    setIsFlipping(false)
  }

  function startMatch() {
    if (!tossWinner || !tossDecision) return

    const battingTeam = tossDecision === 'bat'
      ? (tossWinner === team_a.id ? team_a : team_b)
      : (tossWinner === team_a.id ? team_b : team_a)
    const bowlingTeam = battingTeam.id === team_a.id ? team_b : team_a

    const innings1: InningsState = {
      batting_team: battingTeam,
      bowling_team: bowlingTeam,
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

    const match: Match = {
      id: uuidv4(),
      team_a,
      team_b,
      rules,
      toss_winner_id: tossWinner,
      toss_decision: tossDecision,
      innings: 1,
      innings1,
      innings2: null,
      current_innings: innings1,
      commentary: [],
      momentum: [],
      is_super_over: false,
      created_at: new Date().toISOString(),
      status: 'live',
    }

    initMatch(match)
    router.push('/match/live')
  }

  const tossWinnerTeam = tossWinner === team_a.id ? team_a : tossWinner === team_b.id ? team_b : null

  return (
    <div className="min-h-screen bg-surface-950 text-white flex flex-col">
      <div className="sticky top-0 z-10 bg-surface-950/95 backdrop-blur-md border-b border-white/5 px-4 pt-12 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/match/setup">
            <motion.button whileTap={{ scale: 0.9 }} className="p-2 rounded-xl bg-white/5">
              <ChevronLeft size={20} />
            </motion.button>
          </Link>
          <h1 className="font-display text-xl font-bold">Toss</h1>
        </div>
      </div>

      <div className="flex-1 px-4 py-6 space-y-6 max-w-sm mx-auto w-full">
        {/* Match info */}
        <div className="text-center">
          <p className="text-zinc-400 text-sm">
            {team_a.name} vs {team_b.name} • {rules.max_overs} overs
          </p>
        </div>

        {/* Coin flip */}
        <div className="flex flex-col items-center gap-6">
          {/* Coin */}
          <div className="relative w-32 h-32">
            <motion.div
              animate={isFlipping ? {
                rotateY: [0, 180, 360, 540, 720, 900, 1080],
                scale: [1, 1.1, 1, 1.1, 1, 1.1, 1],
              } : {}}
              transition={{ duration: 1.8, ease: 'easeOut' }}
              className="w-32 h-32 rounded-full bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-600 flex items-center justify-center shadow-2xl"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <span className="text-5xl">
                {flipResult === 'heads' ? '👑' : flipResult === 'tails' ? '🏏' : '🪙'}
              </span>
            </motion.div>
          </div>

          {/* Toss result */}
          <AnimatePresence>
            {flipResult && tossWinnerTeam && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <p className="text-2xl font-display font-bold text-pitch-300">
                  {flipResult === 'heads' ? '👑 Heads!' : '🏏 Tails!'}
                </p>
                <p className="text-zinc-300 mt-1">
                  <span className="font-bold text-white">{tossWinnerTeam.name}</span> wins the toss!
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Step 1: Who calls? */}
        {!flipResult && (
          <div className="space-y-3">
            <p className="text-sm text-zinc-400 text-center">Who calls the toss?</p>
            <div className="grid grid-cols-2 gap-3">
              {[team_a, team_b].map(team => (
                <motion.button
                  key={team.id}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setSelectedCaller(team.id)}
                  className={`p-4 rounded-2xl border text-center transition-all ${
                    selectedCaller === team.id
                      ? 'bg-pitch-900/40 border-pitch-500'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <p className="font-display font-bold">{team.name}</p>
                  <p className="text-xs text-zinc-500 mt-1">{team.captain?.name}</p>
                </motion.button>
              ))}
            </div>

            {selectedCaller && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <p className="text-sm text-zinc-400 text-center">Call it!</p>
                <div className="grid grid-cols-2 gap-3">
                  {(['heads', 'tails'] as const).map(side => (
                    <motion.button
                      key={side}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setCalledSide(side)}
                      className={`p-4 rounded-2xl border text-center transition-all ${
                        calledSide === side
                          ? 'bg-yellow-900/40 border-yellow-500'
                          : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <p className="text-2xl">{side === 'heads' ? '👑' : '🏏'}</p>
                      <p className="font-semibold capitalize mt-1">{side}</p>
                    </motion.button>
                  ))}
                </div>

                {calledSide && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={flipCoin}
                    disabled={isFlipping}
                    className="w-full py-4 rounded-2xl bg-yellow-500 text-black font-display font-bold text-base"
                  >
                    {isFlipping ? 'Flipping...' : '🪙 Flip!'}
                  </motion.button>
                )}
              </motion.div>
            )}
          </div>
        )}

        {/* Step 2: Bat or Bowl */}
        {tossWinnerTeam && !tossDecision && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <p className="text-sm text-zinc-400 text-center">
              <span className="text-white font-bold">{tossWinnerTeam.name}</span> elects to...
            </p>
            <div className="grid grid-cols-2 gap-3">
              {([
                { value: 'bat', label: '🏏 Bat First', desc: 'Set the target' },
                { value: 'bowl', label: '🎯 Bowl First', desc: 'Chase the target' },
              ] as const).map(opt => (
                <motion.button
                  key={opt.value}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setTossDecision(opt.value)}
                  className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-pitch-500 transition-all text-center"
                >
                  <p className="font-display font-bold">{opt.label}</p>
                  <p className="text-xs text-zinc-500 mt-1">{opt.desc}</p>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 3: Start Match */}
        {tossDecision && tossWinnerTeam && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="p-4 rounded-2xl bg-pitch-900/30 border border-pitch-700/30 text-center">
              <p className="text-pitch-300 text-sm">
                {tossWinnerTeam.name} will{' '}
                <span className="font-bold text-white">{tossDecision} first</span>
              </p>
              {tossDecision === 'bat' ? (
                <p className="text-xs text-zinc-500 mt-1">
                  {tossWinnerTeam.name} bats • {tossWinnerTeam.id === team_a.id ? team_b.name : team_a.name} bowls
                </p>
              ) : (
                <p className="text-xs text-zinc-500 mt-1">
                  {tossWinnerTeam.name} bowls • {tossWinnerTeam.id === team_a.id ? team_b.name : team_a.name} bats
                </p>
              )}
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={startMatch}
              className="w-full py-4 rounded-2xl bg-pitch-600 text-white font-display font-bold text-base shadow-[0_0_30px_rgba(34,197,94,0.3)]"
            >
              🏏 Start Match!
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
