'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useMatchStore } from '@/store/matchStore'
import type { Match, InningsState } from '@/types'
import { toast } from 'sonner'

interface RetireModalProps {
  match: Match
  innings: InningsState
  onClose: () => void
  onRetired?: (retiredPlayerId: string) => void
}

export default function RetireModal({ match, innings, onClose, onRetired }: RetireModalProps) {
  const { retireBatsman, returnBatsman } = useMatchStore()
  const [tab, setTab] = useState<'retire' | 'return'>('retire')
  const [selectedRetire, setSelectedRetire] = useState<string | null>(null)
  const [selectedReturn, setSelectedReturn] = useState<string | null>(null)
  const [replaceWith, setReplaceWith] = useState<string | null>(null)

  const activeBatsmen = innings.batsmen
  const retiredEligible = innings.return_eligible_players
  const retirementMode = match.rules.retirement_mode

  const avatarColor = (name: string) =>
    `hsl(${(name.charCodeAt(0) * 37) % 360}, 60%, 40%)`

  function handleRetire() {
    if (!selectedRetire) return
    if (retirementMode === 'retire_out') {
      retireBatsman(selectedRetire, 'voluntary')
      toast.success('Batsman retired out')
    } else {
      retireBatsman(selectedRetire, 'voluntary')
      toast.success('Batsman retired — can return later')
    }
    onRetired?.(selectedRetire)
    onClose()
  }

  function handleReturn() {
    if (!selectedReturn || !replaceWith) return
    returnBatsman(selectedReturn, replaceWith)
    toast.success('Batsman returned!')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center">
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="w-full max-w-lg bg-surface-900 rounded-t-3xl overflow-hidden"
        style={{ maxHeight: '80vh' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="font-display text-xl font-bold">Player Management</h2>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/5">
            <X size={18} className="text-zinc-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setTab('retire')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              tab === 'retire' ? 'text-yellow-400 border-b-2 border-yellow-500' : 'text-zinc-500'
            }`}
          >
            Retire Player
          </button>
          {retiredEligible.length > 0 && (
            <button
              onClick={() => setTab('return')}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                tab === 'return' ? 'text-pitch-400 border-b-2 border-pitch-500' : 'text-zinc-500'
              }`}
            >
              Return Player
            </button>
          )}
        </div>

        <div className="overflow-y-auto p-5 pb-8 space-y-4">
          {tab === 'retire' ? (
            <>
              <div className="p-3 rounded-xl bg-yellow-900/20 border border-yellow-700/30">
                <p className="text-xs text-yellow-400">
                  Mode: <span className="font-semibold capitalize">{match.rules.retirement_mode.replace('_', ' ')}</span>
                  {match.rules.retirement_mode === 'retire_out' && ' — permanent, no wicket'}
                  {match.rules.retirement_mode === 'returnable' && ' — can return if team collapses'}
                </p>
              </div>

              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Select batsman to retire
              </p>
              {activeBatsmen.map(b => (
                <motion.button
                  key={b.player.id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelectedRetire(selectedRetire === b.player.id ? null : b.player.id)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
                    selectedRetire === b.player.id
                      ? 'bg-yellow-900/40 border-yellow-600/50'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white"
                    style={{ background: avatarColor(b.player.name) }}
                  >
                    {b.player.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-sm">{b.player.name}</p>
                    <p className="text-xs text-zinc-500">
                      {b.runs} runs ({b.balls_faced}) • {b.is_striker ? 'On strike' : 'Non-striker'}
                    </p>
                  </div>
                </motion.button>
              ))}

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleRetire}
                disabled={!selectedRetire}
                className="w-full py-4 rounded-2xl bg-yellow-600 text-black font-display font-bold disabled:opacity-40"
              >
                Retire Batsman
              </motion.button>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Who returns?
              </p>
              {retiredEligible.map(p => (
                <motion.button
                  key={p.id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelectedReturn(selectedReturn === p.id ? null : p.id)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
                    selectedReturn === p.id
                      ? 'bg-pitch-900/40 border-pitch-500'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white"
                    style={{ background: avatarColor(p.name) }}
                  >
                    {p.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-sm">{p.name}</p>
                    <p className="text-xs text-pitch-400">Eligible to return</p>
                  </div>
                </motion.button>
              ))}

              {selectedReturn && (
                <>
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mt-2">
                    Replace which batsman?
                  </p>
                  {activeBatsmen.map(b => (
                    <motion.button
                      key={b.player.id}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setReplaceWith(replaceWith === b.player.id ? null : b.player.id)}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
                        replaceWith === b.player.id
                          ? 'bg-red-900/40 border-red-600/50'
                          : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white"
                        style={{ background: avatarColor(b.player.name) }}
                      >
                        {b.player.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-sm">{b.player.name}</p>
                        <p className="text-xs text-zinc-500">{b.runs} runs</p>
                      </div>
                    </motion.button>
                  ))}
                </>
              )}

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleReturn}
                disabled={!selectedReturn || !replaceWith}
                className="w-full py-4 rounded-2xl bg-pitch-600 text-white font-display font-bold disabled:opacity-40"
              >
                Return Batsman
              </motion.button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
