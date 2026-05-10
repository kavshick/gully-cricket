'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ChevronLeft, Trophy, Calendar } from 'lucide-react'
import { formatOvers } from '@/scoring/engine'

interface MatchSummary {
  id: string
  status: string
  team_a_name: string
  team_b_name: string
  winner_team: string | null
  total_overs: number
  created_at: string
  completed_at: string | null
}

export default function MatchHistoryPage() {
  const [matches, setMatches] = useState<MatchSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/matches?status=completed')
      .then(r => r.json())
      .then(d => { setMatches(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-surface-950 text-white">
      <div className="sticky top-0 z-10 bg-surface-950/95 backdrop-blur-md border-b border-white/5 px-4 pt-12 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/">
            <motion.button whileTap={{ scale: 0.9 }} className="p-2 rounded-xl bg-white/5">
              <ChevronLeft size={20} />
            </motion.button>
          </Link>
          <div>
            <h1 className="font-display text-xl font-bold">Match History</h1>
            <p className="text-xs text-zinc-500">{matches.length} completed matches</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 pb-24">
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : matches.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="text-5xl mb-4">📋</div>
            <h3 className="font-display text-lg font-bold mb-2">No matches yet</h3>
            <p className="text-zinc-500 text-sm mb-6">Play your first match to see history here</p>
            <Link href="/teams/generator">
              <button className="btn-neon">Start a Match</button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((match, i) => (
              <motion.div
                key={match.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="p-4 rounded-2xl bg-white/5 border border-white/10"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-display font-bold">
                      {match.team_a_name} vs {match.team_b_name}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} />
                        {new Date(match.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </span>
                      <span>{match.total_overs} overs</span>
                    </div>
                    {match.winner_team && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <Trophy size={13} className="text-yellow-400" />
                        <span className="text-xs font-semibold text-yellow-400">
                          {match.winner_team} won
                        </span>
                      </div>
                    )}
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                    match.status === 'completed'
                      ? 'bg-pitch-900/40 text-pitch-400'
                      : 'bg-yellow-900/40 text-yellow-400'
                  }`}>
                    {match.status}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
