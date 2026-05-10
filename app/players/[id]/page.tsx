'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ChevronLeft, Edit2, Trash2, Trophy, Target, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { usePlayerStore } from '@/store/playerStore'
import { toast } from 'sonner'
import type { Player } from '@/types'
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip,
} from 'recharts'

export default function PlayerDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { players, deletePlayer } = usePlayerStore()
  const player = players.find(p => p.id === id)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  if (!player) {
    return (
      <div className="min-h-screen bg-surface-950 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400">Player not found</p>
          <Link href="/players" className="text-pitch-400 text-sm mt-2 block">Back to players</Link>
        </div>
      </div>
    )
  }

  const radarData = [
    { skill: 'Batting', value: player.batting_skill * 10 },
    { skill: 'Bowling', value: player.bowling_skill * 10 },
    { skill: 'Fielding', value: player.fielding_skill * 10 },
    { skill: 'Clutch', value: player.clutch_factor * 10 },
    { skill: 'AI Score', value: player.ai_balance_score * 10 },
  ]

  const formTrendIcon = player.form_trend === 'rising'
    ? <TrendingUp size={14} className="text-pitch-400" />
    : player.form_trend === 'falling'
    ? <TrendingDown size={14} className="text-red-400" />
    : <Minus size={14} className="text-zinc-400" />

  const battingAvg = player.matches_played > 0
    ? Math.round((player.total_runs / Math.max(player.matches_played, 1)) * 10) / 10
    : 0

  async function handleDelete() {
    setDeleting(true)
    try {
      await deletePlayer(player!.id)
      toast.success(`${player!.name} removed`)
      router.push('/players')
    } catch {
      toast.error('Failed to delete player')
      setDeleting(false)
    }
  }

  const avatarColor = `hsl(${(player.name.charCodeAt(0) * 37) % 360}, 60%, 35%)`

  const statCards = [
    { label: 'Matches', value: player.matches_played, unit: '' },
    { label: 'Total Runs', value: player.total_runs, unit: '' },
    { label: 'Wickets', value: player.total_wickets, unit: '' },
    { label: 'Avg', value: battingAvg, unit: '' },
    { label: 'Strike Rate', value: player.strike_rate || 0, unit: '' },
    { label: 'Economy', value: player.economy || 0, unit: '' },
    { label: 'Catches', value: player.catches, unit: '' },
    { label: 'MVPs', value: player.mvps, unit: '' },
  ]

  return (
    <div className="min-h-screen bg-surface-950 text-white">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{ background: `radial-gradient(circle at 50% 0%, ${avatarColor}, transparent 70%)` }}
        />
        <div className="relative px-4 pt-12 pb-6">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/players">
              <motion.button whileTap={{ scale: 0.9 }} className="p-2 rounded-xl bg-white/5">
                <ChevronLeft size={20} />
              </motion.button>
            </Link>
            <div className="flex-1" />
            <Link href={`/players/${id}/edit`}>
              <motion.button whileTap={{ scale: 0.9 }} className="p-2 rounded-xl bg-white/5">
                <Edit2 size={18} className="text-zinc-400" />
              </motion.button>
            </Link>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 rounded-xl bg-white/5"
            >
              <Trash2 size={18} className="text-red-400" />
            </motion.button>
          </div>

          <div className="flex items-center gap-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-20 h-20 rounded-3xl flex items-center justify-center font-display font-bold text-2xl text-white flex-shrink-0"
              style={{ background: avatarColor }}
            >
              {player.name.slice(0, 2).toUpperCase()}
            </motion.div>
            <div>
              <h1 className="font-display text-2xl font-bold">{player.name}</h1>
              {player.nickname && (
                <p className="text-zinc-400 text-sm">"{player.nickname}"</p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 capitalize">
                  {player.preferred_role}
                </span>
                <span className="flex items-center gap-1 text-xs text-zinc-400">
                  {formTrendIcon}
                  <span className="capitalize">{player.form_trend}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-24 space-y-5">
        {/* AI Score */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-gradient-to-br from-pitch-900/50 to-pitch-800/20 border border-pitch-700/30"
        >
          <p className="text-xs text-pitch-400 font-semibold uppercase tracking-wider mb-1">
            AI Balance Score
          </p>
          <div className="flex items-end gap-2">
            <span className="font-display text-4xl font-bold text-pitch-300">
              {player.ai_balance_score}
            </span>
            <span className="text-pitch-500 mb-1">/10</span>
          </div>
          <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${player.ai_balance_score * 10}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-pitch-500 rounded-full"
            />
          </div>
          <p className="text-xs text-zinc-500 mt-2">
            W/L: {player.wins}W / {player.losses}L
            {player.matches_played > 0 && (
              <> • Win rate: {Math.round((player.wins / player.matches_played) * 100)}%</>
            )}
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-2">
          {statCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center"
            >
              <p className="font-display text-lg font-bold text-white">{stat.value}</p>
              <p className="text-xs text-zinc-500 mt-0.5 leading-tight">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Skills Radar */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
          <h3 className="font-display font-semibold mb-3 text-zinc-200">Skill Profile</h3>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.1)" />
              <PolarAngleAxis
                dataKey="skill"
                tick={{ fill: '#9ca3af', fontSize: 11 }}
              />
              <Radar
                dataKey="value"
                stroke="#22c55e"
                fill="#22c55e"
                fillOpacity={0.15}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Skills breakdown */}
        <div className="space-y-3">
          {[
            { label: '🏏 Batting', value: player.batting_skill, color: 'bg-blue-500' },
            { label: '🎯 Bowling', value: player.bowling_skill, color: 'bg-red-500' },
            { label: '🤸 Fielding', value: player.fielding_skill, color: 'bg-yellow-500' },
          ].map(s => (
            <div key={s.label}>
              <div className="flex justify-between mb-1.5">
                <span className="text-sm text-zinc-300">{s.label}</span>
                <span className="text-sm font-semibold text-white">{s.value}/10</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${s.value * 10}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className={`h-full rounded-full ${s.color}`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center p-4">
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="w-full max-w-sm bg-surface-900 rounded-3xl p-6 border border-white/10"
          >
            <h3 className="font-display text-xl font-bold mb-2">Remove Player?</h3>
            <p className="text-zinc-400 text-sm mb-6">
              All of {player.name}'s stats will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm font-semibold"
              >
                Cancel
              </button>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-3 rounded-2xl bg-red-600 text-white text-sm font-semibold"
              >
                {deleting ? 'Removing...' : 'Remove'}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
