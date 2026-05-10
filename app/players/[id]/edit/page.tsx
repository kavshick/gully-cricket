'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ChevronLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { usePlayerStore } from '@/store/playerStore'
import type { PreferredRole } from '@/types'

export default function EditPlayerPage() {
  const { id } = useParams()
  const router = useRouter()
  const { players, updatePlayer } = usePlayerStore()
  const player = players.find(p => p.id === id)
  const playerId = player?.id

  const [name, setName] = useState(player?.name || '')
  const [nickname, setNickname] = useState(player?.nickname || '')
  const [role, setRole] = useState<PreferredRole>(player?.preferred_role || 'allrounder')
  const [batting, setBatting] = useState(player?.batting_skill || 5)
  const [bowling, setBowling] = useState(player?.bowling_skill || 5)
  const [fielding, setFielding] = useState(player?.fielding_skill || 5)
  const [saving, setSaving] = useState(false)

  if (!player) {
    return (
      <div className="min-h-screen bg-surface-950 text-white flex items-center justify-center">
        <Link href="/players" className="text-pitch-400">Back to players</Link>
      </div>
    )
  }

  const roles: { value: PreferredRole; label: string; emoji: string }[] = [
    { value: 'batsman', label: 'Batsman', emoji: '🏏' },
    { value: 'bowler', label: 'Bowler', emoji: '🎯' },
    { value: 'allrounder', label: 'All-rounder', emoji: '⚡' },
    { value: 'wicketkeeper', label: 'Keeper', emoji: '🧤' },
  ]

  async function handleSave() {
    if (!playerId) return
    if (!name.trim()) { toast.error('Name required'); return }
    setSaving(true)
    try {
      await updatePlayer(playerId, {
        name: name.trim(),
        nickname: nickname.trim() || undefined,
        batting_skill: batting,
        bowling_skill: bowling,
        fielding_skill: fielding,
        preferred_role: role,
      })
      toast.success('Player updated!')
      router.push(`/players/${id}`)
    } catch {
      toast.error('Failed to update player')
    } finally {
      setSaving(false)
    }
  }

  const avatarColor = `hsl(${(name.charCodeAt(0) * 37) % 360}, 60%, 40%)`

  return (
    <div className="min-h-screen bg-surface-950 text-white">
      <div className="sticky top-0 z-10 bg-surface-950/95 backdrop-blur-md border-b border-white/5 px-4 pt-12 pb-4">
        <div className="flex items-center gap-3">
          <Link href={`/players/${id}`}>
            <motion.button whileTap={{ scale: 0.9 }} className="p-2 rounded-xl bg-white/5">
              <ChevronLeft size={20} />
            </motion.button>
          </Link>
          <h1 className="font-display text-xl font-bold flex-1">Edit Player</h1>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-pitch-600 text-white text-sm font-semibold disabled:opacity-40"
          >
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={15} />}
            Save
          </motion.button>
        </div>
      </div>

      <div className="px-4 py-6 pb-24 space-y-6 max-w-lg mx-auto">
        <div className="flex justify-center">
          <div
            className="w-24 h-24 rounded-3xl flex items-center justify-center font-display font-bold text-3xl text-white"
            style={{ background: avatarColor }}
          >
            {name.slice(0, 2).toUpperCase() || '??'}
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 block">Full Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-pitch-500"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 block">Nickname</label>
            <input
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              placeholder="Optional"
              className="w-full px-4 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-pitch-500"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 block">Role</label>
          <div className="grid grid-cols-2 gap-2">
            {roles.map(r => (
              <motion.button
                key={r.value}
                whileTap={{ scale: 0.96 }}
                onClick={() => setRole(r.value)}
                className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
                  role === r.value ? 'bg-pitch-600/20 border-pitch-500 text-pitch-300' : 'bg-white/5 border-white/10 text-zinc-300'
                }`}
              >
                <span className="text-2xl">{r.emoji}</span>
                <span className="font-semibold text-sm">{r.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        <div className="space-y-5 p-5 rounded-2xl bg-white/5 border border-white/10">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Skills</label>
          {[
            { label: '🏏 Batting', value: batting, onChange: setBatting },
            { label: '🎯 Bowling', value: bowling, onChange: setBowling },
            { label: '🤸 Fielding', value: fielding, onChange: setFielding },
          ].map(s => (
            <div key={s.label} className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-zinc-300">{s.label}</span>
                <span className="font-bold text-pitch-300">{s.value}</span>
              </div>
              <input
                type="range" min={1} max={10} step={1}
                value={s.value}
                onChange={e => s.onChange(Number(e.target.value))}
                className="w-full"
              />
            </div>
          ))}
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 rounded-2xl bg-pitch-600 text-white font-display font-bold text-base disabled:opacity-40"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </motion.button>
      </div>
    </div>
  )
}
