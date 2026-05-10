'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, ChevronLeft, Filter } from 'lucide-react'
import { usePlayerStore } from '@/store/playerStore'
import PlayerCard from '@/components/player/PlayerCard'
import type { Player } from '@/types'

type SortKey = 'name' | 'runs' | 'wickets' | 'matches' | 'ai_score'

export default function PlayersPage() {
  const { players, fetchPlayers, isLoading } = usePlayerStore()
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('name')
  const [showSort, setShowSort] = useState(false)

  useEffect(() => { fetchPlayers() }, [])

  const filtered = players
    .filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.nickname?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'runs': return b.total_runs - a.total_runs
        case 'wickets': return b.total_wickets - a.total_wickets
        case 'matches': return b.matches_played - a.matches_played
        case 'ai_score': return b.ai_balance_score - a.ai_balance_score
        default: return a.name.localeCompare(b.name)
      }
    })

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'name', label: 'Name' },
    { key: 'runs', label: 'Most Runs' },
    { key: 'wickets', label: 'Most Wickets' },
    { key: 'matches', label: 'Most Matches' },
    { key: 'ai_score', label: 'AI Score' },
  ]

  return (
    <div className="min-h-screen bg-surface-950 text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface-950/95 backdrop-blur-md border-b border-white/5 px-4 pt-12 pb-3">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/">
            <motion.button whileTap={{ scale: 0.9 }} className="p-2 rounded-xl bg-white/5">
              <ChevronLeft size={20} />
            </motion.button>
          </Link>
          <div className="flex-1">
            <h1 className="font-display text-xl font-bold">Players</h1>
            <p className="text-xs text-zinc-500">{players.length} registered</p>
          </div>
          <Link href="/players/add">
            <motion.button
              whileTap={{ scale: 0.9 }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-pitch-600 text-white text-sm font-semibold"
            >
              <Plus size={16} />
              Add
            </motion.button>
          </Link>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search players..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-pitch-500"
            />
          </div>
          <div className="relative">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowSort(!showSort)}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 relative"
            >
              <Filter size={16} className="text-zinc-400" />
            </motion.button>
            <AnimatePresence>
              {showSort && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -5 }}
                  className="absolute right-0 top-12 w-44 bg-surface-900 border border-white/10 rounded-2xl overflow-hidden z-20 shadow-2xl"
                >
                  {sortOptions.map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => { setSortBy(opt.key); setShowSort(false) }}
                      className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                        sortBy === opt.key
                          ? 'text-pitch-400 bg-pitch-900/30'
                          : 'text-zinc-300 hover:bg-white/5'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Player List */}
      <div className="px-4 py-4 pb-24">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center py-20 text-center"
          >
            <div className="text-5xl mb-4">👤</div>
            <h3 className="font-display text-lg font-bold mb-2">
              {search ? 'No players found' : 'No players yet'}
            </h3>
            <p className="text-zinc-500 text-sm mb-6">
              {search ? 'Try a different search' : 'Add your squad to get started'}
            </p>
            {!search && (
              <Link href="/players/add">
                <button className="btn-neon">Add First Player</button>
              </Link>
            )}
          </motion.div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {filtered.map((player, i) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Link href={`/players/${player.id}`}>
                    <PlayerCard player={player} />
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
