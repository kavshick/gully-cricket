'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ChevronLeft, Trophy, Target, TrendingUp, Zap } from 'lucide-react'

type Category = 'runs' | 'wickets' | 'strike_rate' | 'economy' | 'matches'

interface LeaderboardPlayer {
  player_id: string
  name: string
  total_runs: number
  total_wickets: number
  batting_strike_rate: number
  bowling_economy: number
  total_matches: number
  total_fours: number
  total_sixes: number
}

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<Category>('runs')

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(d => { setData(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const categories: { key: Category; label: string; icon: React.ReactNode; valueKey: keyof LeaderboardPlayer; unit?: string }[] = [
    { key: 'runs', label: 'Most Runs', icon: <Trophy size={14} />, valueKey: 'total_runs' },
    { key: 'wickets', label: 'Wickets', icon: <Target size={14} />, valueKey: 'total_wickets' },
    { key: 'strike_rate', label: 'Strike Rate', icon: <Zap size={14} />, valueKey: 'batting_strike_rate', unit: '' },
    { key: 'economy', label: 'Economy', icon: <TrendingUp size={14} />, valueKey: 'bowling_economy', unit: '' },
  ]

  const active = categories.find(c => c.key === category)!

  const sorted = [...data].sort((a, b) => {
    const av = Number(a[active.valueKey]) || 0
    const bv = Number(b[active.valueKey]) || 0
    if (category === 'economy') return av - bv // lower is better
    return bv - av
  })

  const medalEmojis = ['🥇', '🥈', '🥉']

  return (
    <div className="min-h-screen bg-surface-950 text-white">
      <div className="sticky top-0 z-10 bg-surface-950/95 backdrop-blur-md border-b border-white/5 px-4 pt-12 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/">
            <motion.button whileTap={{ scale: 0.9 }} className="p-2 rounded-xl bg-white/5">
              <ChevronLeft size={20} />
            </motion.button>
          </Link>
          <h1 className="font-display text-xl font-bold">Leaderboard</h1>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map(cat => (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                category === cat.key
                  ? 'bg-pitch-600 text-white'
                  : 'bg-white/5 text-zinc-400 border border-white/10'
              }`}
            >
              {cat.icon}
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 pb-24">
        {loading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="text-5xl mb-4">📊</div>
            <h3 className="font-display text-lg font-bold mb-2">No data yet</h3>
            <p className="text-zinc-500 text-sm">Play some matches to see leaderboards</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sorted.map((player, i) => {
              const value = Number(player[active.valueKey]) || 0
              const displayValue = typeof value === 'number' && !Number.isInteger(value)
                ? value.toFixed(2)
                : value

              return (
                <motion.div
                  key={player.player_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                    i === 0
                      ? 'bg-yellow-900/20 border-yellow-700/30'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <span className="text-2xl w-8 text-center flex-shrink-0">
                    {medalEmojis[i] || <span className="font-display font-bold text-zinc-500 text-sm">{i + 1}</span>}
                  </span>
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-display font-bold text-sm text-white flex-shrink-0"
                    style={{ background: `hsl(${(player.name.charCodeAt(0) * 37) % 360}, 60%, 40%)` }}
                  >
                    {player.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{player.name}</p>
                    <p className="text-xs text-zinc-500">{player.total_matches} matches</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-bold text-xl text-pitch-300">{displayValue}</p>
                    <p className="text-xs text-zinc-500">{active.label}</p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
