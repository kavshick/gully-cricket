'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ChevronLeft, Moon, Sun, LogOut, Bell, Volume2 } from 'lucide-react'
import { useSettingsStore } from '@/store/settingsStore'
import { createClient } from '@/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

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

export default function SettingsPage() {
  const router = useRouter()
  const { defaultRules, updateDefaultRules, soundEnabled, toggleSound } = useSettingsStore()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      toast.success('Signed out')
      router.push('/login')
    } catch {
      toast.error('Sign out failed')
    } finally {
      setSigningOut(false)
    }
  }

  const sections = [
    {
      title: 'Default Match Rules',
      items: [
        {
          label: '🏠 Roof Catch',
          desc: 'Enabled by default in new matches',
          value: defaultRules.roof_catch_enabled,
          onChange: (v: boolean) => updateDefaultRules({ roof_catch_enabled: v }),
        },
        {
          label: '✋ One Tip One Hand',
          value: defaultRules.one_tip_one_hand_enabled,
          onChange: (v: boolean) => updateDefaultRules({ one_tip_one_hand_enabled: v }),
        },
        {
          label: '🎾 Bounce Rule',
          value: defaultRules.bounce_rule_enabled,
          onChange: (v: boolean) => updateDefaultRules({ bounce_rule_enabled: v }),
        },
        {
          label: '⚡ Free Hit',
          value: defaultRules.free_hit_enabled,
          onChange: (v: boolean) => updateDefaultRules({ free_hit_enabled: v }),
        },
        {
          label: '🧤 Caught Behind',
          value: defaultRules.caught_behind_enabled,
          onChange: (v: boolean) => updateDefaultRules({ caught_behind_enabled: v }),
        },
      ],
    },
    {
      title: 'App Preferences',
      items: [
        {
          label: '🔊 Sound Effects',
          value: soundEnabled,
          onChange: () => toggleSound(),
        },
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-surface-950 text-white">
      <div className="sticky top-0 z-10 bg-surface-950/95 backdrop-blur-md border-b border-white/5 px-4 pt-12 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/">
            <motion.button whileTap={{ scale: 0.9 }} className="p-2 rounded-xl bg-white/5">
              <ChevronLeft size={20} />
            </motion.button>
          </Link>
          <h1 className="font-display text-xl font-bold">Settings</h1>
        </div>
      </div>

      <div className="px-4 py-5 pb-24 space-y-6 max-w-lg mx-auto">
        {sections.map(section => (
          <div key={section.title}>
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              {section.title}
            </h2>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 divide-y divide-white/5">
              {section.items.map(item => (
                <div key={item.label} className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.label}</p>
                    {'desc' in item && item.desc && (
                      <p className="text-xs text-zinc-500 mt-0.5">{item.desc}</p>
                    )}
                  </div>
                  <Toggle value={item.value} onChange={item.onChange} />
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Default overs */}
        <div>
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Default Overs
          </h2>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-medium">Overs per match</p>
              <span className="font-display font-bold text-pitch-300 text-xl">{defaultRules.max_overs}</span>
            </div>
            <input
              type="range" min={1} max={20} step={1}
              value={defaultRules.max_overs}
              onChange={e => updateDefaultRules({ max_overs: Number(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-zinc-600 mt-1">
              <span>1</span><span>20 overs</span>
            </div>
          </div>
        </div>

        {/* Account */}
        <div>
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Account</h2>
          <div className="space-y-2">
            <Link href="/login">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                <span className="text-sm font-medium">Sign In / Register</span>
                <ChevronLeft size={16} className="rotate-180 text-zinc-500" />
              </div>
            </Link>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full p-4 rounded-2xl bg-red-900/20 border border-red-800/30 text-red-400 font-semibold text-sm flex items-center justify-center gap-2"
            >
              <LogOut size={16} />
              {signingOut ? 'Signing out...' : 'Sign Out'}
            </motion.button>
          </div>
        </div>

        {/* App info */}
        <div className="text-center py-4">
          <p className="text-xs text-zinc-600">Gully Cricket v1.0</p>
          <p className="text-xs text-zinc-700 mt-1">Built with ❤️ for gully cricket fans</p>
        </div>
      </div>
    </div>
  )
}
