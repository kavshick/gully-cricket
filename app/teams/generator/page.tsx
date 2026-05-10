'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Shuffle, ArrowRight, Users, Star, CheckCircle } from 'lucide-react'
import { usePlayerStore } from '@/store/playerStore'
import { useMatchSetupStore } from '@/store/settingsStore'
import { toast } from 'sonner'
import type { Player } from '@/types'

export default function TeamGeneratorPage() {
  const router = useRouter()
  const { players, fetchPlayers, isLoading } = usePlayerStore()
  const { setSelectedPlayers, setCommonPlayer, setTeamBalance, selected_players, common_player_id } = useMatchSetupStore()

  const [selected, setSelected] = useState<Set<string>>(new Set(selected_players))
  const [commonId, setCommonId] = useState<string | undefined>(common_player_id)
  const [generating, setGenerating] = useState(false)
  const [step, setStep] = useState<'select' | 'common'>('select')

  useEffect(() => { fetchPlayers() }, [])

  function togglePlayer(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id); if (commonId === id) setCommonId(undefined) }
      else next.add(id)
      return next
    })
  }

  function toggleCommon(id: string) {
    setCommonId(prev => prev === id ? undefined : id)
  }

  async function generateTeams() {
    if (selected.size < 2) { toast.error('Select at least 2 players'); return }
    setGenerating(true)
    try {
      setSelectedPlayers(Array.from(selected))
      setCommonPlayer(commonId)

      const res = await fetch('/api/teams/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_ids: Array.from(selected),
          common_player_id: commonId,
          team_a_name: 'Team A',
          team_b_name: 'Team B',
        }),
      })
      if (!res.ok) throw new Error('Failed to generate teams')
      const balance = await res.json()
      setTeamBalance(balance)
      router.push('/teams/balance')
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate teams')
    } finally {
      setGenerating(false)
    }
  }

  const selectedPlayers = players.filter(p => selected.has(p.id))
  const isOddCount = selected.size % 2 !== 0

  const avatarColor = (name: string) =>
    `hsl(${(name.charCodeAt(0) * 37) % 360}, 60%, 40%)`

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
              {step === 'select' ? 'Select Players' : 'Common Player?'}
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              {step === 'select'
                ? `${selected.size} selected${isOddCount ? ' (odd — one can be common)' : ''}`
                : 'Optional: one player who bats/bowls for both teams'}
            </p>
          </div>
          {step === 'select' && (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-pitch-900/50 text-pitch-300">
              {selected.size}/{players.length}
            </span>
          )}
        </div>

        {/* Step tabs */}
        <div className="flex gap-2 mt-3">
          {['select', 'common'].map((s, i) => (
            <button
              key={s}
              onClick={() => { if (s === 'common' && selected.size < 2) return; setStep(s as any) }}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                step === s ? 'bg-pitch-600 text-white' : 'bg-white/5 text-zinc-500'
              }`}
            >
              {i + 1}. {s === 'select' ? 'Select Players' : 'Common Player'}
            </button>
          ))}
        </div>
      </div>

      {/* Player list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-32">
        <AnimatePresence mode="wait">
          {step === 'select' ? (
            <motion.div
              key="select"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
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
                        <p className="font-semibold text-sm">{player.name}</p>
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
          ) : (
            <motion.div
              key="common"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-2"
            >
              <p className="text-sm text-zinc-400 mb-4">
                A common player bats and bowls for both teams — great when you have an odd number of players.
              </p>
              <button
                onClick={() => setCommonId(undefined)}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                  !commonId ? 'bg-pitch-900/30 border-pitch-600/50' : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="w-11 h-11 rounded-2xl bg-zinc-700 flex items-center justify-center">
                  <Users size={20} className="text-zinc-400" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-sm">No Common Player</p>
                  <p className="text-xs text-zinc-500">Standard match format</p>
                </div>
                {!commonId && <CheckCircle size={18} className="text-pitch-400" />}
              </button>

              {selectedPlayers.map(player => (
                <motion.button
                  key={player.id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => toggleCommon(player.id)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
                    commonId === player.id
                      ? 'bg-purple-900/30 border-purple-600/50'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center font-display font-bold text-sm text-white"
                    style={{ background: avatarColor(player.name) }}
                  >
                    {player.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-sm">{player.name}</p>
                    <p className="text-xs text-zinc-500">AI Score: {player.ai_balance_score}</p>
                  </div>
                  {commonId === player.id && <CheckCircle size={18} className="text-purple-400" />}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface-950/95 backdrop-blur-md border-t border-white/5">
        {step === 'select' ? (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              if (selected.size < 2) { toast.error('Select at least 2 players'); return }
              setStep('common')
            }}
            className="w-full py-4 rounded-2xl bg-pitch-600 text-white font-display font-bold text-base flex items-center justify-center gap-2 disabled:opacity-40"
            disabled={selected.size < 2}
          >
            Next: Common Player
            <ArrowRight size={18} />
          </motion.button>
        ) : (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={generateTeams}
            disabled={generating}
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
        )}
      </div>
    </div>
  )
}
