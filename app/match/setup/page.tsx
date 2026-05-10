'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ChevronLeft, ArrowRight } from 'lucide-react'
import { useMatchSetupStore } from '@/store/settingsStore'
import type { MatchRules, RetirementMode } from '@/types'

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <motion.button
      onClick={() => onChange(!value)}
      whileTap={{ scale: 0.9 }}
      className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
        value ? 'bg-pitch-600' : 'bg-white/15'
      }`}
    >
      <motion.div
        animate={{ x: value ? 26 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow"
      />
    </motion.button>
  )
}

function RuleRow({
  label,
  desc,
  value,
  onChange,
}: {
  label: string
  desc?: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center gap-3 py-3.5 border-b border-white/5 last:border-0">
      <div className="flex-1">
        <p className="text-sm font-medium text-white">{label}</p>
        {desc && <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>}
      </div>
      <Toggle value={value} onChange={onChange} />
    </div>
  )
}

export default function MatchSetupPage() {
  const router = useRouter()
  const { rules, updateRules, team_balance } = useMatchSetupStore()

  if (!team_balance) {
    return (
      <div className="min-h-screen bg-surface-950 text-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-zinc-400">Generate teams first</p>
          <Link href="/teams/generator" className="btn-neon block">Go to Team Generator</Link>
        </div>
      </div>
    )
  }

  const retirementModes: { value: RetirementMode; label: string; desc: string }[] = [
    { value: 'returnable', label: 'Retire & Return', desc: 'Batsman retires but can come back later' },
    { value: 'retire_out', label: 'Retire Out', desc: 'Retired batter cannot return (no wicket)' },
    { value: 'score_based', label: 'Score Limit', desc: `Auto-retire at ${rules.retirement_score_limit} runs` },
    { value: 'unlimited_swap', label: 'Unlimited Swap', desc: 'Players rotate in/out freely' },
  ]

  return (
    <div className="min-h-screen bg-surface-950 text-white flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface-950/95 backdrop-blur-md border-b border-white/5 px-4 pt-12 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/teams/balance">
            <motion.button whileTap={{ scale: 0.9 }} className="p-2 rounded-xl bg-white/5">
              <ChevronLeft size={20} />
            </motion.button>
          </Link>
          <div>
            <h1 className="font-display text-xl font-bold">Match Setup</h1>
            <p className="text-xs text-zinc-500">{team_balance.team_a.name} vs {team_balance.team_b.name}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 pb-32 space-y-5 max-w-lg mx-auto w-full">
        {/* Match Format */}
        <section>
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Match Format</h2>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-4">
            {/* Overs */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-medium">Max Overs</p>
                <span className="font-display font-bold text-pitch-300 text-lg">{rules.max_overs}</span>
              </div>
              <input
                type="range" min={1} max={20} step={1}
                value={rules.max_overs}
                onChange={e => updateRules({ max_overs: Number(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-zinc-600 mt-1">
                <span>1 over</span><span>20 overs</span>
              </div>
            </div>

            {/* Players per team */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-medium">Players per Team</p>
                <span className="font-display font-bold text-pitch-300 text-lg">{rules.max_players}</span>
              </div>
              <input
                type="range" min={2} max={11} step={1}
                value={rules.max_players}
                onChange={e => updateRules({ max_players: Number(e.target.value) })}
                className="w-full"
              />
            </div>

            {/* Ball type */}
            <div>
              <p className="text-sm font-medium mb-2">Ball Type</p>
              <div className="grid grid-cols-2 gap-2">
                {(['tennis', 'tape_ball', 'rubber', 'leather'] as const).map(b => (
                  <button
                    key={b}
                    onClick={() => updateRules({ ball_type: b })}
                    className={`py-2 px-3 rounded-xl text-sm font-semibold capitalize transition-all ${
                      rules.ball_type === b
                        ? 'bg-pitch-600 text-white'
                        : 'bg-white/5 border border-white/10 text-zinc-400'
                    }`}
                  >
                    {b.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Special Rules */}
        <section>
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Gully Rules</h2>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <RuleRow
              label="🏠 Roof Catch"
              desc="Ball caught after hitting the roof is OUT"
              value={rules.roof_catch_enabled}
              onChange={v => updateRules({ roof_catch_enabled: v })}
            />
            <RuleRow
              label="🧤 Caught Behind"
              desc="Nicks to keeper count as dismissal"
              value={rules.caught_behind_enabled}
              onChange={v => updateRules({ caught_behind_enabled: v })}
            />
            <RuleRow
              label="✋ One Tip One Hand"
              desc="One bounce + one-handed catch = OUT"
              value={rules.one_tip_one_hand_enabled}
              onChange={v => updateRules({ one_tip_one_hand_enabled: v })}
            />
            <RuleRow
              label="🎾 Bounce Rule"
              desc="Second bounce in an over is auto-wide"
              value={rules.bounce_rule_enabled}
              onChange={v => updateRules({ bounce_rule_enabled: v })}
            />
            <RuleRow
              label="🚀 Direct Six Out"
              desc="Ball hits boundary fence directly = OUT"
              value={rules.direct_six_out_enabled}
              onChange={v => updateRules({ direct_six_out_enabled: v })}
            />
            <RuleRow
              label="⚡ Free Hit"
              desc="No ball results in a free hit delivery"
              value={rules.free_hit_enabled}
              onChange={v => updateRules({ free_hit_enabled: v })}
            />
          </div>
        </section>

        {/* Retirement Rules */}
        <section>
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Retirement Mode</h2>
          <div className="space-y-2">
            {retirementModes.map(mode => (
              <motion.button
                key={mode.value}
                whileTap={{ scale: 0.97 }}
                onClick={() => updateRules({ retirement_mode: mode.value })}
                className={`w-full flex items-start gap-3 p-4 rounded-2xl border text-left transition-all ${
                  rules.retirement_mode === mode.value
                    ? 'bg-pitch-900/30 border-pitch-600/50'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                  rules.retirement_mode === mode.value
                    ? 'border-pitch-500 bg-pitch-500'
                    : 'border-zinc-600'
                }`}>
                  {rules.retirement_mode === mode.value && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-sm">{mode.label}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{mode.desc}</p>
                </div>
              </motion.button>
            ))}
          </div>

          {/* Score limit slider (only when score_based) */}
          {rules.retirement_mode === 'score_based' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3 p-4 rounded-2xl bg-white/5 border border-white/10"
            >
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-medium">Retire at runs</p>
                <span className="font-display font-bold text-pitch-300 text-lg">
                  {rules.retirement_score_limit}
                </span>
              </div>
              <input
                type="range" min={10} max={100} step={5}
                value={rules.retirement_score_limit}
                onChange={e => updateRules({ retirement_score_limit: Number(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-zinc-600 mt-1">
                <span>10 runs</span><span>100 runs</span>
              </div>
            </motion.div>
          )}
        </section>
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface-950/95 backdrop-blur-md border-t border-white/5">
        <Link href="/match/toss">
          <motion.button
            whileTap={{ scale: 0.97 }}
            className="w-full py-4 rounded-2xl bg-pitch-600 text-white font-display font-bold text-base flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(34,197,94,0.3)]"
          >
            Proceed to Toss
            <ArrowRight size={18} />
          </motion.button>
        </Link>
      </div>
    </div>
  )
}
