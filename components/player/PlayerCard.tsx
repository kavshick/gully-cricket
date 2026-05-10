'use client'

import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { Player } from '@/types'

interface PlayerCardProps {
  player: Player
  compact?: boolean
  showAiScore?: boolean
}

export default function PlayerCard({ player, compact = false, showAiScore = true }: PlayerCardProps) {
  const avatarColor = `hsl(${(player.name.charCodeAt(0) * 37) % 360}, 60%, 38%)`

  const formIcon =
    player.form_trend === 'rising' ? <TrendingUp size={12} className="text-pitch-400" /> :
    player.form_trend === 'falling' ? <TrendingDown size={12} className="text-red-400" /> :
    <Minus size={12} className="text-zinc-500" />

  const roleEmoji: Record<string, string> = {
    batsman: '🏏',
    bowler: '🎯',
    allrounder: '⚡',
    wicketkeeper: '🧤',
  }

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/8 transition-colors"
    >
      {/* Avatar */}
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center font-display font-bold text-sm text-white flex-shrink-0"
        style={{ background: avatarColor }}
      >
        {player.name.slice(0, 2).toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-semibold text-sm truncate">{player.name}</p>
          {player.nickname && (
            <span className="text-xs text-zinc-500 truncate hidden sm:inline">"{player.nickname}"</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-zinc-500">
            {roleEmoji[player.preferred_role]} {player.matches_played}M
          </span>
          <span className="flex items-center gap-0.5">{formIcon}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-3 text-right">
        <div>
          <p className="font-display font-bold text-sm">{player.total_runs}</p>
          <p className="text-xs text-zinc-500">runs</p>
        </div>
        <div>
          <p className="font-display font-bold text-sm">{player.total_wickets}</p>
          <p className="text-xs text-zinc-500">wkts</p>
        </div>
        {showAiScore && (
          <div>
            <p className="font-display font-bold text-sm text-pitch-400">{player.ai_balance_score}</p>
            <p className="text-xs text-zinc-500">AI</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}
