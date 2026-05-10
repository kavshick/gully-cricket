'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ChevronLeft, User, Save } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { usePlayerStore } from '@/store/playerStore'
import type { PreferredRole } from '@/types'

interface SkillSliderProps {
  label: string
  value: number
  onChange: (v: number) => void
  color: string
}

function SkillSlider({ label, value, onChange, color }: SkillSliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm text-zinc-300">{label}</span>
        <span className={`font-display font-bold text-lg ${color}`}>{value}</span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, var(--tw-gradient-from) ${(value - 1) * 11.11}%, rgba(255,255,255,0.1) ${(value - 1) * 11.11}%)`,
        }}
      />
      <div className="flex justify-between text-xs text-zinc-600">
        <span>Beginner</span>
        <span>Pro</span>
      </div>
    </div>
  )
}

export default function AddPlayerPage() {
  const router = useRouter()
  const { addPlayer } = usePlayerStore()

  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const [role, setRole] = useState<PreferredRole>('allrounder')
  const [batting, setBatting] = useState(5)
  const [bowling, setBowling] = useState(5)
  const [fielding, setFielding] = useState(5)
  const [saving, setSaving] = useState(false)

  const roles: { value: PreferredRole; label: string; emoji: string }[] = [
    { value: 'batsman', label: 'Batsman', emoji: '🏏' },
    { value: 'bowler', label: 'Bowler', emoji: '🎯' },
    { value: 'allrounder', label: 'All-rounder', emoji: '⚡' },
    { value: 'wicketkeeper', label: 'Keeper', emoji: '🧤' },
  ]

  async function handleSave() {
    if (!name.trim()) { toast.error('Enter player name'); return }
    setSaving(true)
    try {
      await addPlayer({
        name: name.trim(),
        nickname: nickname.trim() || undefined,
        batting_skill: batting,
        bowling_skill: bowling,
        fielding_skill: fielding,
        preferred_role: role,
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
        ai_balance_score: Math.round(((batting + bowling + fielding) / 3) * 10) / 10,
        form_trend: 'stable',
        clutch_factor: 5.0,
      })
      toast.success(`${name} added!`)
      router.push('/players')
    } catch {
      toast.error('Failed to add player')
    } finally {
      setSaving(false)
    }
  }

  const avatarInitials = name.slice(0, 2).toUpperCase() || '?'
  const avatarColor = name
    ? `hsl(${(name.charCodeAt(0) * 37) % 360}, 60%, 40%)`
    : '#374151'

  return (
    <div className="min-h-screen bg-surface-950 text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface-950/95 backdrop-blur-md border-b border-white/5 px-4 pt-12 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/players">
            <motion.button whileTap={{ scale: 0.9 }} className="p-2 rounded-xl bg-white/5">
              <ChevronLeft size={20} />
            </motion.button>
          </Link>
          <h1 className="font-display text-xl font-bold flex-1">Add Player</h1>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-pitch-600 text-white text-sm font-semibold disabled:opacity-40"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={15} />
            )}
            Save
          </motion.button>
        </div>
      </div>

      <div className="px-4 py-6 pb-24 space-y-6 max-w-lg mx-auto">
        {/* Avatar preview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex justify-center"
        >
          <div
            className="w-24 h-24 rounded-3xl flex items-center justify-center font-display font-bold text-3xl text-white transition-all duration-300"
            style={{ background: avatarColor }}
          >
            {avatarInitials}
          </div>
        </motion.div>

        {/* Basic Info */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 block">
              Full Name *
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Rahul Kumar"
              className="w-full px-4 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-pitch-500 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 block">
              Nickname (Optional)
            </label>
            <input
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              placeholder="e.g. King Kohli"
              className="w-full px-4 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-pitch-500 transition-colors"
            />
          </div>
        </div>

        {/* Role Selection */}
        <div>
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 block">
            Preferred Role
          </label>
          <div className="grid grid-cols-2 gap-2">
            {roles.map(r => (
              <motion.button
                key={r.value}
                whileTap={{ scale: 0.96 }}
                onClick={() => setRole(r.value)}
                className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
                  role === r.value
                    ? 'bg-pitch-600/20 border-pitch-500 text-pitch-300'
                    : 'bg-white/5 border-white/10 text-zinc-300'
                }`}
              >
                <span className="text-2xl">{r.emoji}</span>
                <span className="font-semibold text-sm">{r.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Skills */}
        <div className="space-y-5">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
            Skill Ratings
          </label>
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-6">
            <SkillSlider
              label="🏏 Batting Skill"
              value={batting}
              onChange={setBatting}
              color="text-blue-400"
            />
            <SkillSlider
              label="🎯 Bowling Skill"
              value={bowling}
              onChange={setBowling}
              color="text-red-400"
            />
            <SkillSlider
              label="🤸 Fielding Skill"
              value={fielding}
              onChange={setFielding}
              color="text-yellow-400"
            />
          </div>
        </div>

        {/* AI Score Preview */}
        <div className="p-4 rounded-2xl bg-pitch-900/30 border border-pitch-700/30">
          <p className="text-xs text-pitch-400 font-semibold uppercase tracking-wider mb-1">
            AI Balance Score
          </p>
          <p className="font-display text-3xl font-bold text-pitch-300">
            {Math.round(((batting + bowling + fielding) / 3) * 10) / 10}
            <span className="text-lg text-pitch-500">/10</span>
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            Used for auto team balancing. Updates with match performance.
          </p>
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="w-full py-4 rounded-2xl bg-pitch-600 text-white font-display font-bold text-base shadow-[0_0_30px_rgba(34,197,94,0.3)] disabled:opacity-40"
        >
          {saving ? 'Adding Player...' : 'Add Player'}
        </motion.button>
      </div>
    </div>
  )
}
