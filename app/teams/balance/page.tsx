'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Shuffle, ArrowRight, RefreshCw, ArrowLeftRight } from 'lucide-react'
import { useMatchSetupStore } from '@/store/settingsStore'
import { usePlayerStore } from '@/store/playerStore'
import { shuffleTeams, swapPlayerBetweenTeams } from '@/balancing/engine'
import { toast } from 'sonner'
import type { Player, Team } from '@/types'

function getDisplayName(player: Pick<Player, 'name' | 'nickname'>): string {
  return player.nickname ? `${player.name} (${player.nickname})` : player.name
}

function TeamColumn({
  team,
  label,
  onSwapClick,
  selectedForSwap,
}: {
  team: Team
  label: string
  onSwapClick: (playerId: string, teamSide: 'a' | 'b') => void
  selectedForSwap: { id: string; side: 'a' | 'b' } | null
}) {
  const side = label === 'A' ? 'a' : 'b'
  const avatarColor = (name: string) =>
    `hsl(${(name.charCodeAt(0) * 37) % 360}, 60%, 40%)`

  return (
    <div className="flex-1">
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-3 h-3 rounded-full"
          style={{ background: team.color }}
        />
        <h3 className="font-display font-bold text-sm">{team.name}</h3>
      </div>
      <div className="space-y-1.5">
        {team.players.map(player => {
          const isSelected = selectedForSwap?.id === player.id
          return (
            <motion.button
              key={player.id}
              whileTap={{ scale: 0.96 }}
              onClick={() => onSwapClick(player.id, side)}
              className={`w-full flex items-center gap-2 p-2.5 rounded-xl border transition-all ${
                isSelected
                  ? 'bg-yellow-900/40 border-yellow-500/50'
                  : 'bg-white/5 border-white/10'
              }`}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background: avatarColor(player.name) }}
              >
                {player.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-xs font-semibold truncate">{getDisplayName(player)}</p>
                {player.id === team.captain?.id && (
                  <p className="text-xs text-yellow-400">👑 Captain</p>
                )}
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

export default function TeamBalancePage() {
  const router = useRouter()
  const { team_balance, setTeamBalance, selected_players, common_player_id, setCommonPlayer } = useMatchSetupStore()
  const { players } = usePlayerStore()
  const [selectedForSwap, setSelectedForSwap] = useState<{ id: string; side: 'a' | 'b' } | null>(null)
  const [shuffling, setShuffling] = useState(false)

  if (!team_balance) {
    return (
      <div className="min-h-screen bg-surface-950 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400 mb-4">No teams generated yet</p>
          <Link href="/teams/generator" className="btn-neon">Generate Teams</Link>
        </div>
      </div>
    )
  }

  const { team_a, team_b, fairness_percentage, team_a_win_probability, team_b_win_probability } = team_balance
  const commonPlayer =
    common_player_id
      ? players.find(p => p.id === common_player_id)
        || team_a.players.find(p => p.id === common_player_id)
        || team_b.players.find(p => p.id === common_player_id)
      : null

  async function handleShuffle() {
    setShuffling(true)
    await new Promise(r => setTimeout(r, 400))
    const newBalance = shuffleTeams(team_balance!)
    setTeamBalance(newBalance)
    setSelectedForSwap(null)
    setShuffling(false)
  }

  function handleSwapClick(playerId: string, side: 'a' | 'b') {
    if (!selectedForSwap) {
      setSelectedForSwap({ id: playerId, side })
      return
    }

    if (selectedForSwap.side === side) {
      // Same team — deselect or reselect
      if (selectedForSwap.id === playerId) setSelectedForSwap(null)
      else setSelectedForSwap({ id: playerId, side })
      return
    }

    // Different teams — do swap
    const aId = side === 'b' ? selectedForSwap.id : playerId
    const bId = side === 'b' ? playerId : selectedForSwap.id
    const newBalance = swapPlayerBetweenTeams(team_balance!, aId, bId)
    setTeamBalance(newBalance)
    setSelectedForSwap(null)
    toast.success('Players swapped!')
  }

  async function handleRegenerate() {
    const allIds = [...selected_players]
    setShuffling(true)
    try {
      const res = await fetch('/api/teams/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_ids: allIds,
          team_a_name: team_a.name,
          team_b_name: team_b.name,
        }),
      })
      if (!res.ok) throw new Error()
      const balance = await res.json()
      setTeamBalance(balance)
      setCommonPlayer(balance.common_player_id)
      setSelectedForSwap(null)
    } catch {
      toast.error('Failed to regenerate')
    } finally {
      setShuffling(false)
    }
  }

  const fairnessColor =
    fairness_percentage >= 85 ? 'text-pitch-400' :
    fairness_percentage >= 70 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="min-h-screen bg-surface-950 text-white flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface-950/95 backdrop-blur-md border-b border-white/5 px-4 pt-12 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/teams/generator">
            <motion.button whileTap={{ scale: 0.9 }} className="p-2 rounded-xl bg-white/5">
              <ChevronLeft size={20} />
            </motion.button>
          </Link>
          <div className="flex-1">
            <h1 className="font-display text-xl font-bold">Team Preview</h1>
            <p className="text-xs text-zinc-500">Tap players to swap between teams</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleShuffle}
            disabled={shuffling}
            className="p-2 rounded-xl bg-white/5"
          >
            <Shuffle size={18} className={shuffling ? 'animate-spin text-pitch-400' : 'text-zinc-400'} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleRegenerate}
            disabled={shuffling}
            className="p-2 rounded-xl bg-white/5"
          >
            <RefreshCw size={18} className={shuffling ? 'animate-spin text-pitch-400' : 'text-zinc-400'} />
          </motion.button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-32 space-y-4">
        {/* Fairness meter */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-white/5 border border-white/10"
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-zinc-400">Team Fairness</span>
            <span className={`font-display font-bold text-xl ${fairnessColor}`}>
              {fairness_percentage}%
            </span>
          </div>
          <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${fairness_percentage}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className={`h-full rounded-full ${
                fairness_percentage >= 85 ? 'bg-pitch-500' :
                fairness_percentage >= 70 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-zinc-500">Win prob: {team_a_win_probability}%</span>
            <span className="text-xs text-zinc-500">{team_b_win_probability}%</span>
          </div>
        </motion.div>

        {/* Win probability bar */}
        <div className="flex rounded-2xl overflow-hidden h-10">
          <motion.div
            initial={{ width: '50%' }}
            animate={{ width: `${team_a_win_probability}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="flex items-center justify-center text-xs font-bold"
            style={{ background: team_a.color }}
          >
            {team_a.name}
          </motion.div>
          <motion.div
            initial={{ width: '50%' }}
            animate={{ width: `${team_b_win_probability}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="flex items-center justify-center text-xs font-bold"
            style={{ background: team_b.color }}
          >
            {team_b.name}
          </motion.div>
        </div>

        {/* Swap hint */}
        {selectedForSwap && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 rounded-xl bg-yellow-900/30 border border-yellow-600/30 text-sm text-yellow-300"
          >
            <ArrowLeftRight size={14} />
            Now tap a player from the other team to swap
          </motion.div>
        )}

        {/* Common player info (odd player count mode) */}
        {common_player_id && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-xl bg-blue-900/20 border border-blue-500/30 text-sm"
          >
            <p className="text-blue-300">
              Common Player:{' '}
              <span className="font-semibold text-white">
                {commonPlayer ? getDisplayName(commonPlayer) : 'Unknown'}
              </span>
            </p>
          </motion.div>
        )}

        {/* Teams */}
        <div className="flex gap-3">
          <TeamColumn
            team={team_a}
            label="A"
            onSwapClick={handleSwapClick}
            selectedForSwap={selectedForSwap}
          />
          <div className="w-px bg-white/10" />
          <TeamColumn
            team={team_b}
            label="B"
            onSwapClick={handleSwapClick}
            selectedForSwap={selectedForSwap}
          />
        </div>

        {/* Team Strengths */}
        <div className="grid grid-cols-2 gap-3">
          {[team_a, team_b].map(team => (
            <div key={team.id} className="p-3 rounded-2xl bg-white/5 border border-white/10">
              <p className="text-xs text-zinc-500 mb-1">{team.name} Strength</p>
              <p className="font-display font-bold text-xl">{team.strength_score}<span className="text-sm text-zinc-500">/10</span></p>
              <div className="mt-1 space-y-1">
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>🏏 Bat</span><span>{team.batting_strength}</span>
                </div>
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>🎯 Bowl</span><span>{team.bowling_strength}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Captain info */}
        <div className="grid grid-cols-2 gap-3">
          {[team_a, team_b].map(team => (
            <div key={team.id} className="p-3 rounded-2xl bg-white/5 border border-white/10">
              <p className="text-xs text-zinc-500 mb-1">👑 {team.name} Captain</p>
              <p className="font-semibold text-sm">
                {team.captain ? getDisplayName(team.captain) : '—'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface-950/95 backdrop-blur-md border-t border-white/5">
        <Link href="/match/setup">
          <motion.button
            whileTap={{ scale: 0.97 }}
            className="w-full py-4 rounded-2xl bg-pitch-600 text-white font-display font-bold text-base flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(34,197,94,0.3)]"
          >
            Configure Match Rules
            <ArrowRight size={18} />
          </motion.button>
        </Link>
      </div>
    </div>
  )
}
