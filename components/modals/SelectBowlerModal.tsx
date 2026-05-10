'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import type { Match, InningsState, Player } from '@/types'
import { formatOvers } from '@/scoring/engine'

interface SelectBowlerModalProps {
  match: Match
  innings: InningsState
  onSelect: (player: Player) => void
  onClose: () => void
}

export default function SelectBowlerModal({ match, innings, onSelect, onClose }: SelectBowlerModalProps) {
  const [selected, setSelected] = useState<Player | null>(null)

  const currentBowler = innings.bowler?.player
  const bowlingTeamPlayers = innings.bowling_team.players
  const currentBatsmenIds = new Set(innings.batsmen.map(b => b.player.id))

  // Track overs bowled per player from balls
  const oversByBowler: Record<string, number> = {}
  for (const ball of innings.balls) {
    if (ball.is_legal) {
      oversByBowler[ball.bowler_id] = (oversByBowler[ball.bowler_id] || 0) + 1
    }
  }

  const avatarColor = (name: string) =>
    `hsl(${(name.charCodeAt(0) * 37) % 360}, 60%, 40%)`
  const getCommonName = (player: Player) =>
    player.nickname || (player as Player & { common_name?: string }).common_name
  const displayName = (player: Player) => {
    const commonName = getCommonName(player)
    return commonName ? `${player.name} (${commonName})` : player.name
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center">
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="w-full max-w-lg bg-surface-900 rounded-t-3xl overflow-hidden flex flex-col"
        style={{ maxHeight: '80vh' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <h2 className="font-display text-xl font-bold">🎯 Select Bowler</h2>
            <p className="text-xs text-zinc-500 mt-0.5">{innings.bowling_team.name} bowling</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/5">
            <X size={18} className="text-zinc-400" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-2 pb-8">
          {bowlingTeamPlayers.map(p => {
            const legalBalls = oversByBowler[p.id] || 0
            const overs = formatOvers(legalBalls)
            const runsConceded = innings.balls
              .filter(b => b.bowler_id === p.id)
              .reduce((s, b) => {
                if (b.type === 'wide' || b.type === 'no_ball') return s + 1 + b.runs
                return s + b.runs
              }, 0)
            const wickets = innings.balls.filter(
              b => b.bowler_id === p.id && b.type === 'wicket'
            ).length
            const economy = legalBalls > 0
              ? ((runsConceded / legalBalls) * 6).toFixed(1)
              : '—'
            const isCurrent = currentBowler?.id === p.id
            const isBatting = currentBatsmenIds.has(p.id)
            const isSelected = selected?.id === p.id

            return (
              <motion.button
                key={p.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelected(isSelected ? null : p)}
                disabled={isCurrent || isBatting}
                className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
                  isCurrent || isBatting
                    ? 'bg-white/5 border-white/5 opacity-40 cursor-not-allowed'
                    : isSelected
                    ? 'bg-pitch-900/40 border-pitch-500'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm text-white flex-shrink-0"
                  style={{ background: avatarColor(p.name) }}
                >
                  {p.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{displayName(p)}</p>
                    {isCurrent && (
                      <span className="text-xs text-zinc-500 bg-white/5 px-2 py-0.5 rounded-full">
                        Current
                      </span>
                    )}
                    {isBatting && (
                      <span className="text-xs text-zinc-500 bg-white/5 px-2 py-0.5 rounded-full">
                        Batting
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5 capitalize">{p.preferred_role}</p>
                </div>
                <div className="text-right">
                  {legalBalls > 0 ? (
                    <>
                      <p className="text-sm font-semibold">
                        {wickets}/{runsConceded}
                      </p>
                      <p className="text-xs text-zinc-500">{overs} ov • Eco {economy}</p>
                    </>
                  ) : (
                    <p className="text-xs text-zinc-600">No overs yet</p>
                  )}
                </div>
              </motion.button>
            )
          })}

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => selected && onSelect(selected)}
            disabled={!selected}
            className="w-full py-4 mt-3 rounded-2xl bg-pitch-600 text-white font-display font-bold text-base disabled:opacity-40"
          >
            {selected ? `Bowl with ${selected.name}` : 'Select a bowler'}
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}
