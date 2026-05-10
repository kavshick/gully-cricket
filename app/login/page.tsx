'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { createClient } from '@/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  async function handleAuth() {
    if (!email || !password) {
      toast.error('Fill in all fields')
      return
    }
    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/')
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` },
        })
        if (error) throw error
        toast.success('Check your email to confirm your account!')
      }
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleGuestMode() {
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col">
      {/* Top decoration */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="text-7xl mb-4">🏏</div>
          <h1 className="font-display text-4xl font-bold text-white mb-2">Gully Cricket</h1>
          <p className="text-zinc-400">Score live. Track stats. Play harder.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full max-w-sm"
        >
          {/* Mode Toggle */}
          <div className="flex rounded-2xl bg-white/5 border border-white/10 p-1 mb-6">
            {(['login', 'register'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  mode === m
                    ? 'bg-pitch-600 text-white shadow-lg'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          {/* Form */}
          <div className="space-y-3 mb-5">
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full pl-11 pr-4 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-pitch-500 transition-colors"
                onKeyDown={e => e.key === 'Enter' && handleAuth()}
              />
            </div>

            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full pl-11 pr-12 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-pitch-500 transition-colors"
                onKeyDown={e => e.key === 'Enter' && handleAuth()}
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <motion.button
            onClick={handleAuth}
            whileTap={{ scale: 0.97 }}
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-pitch-600 text-white font-display font-bold text-base flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(34,197,94,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {mode === 'login' ? 'Sign In' : 'Create Account'}
                <ArrowRight size={18} />
              </>
            )}
          </motion.button>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-zinc-500 text-xs">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <motion.button
            onClick={handleGuestMode}
            whileTap={{ scale: 0.97 }}
            className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-zinc-300 font-display font-semibold text-sm"
          >
            Continue as Guest
          </motion.button>

          <p className="text-center text-xs text-zinc-600 mt-6">
            Your data syncs across devices when signed in
          </p>
        </motion.div>
      </div>
    </div>
  )
}
