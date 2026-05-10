'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import type { Match, InningsState, Player } from '@/types'

interface SelectBatsmanModalProps {
  match: Match
  innings: InningsState
  isOpening: boolean
  onSelect: (striker: Player, nonStriker?: Player) => void
  onClose: () => void
}

export default function SelectBatsmanModal({
  match,
  innings,
  isOpening,
  onSelect,
  onClose,
}: SelectBatsmanModalProps) {
  const [striker, setStriker] = useState<Player | null>(null)
  const [nonStriker, setNonStriker] = useState<Player | null>(null)

  const currentIds = new Set(innings.batsmen.map(b => b.player.id))
  const retiredIds = new Set(innings.retired_players.map(r => r.player.id))
  const availablePlayers = innings.batting_team.players.filter(
    p => !currentIds.has(p.id) && !retiredIds.has(p.id)
  )
  const returnEligible = innings.return_eligible_players

  const avatarColor = (name: string) =>
    `hsl(${(name.charCodeAt(0) * 37) % 360}, 60%, 40%)`

  function handleConfirm() {
    if (!striker) return
    onSelect(striker, nonStriker || undefined)
  }

  const canConfirm = isOpening ? (striker && nonStriker) : !!striker

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center">
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="w-full max-w-lg bg-surface-900 rounded-t-3xl overflow-hidden"
        style={{ maxHeight: '85vh' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <h2 className="font-display text-xl font-bold">
              {isOpening ? '🏏 Opening Batsmen' : '🏏 Next Batsman'}
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {innings.batting_team.name} batting
            </p>
          </div>
          {!isOpening && (
            <button onClick={onClose} className="p-2 rounded-xl bg-white/5">
              <X size={18} className="text-zinc-400" />
            </button>
          )}
        </div>

        <div className="overflow-y-auto p-5 space-y-5 pb-8">
          {/* Striker selection */}
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              {isOpening ? 'On Strike' : 'New Batsman (on strike)'}
            </p>
            <div className="space-y-2">
              {availablePlayers.map(p => (
                <motion.button
                  key={p.id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    if (striker?.id === p.id) { setStriker(null); return }
                    if (nonStriker?.id === p.id) setNonStriker(null)
                    setStriker(p)
                  }}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
                    striker?.id === p.id
                      ? 'bg-pitch-900/40 border-pitch-500'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white flex-shrink-0"
                    style={{ background: avatarColor(p.name) }}
                  >
                    {p.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-sm">{p.name}</p>
                    <p className="text-xs text-zinc-500 capitalize">{p.preferred_role} • SR: {p.strike_rate || 0}</p>
                  </div>
                  {striker?.id === p.id && (
                    <span className="text-xs text-pitch-400 font-semibold">🏏 Striker</span>
                  )}
                </motion.button>
              ))}

              {returnEligible.length > 0 && (
                <>
                  <p className="text-xs text-zinc-500 pt-1">Retired — eligible to return</p>
                  {returnEligible.map(p => (
                    <motion.button
                      key={p.id}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        if (striker?.id === p.id) { setStriker(null); return }
                        if (nonStriker?.id === p.id) setNonStriker(null)
                        setStriker(p)
                      }}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
                        striker?.id === p.id
                          ? 'bg-yellow-900/40 border-yellow-500'
                          : 'bg-white/5 border-yellow-700/20'
                      }`}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white flex-shrink-0"
                        style={{ background: avatarColor(p.name) }}
                      >
                        {p.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-sm">{p.name}</p>
                        <p className="text-xs text-yellow-500">Returned from retirement</p>
                      </div>
                    </motion.button>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Non-striker (opening only) */}
          {isOpening && (
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Non-Striker
              </p>
              <div className="space-y-2">
                {availablePlayers.filter(p => p.id !== striker?.id).map(p => (
                  <motion.button
                    key={p.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      if (nonStriker?.id === p.id) { setNonStriker(null); return }
                      setNonStriker(p)
                    }}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
                      nonStriker?.id === p.id
                        ? 'bg-blue-900/40 border-blue-500'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white flex-shrink-0"
                      style={{ background: avatarColor(p.name) }}
                    >
                      {p.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-sm">{p.name}</p>
                      <p className="text-xs text-zinc-500 capitalize">{p.preferred_role}</p>
                    </div>
                    {nonStriker?.id === p.id && (
                      <span className="text-xs text-blue-400 font-semibold">Non-striker</span>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="w-full py-4 rounded-2xl bg-pitch-600 text-white font-display font-bold text-base disabled:opacity-40"
          >
            {!striker
              ? 'Select a batsman'
              : isOpening && !nonStriker
              ? 'Select non-striker'
              : 'Confirm'}
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}
