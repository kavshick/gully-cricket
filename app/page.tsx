'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Trophy, Users, Play, BarChart2, History, Settings, Plus, Zap } from 'lucide-react'
import { useMatchStore } from '@/store/matchStore'
import { usePlayerStore } from '@/store/playerStore'
import { formatOvers } from '@/scoring/engine'

export default function HomePage() {
  const { match } = useMatchStore()
  const { players, fetchPlayers } = usePlayerStore()
  const [recentMatches, setRecentMatches] = useState<any[]>([])

  useEffect(() => {
    fetchPlayers()
    fetchRecentMatches()
  }, [])

  async function fetchRecentMatches() {
    try {
      const res = await fetch('/api/matches?status=completed')
      if (res.ok) setRecentMatches(await res.json())
    } catch {}
  }

  const activeMatch = match && match.status === 'live'
  const currentInnings = match?.current_innings

  const navItems = [
    { href: '/players', icon: Users, label: 'Players', color: 'from-blue-500 to-blue-700', count: players.length },
    { href: '/teams/generator', icon: Zap, label: 'New Match', color: 'from-pitch-500 to-pitch-700', highlight: true },
    { href: '/leaderboard', icon: Trophy, label: 'Leaderboard', color: 'from-yellow-500 to-yellow-700' },
    { href: '/match/history', icon: History, label: 'History', color: 'from-purple-500 to-purple-700', count: recentMatches.length },
  ]

  return (
    <div className="min-h-screen bg-surface-950 text-white">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-pitch-900/40 via-transparent to-transparent" />
        <div className="relative px-4 pt-12 pb-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight">
                🏏 Gully Cricket
              </h1>
              <p className="text-zinc-400 text-sm mt-1">
                Local Mode • {players.length} players
              </p>
            </div>
            <Link href="/settings">
              <motion.button
                whileTap={{ scale: 0.9 }}
                className="p-3 rounded-2xl bg-white/5 border border-white/10"
              >
                <Settings size={20} className="text-zinc-400" />
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </div>

      <div className="px-4 pb-24 space-y-6">
        {/* Live Match Banner */}
        {activeMatch && currentInnings && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-pitch-600 to-pitch-900 p-5"
          >
            <div className="absolute top-3 right-3 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-400 live-indicator" />
              <span className="text-xs font-semibold text-red-400">LIVE</span>
            </div>

            <p className="text-pitch-200 text-xs font-medium uppercase tracking-wider mb-1">
              Active Match
            </p>
            <h2 className="font-display text-xl font-bold">
              {match.team_a.name} vs {match.team_b.name}
            </h2>

            <div className="flex items-end gap-3 mt-3">
              <span className="font-display text-5xl font-bold">
                {currentInnings.score.runs}
              </span>
              <span className="font-display text-3xl font-semibold text-pitch-300 mb-1">
                /{currentInnings.score.wickets}
              </span>
              <span className="text-pitch-300 mb-1.5">
                ({formatOvers(currentInnings.score.legal_balls)} ov)
              </span>
            </div>

            {match.target && (
              <p className="text-pitch-200 text-sm mt-1">
                Target: {match.target} • Need {match.target - currentInnings.score.runs} from{' '}
                {match.rules.max_overs * 6 - currentInnings.score.legal_balls} balls
              </p>
            )}

            <Link href="/match/live">
              <motion.button
                whileTap={{ scale: 0.97 }}
                className="mt-4 w-full py-3 rounded-2xl bg-white text-pitch-900 font-display font-bold text-base flex items-center justify-center gap-2"
              >
                <Play size={18} fill="currentColor" />
                Continue Scoring
              </motion.button>
            </Link>
          </motion.div>
        )}

        {/* Quick Actions */}
        <div>
          <h2 className="font-display text-lg font-semibold mb-3 text-zinc-200">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {navItems.map((item, i) => (
              <Link key={item.href} href={item.href}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileTap={{ scale: 0.96 }}
                  className={`relative overflow-hidden rounded-3xl p-5 ${
                    item.highlight
                      ? 'bg-gradient-to-br from-pitch-500 to-pitch-700 shadow-[0_0_30px_rgba(34,197,94,0.25)]'
                      : 'bg-white/5 border border-white/10'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-3 ${
                    item.highlight ? 'bg-white/20' : `bg-gradient-to-br ${item.color}`
                  }`}>
                    <item.icon size={20} className="text-white" />
                  </div>
                  <p className="font-display font-semibold text-white">{item.label}</p>
                  {item.count !== undefined && (
                    <p className="text-xs text-zinc-400 mt-0.5">{item.count} total</p>
                  )}
                </motion.div>
              </Link>
            ))}
          </div>
        </div>

        {/* Players Quick View */}
        {players.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg font-semibold text-zinc-200">Players</h2>
              <Link href="/players" className="text-pitch-400 text-sm font-medium">See all</Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {players.slice(0, 8).map((player, i) => (
                <Link key={player.id} href={`/players/${player.id}`}>
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex-shrink-0 flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/5 border border-white/10 w-20"
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center font-display font-bold text-sm"
                      style={{ background: `hsl(${(player.name.charCodeAt(0) * 37) % 360}, 60%, 40%)` }}
                    >
                      {player.name.slice(0, 2).toUpperCase()}
                    </div>
                    <p className="text-xs text-zinc-300 text-center leading-tight truncate w-full text-center">
                      {player.nickname || player.name.split(' ')[0]}
                    </p>
                    <p className="text-xs text-zinc-500">{player.total_runs}r</p>
                  </motion.div>
                </Link>
              ))}
              <Link href="/players/add">
                <motion.div
                  whileTap={{ scale: 0.95 }}
                  className="flex-shrink-0 flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border border-dashed border-white/20 w-20 h-full min-h-[100px]"
                >
                  <Plus size={20} className="text-zinc-500" />
                  <p className="text-xs text-zinc-500">Add</p>
                </motion.div>
              </Link>
            </div>
          </div>
        )}

        {/* Recent Matches */}
        {recentMatches.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg font-semibold text-zinc-200">Recent Matches</h2>
              <Link href="/match/history" className="text-pitch-400 text-sm font-medium">See all</Link>
            </div>
            <div className="space-y-2">
              {recentMatches.slice(0, 3).map((m, i) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10"
                >
                  <div>
                    <p className="font-medium text-sm">
                      {m.team_a_name} vs {m.team_b_name}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {m.total_overs} overs • {new Date(m.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {m.winner_team && (
                    <span className="text-xs font-semibold text-pitch-400 bg-pitch-900/40 px-3 py-1.5 rounded-full">
                      {m.winner_team} won
                    </span>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {players.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center py-12 text-center"
          >
            <div className="text-6xl mb-4">🏏</div>
            <h3 className="font-display text-xl font-bold mb-2">Start your gully cricket journey</h3>
            <p className="text-zinc-400 text-sm mb-6 max-w-xs">
              Add your players first, then generate balanced teams and start scoring!
            </p>
            <Link href="/players/add">
              <button className="btn-neon">
                Add First Player
              </button>
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  )
}
