'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ChevronLeft, Shuffle, CheckCircle } from 'lucide-react'
import { usePlayerStore } from '@/store/playerStore'
import { useMatchSetupStore } from '@/store/settingsStore'
import { toast } from 'sonner'

export default function TeamGeneratorPage() {
  const router = useRouter()
  const { players, fetchPlayers, isLoading, addPlayer } = usePlayerStore()
  const { setSelectedPlayers, setCommonPlayer, setTeamBalance, selected_players } = useMatchSetupStore()

  const [selected, setSelected] = useState<Set<string>>(new Set(selected_players))
  const [generating, setGenerating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newNickname, setNewNickname] = useState('')
  const [addingPlayer, setAddingPlayer] = useState(false)

  useEffect(() => { fetchPlayers() }, [])

  function togglePlayer(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) }
      else next.add(id)
      return next
    })
  }

  async function handleQuickAddPlayer() {
    if (!newName.trim()) {
      toast.error('Enter player name')
      return
    }
    setAddingPlayer(true)
    try {
      const player = await addPlayer({
        name: newName.trim(),
        nickname: newNickname.trim() || undefined,
        preferred_role: 'allrounder',
        batting_skill: 5,
        bowling_skill: 5,
        fielding_skill: 5,
        matches_played: 0,
        total_runs: 0,
        total_wickets: 0,
        strike_rate: 0,
        economy: 0,
        catches: 0,
        run_outs: 0,
        mvps: 0,
        wins: 0,
        losses: 0,
        ai_balance_score: 5,
        form_trend: 'stable',
        clutch_factor: 5,
      })
      setSelected(prev => new Set([...Array.from(prev), player.id]))
      setNewName('')
      setNewNickname('')
      toast.success('Player added with default stats')
    } catch {
      toast.error('Failed to add player')
    } finally {
      setAddingPlayer(false)
    }
  }

  async function generateTeams() {
    if (selected.size < 2) { toast.error('Select at least 2 players'); return }
    setGenerating(true)
    try {
      setSelectedPlayers(Array.from(selected))
      setCommonPlayer(undefined)

      const res = await fetch('/api/teams/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_ids: Array.from(selected),
          team_a_name: 'Team A',
          team_b_name: 'Team B',
        }),
      })
      if (!res.ok) throw new Error('Failed to generate teams')
      const balance = await res.json()
      setTeamBalance(balance)
      setCommonPlayer(balance.common_player_id)
      router.push('/teams/balance')
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate teams')
    } finally {
      setGenerating(false)
    }
  }

  const isOddCount = selected.size % 2 !== 0

  const avatarColor = (name: string) =>
    `hsl(${(name.charCodeAt(0) * 37) % 360}, 60%, 40%)`
  const displayName = (name: string, nickname?: string) =>
    nickname ? `${name} (${nickname})` : name

  return (
    <div className="min-h-screen bg-surface-950 text-white flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface-950/95 backdrop-blur-md border-b border-white/5 px-4 pt-12 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <Link href="/">
            <motion.button whileTap={{ scale: 0.9 }} className="p-2 rounded-xl bg-white/5">
              <ChevronLeft size={20} />
            </motion.button>
          </Link>
          <div className="flex-1">
            <h1 className="font-display text-xl font-bold">
              Select Players
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              {`${selected.size} selected${isOddCount ? ' (odd count: common player auto-randomized)' : ''}`}
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-pitch-900/50 text-pitch-300">
            {selected.size}/{players.length}
          </span>
        </div>
      </div>

      {/* Player list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-32">
        <motion.div
          key="select"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-2"
        >
              {/* Select All */}
              <button
                onClick={() => {
                  if (selected.size === players.length) setSelected(new Set())
                  else setSelected(new Set(players.map(p => p.id)))
                }}
                className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                {selected.size === players.length ? 'Deselect All' : 'Select All'}
              </button>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <p className="text-xs text-zinc-400">Quick add player (default stats: all 5, totals 0)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="Player name"
                    className="px-3 py-2.5 rounded-xl bg-surface-900 border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-pitch-500"
                  />
                  <input
                    value={newNickname}
                    onChange={e => setNewNickname(e.target.value)}
                    placeholder="Nickname (optional)"
                    className="px-3 py-2.5 rounded-xl bg-surface-900 border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-pitch-500"
                  />
                </div>
                <button
                  onClick={handleQuickAddPlayer}
                  disabled={addingPlayer || !newName.trim()}
                  className="w-full py-2.5 rounded-xl bg-pitch-700 hover:bg-pitch-600 transition-colors text-sm font-semibold disabled:opacity-50"
                >
                  {addingPlayer ? 'Adding...' : 'Add Player'}
                </button>
              </div>

              {isLoading ? (
                [...Array(6)].map((_, i) => (
                  <div key={i} className="h-16 rounded-2xl bg-white/5 animate-pulse" />
                ))
              ) : (
                players.map(player => {
                  const isSelected = selected.has(player.id)
                  return (
                    <motion.button
                      key={player.id}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => togglePlayer(player.id)}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
                        isSelected
                          ? 'bg-pitch-900/30 border-pitch-600/50'
                          : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <div className="relative">
                        <div
                          className="w-11 h-11 rounded-2xl flex items-center justify-center font-display font-bold text-sm text-white"
                          style={{ background: avatarColor(player.name) }}
                        >
                          {player.name.slice(0, 2).toUpperCase()}
                        </div>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-pitch-500 rounded-full flex items-center justify-center"
                          >
                            <CheckCircle size={10} className="text-white" />
                          </motion.div>
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-sm">{displayName(player.name, player.nickname)}</p>
                        <p className="text-xs text-zinc-500 capitalize">
                          {player.preferred_role} • AI: {player.ai_balance_score}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-zinc-400">{player.total_runs}r</p>
                        <p className="text-xs text-zinc-600">{player.total_wickets}w</p>
                      </div>
                    </motion.button>
                  )
                })
              )}
        </motion.div>
      </div>

      {/* Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface-950/95 backdrop-blur-md border-t border-white/5">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={generateTeams}
          disabled={generating || selected.size < 2}
          className="w-full py-4 rounded-2xl bg-pitch-600 text-white font-display font-bold text-base flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(34,197,94,0.3)] disabled:opacity-50"
        >
          {generating ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Shuffle size={18} />
              Generate Balanced Teams
            </>
          )}
        </motion.button>
      </div>
    </div>
  )
}
