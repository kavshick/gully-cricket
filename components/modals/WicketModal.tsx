'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import type { Match, InningsState, MatchRules, DismissalType, Player } from '@/types'

interface WicketModalProps {
  match: Match
  innings: InningsState
  rules: MatchRules
  onConfirm: (
    wicketType: DismissalType,
    outPlayerId: string,
    replacementPlayer?: Player,
    fielder?: Player,
    runs?: number
  ) => void
  onClose: () => void
}

export default function WicketModal({ match, innings, rules, onConfirm, onClose }: WicketModalProps) {
  const [wicketType, setWicketType] = useState<DismissalType | null>(null)
  const [outPlayerId, setOutPlayerId] = useState<string | null>(null)
  const [fielder, setFielder] = useState<Player | null>(null)
  const [replacement, setReplacement] = useState<Player | null>(null)
  const [runsBeforeWicket, setRunsBeforeWicket] = useState(0)

  const batsmen = innings.batsmen
  const striker = batsmen.find(b => b.is_striker)
  const nonStriker = batsmen.find(b => !b.is_striker)

  const allPlayers = [...match.team_a.players, ...match.team_b.players]
  const currentBatsmenIds = new Set(batsmen.map(b => b.player.id))
  const retiredIds = new Set(innings.retired_players.map(r => r.player.id))

  const battingTeamPlayers = innings.batting_team.players.filter(
    p => !currentBatsmenIds.has(p.id) && !retiredIds.has(p.id)
  )

  const bowlingTeamPlayers = innings.bowling_team.players

  const dismissalTypes = [
    { value: 'bowled', label: '🏏 Bowled', enabled: true },
    { value: 'caught', label: '🙌 Caught', enabled: true },
    { value: 'run_out', label: '🏃 Run Out', enabled: true },
    { value: 'lbw', label: '🦵 LBW', enabled: true },
    { value: 'stumped', label: '🧤 Stumped', enabled: true },
    { value: 'hit_wicket', label: '💥 Hit Wicket', enabled: true },
    { value: 'caught_behind', label: '🎯 Caught Behind', enabled: rules.caught_behind_enabled },
    { value: 'one_tip_one_hand', label: '✋ One Tip One Hand', enabled: rules.one_tip_one_hand_enabled },
    { value: 'direct_six_out', label: '🚀 Direct Six Out', enabled: rules.direct_six_out_enabled },
    { value: 'roof_catch', label: '🏠 Roof Catch', enabled: rules.roof_catch_enabled },
  ] as const satisfies ReadonlyArray<{ value: DismissalType; label: string; enabled: boolean }>

  const needsFielder = wicketType === 'caught' || wicketType === 'run_out' ||
    wicketType === 'caught_behind' || wicketType === 'one_tip_one_hand' ||
    wicketType === 'roof_catch'

  function handleConfirm() {
    if (!wicketType || !outPlayerId) return
    const outPlayer = batsmen.find(b => b.player.id === outPlayerId)?.player
    if (!outPlayer) return
    onConfirm(wicketType, outPlayerId, replacement || undefined, fielder || undefined, runsBeforeWicket)
  }

  const canConfirm = wicketType && outPlayerId && (battingTeamPlayers.length === 0 || replacement)

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center">
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="w-full max-w-lg bg-surface-900 rounded-t-3xl overflow-hidden"
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <h2 className="font-display text-xl font-bold text-red-400">🔴 Wicket!</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Select dismissal details</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/5">
            <X size={18} className="text-zinc-400" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-5 pb-8">
          {/* Who's out? */}
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Who's out?</p>
            <div className="grid grid-cols-2 gap-2">
              {batsmen.map(b => (
                <motion.button
                  key={b.player.id}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setOutPlayerId(b.player.id)}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    outPlayerId === b.player.id
                      ? 'bg-red-900/30 border-red-600/50'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <p className="font-semibold text-sm">{b.player.name}</p>
                  <p className="text-xs text-zinc-500">{b.is_striker ? '🏏 On strike' : 'Non-striker'}</p>
                  <p className="text-xs text-zinc-400">{b.runs} runs ({b.balls_faced})</p>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Dismissal type */}
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">How out?</p>
            <div className="grid grid-cols-2 gap-2">
              {dismissalTypes.filter(d => d.enabled).map(d => (
                <motion.button
                  key={d.value}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setWicketType(d.value)}
                  className={`p-3 rounded-2xl border text-sm font-semibold text-left transition-all ${
                    wicketType === d.value
                      ? 'bg-red-900/30 border-red-600/50 text-red-300'
                      : 'bg-white/5 border-white/10 text-zinc-300'
                  }`}
                >
                  {d.label}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Fielder (for caught/run-out etc.) */}
          {needsFielder && (
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Fielder (optional)
              </p>
              <div className="flex gap-2 flex-wrap">
                {bowlingTeamPlayers.map(p => (
                  <motion.button
                    key={p.id}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setFielder(fielder?.id === p.id ? null : p)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      fielder?.id === p.id
                        ? 'bg-blue-900/40 border border-blue-600/50 text-blue-300'
                        : 'bg-white/5 border border-white/10 text-zinc-400'
                    }`}
                  >
                    {p.name}
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* Runs before wicket (run-out) */}
          {wicketType === 'run_out' && (
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Legal runs before run-out
              </p>
              <div className="flex gap-2">
                {[0, 1, 2, 3, 4, 5, 6].map(r => (
                  <button
                    key={r}
                    onClick={() => setRunsBeforeWicket(r)}
                    className={`px-4 py-2 rounded-xl font-bold transition-all ${
                      runsBeforeWicket === r
                        ? 'bg-pitch-600 text-white'
                        : 'bg-white/5 border border-white/10 text-zinc-300'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Replacement batsman */}
          {battingTeamPlayers.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Next Batsman
              </p>
              <div className="space-y-2">
                {battingTeamPlayers.map(p => (
                  <motion.button
                    key={p.id}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setReplacement(replacement?.id === p.id ? null : p)}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-all ${
                      replacement?.id === p.id
                        ? 'bg-pitch-900/30 border-pitch-600/50'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white"
                      style={{ background: `hsl(${(p.name.charCodeAt(0) * 37) % 360}, 60%, 40%)` }}
                    >
                      {p.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{p.name}</p>
                      <p className="text-xs text-zinc-500 capitalize">{p.preferred_role}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* Return eligible players */}
          {innings.return_eligible_players.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Return Retired Player
              </p>
              {innings.return_eligible_players.map(p => (
                <motion.button
                  key={p.id}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setReplacement(replacement?.id === p.id ? null : p)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-all mb-2 ${
                    replacement?.id === p.id
                      ? 'bg-yellow-900/30 border-yellow-600/50'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white"
                    style={{ background: `hsl(${(p.name.charCodeAt(0) * 37) % 360}, 60%, 40%)` }}
                  >
                    {p.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{p.name}</p>
                    <p className="text-xs text-yellow-500">Retired — can return</p>
                  </div>
                </motion.button>
              ))}
            </div>
          )}

          {/* Confirm */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="w-full py-4 rounded-2xl bg-red-600 text-white font-display font-bold text-base disabled:opacity-40"
          >
            {!wicketType ? 'Select dismissal type' :
             !outPlayerId ? 'Select who is out' :
             'Confirm Wicket'}
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}
