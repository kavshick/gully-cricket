'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Trophy, Share2, Home, RotateCcw } from 'lucide-react'
import { useMatchStore } from '@/store/matchStore'
import { computeCRR, formatOvers, calculateMVPScore } from '@/scoring/engine'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from 'recharts'
import { getOverSummaries } from '@/scoring/engine'
import confetti from 'canvas-confetti'

export default function MatchSummaryPage() {
  const router = useRouter()
  const { match, clearMatch, syncToSupabase } = useMatchStore()
  const confettiFired = useRef(false)

  useEffect(() => {
    if (match && !confettiFired.current) {
      confettiFired.current = true
      setTimeout(() => {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.4 },
          colors: ['#22c55e', '#16a34a', '#ffffff', '#fbbf24'],
        })
      }, 500)
      syncToSupabase()
    }
  }, [])

  if (!match || match.status !== 'completed') {
    router.push('/')
    return null
  }

  const inn1 = match.innings1
  const inn2 = match.innings2

  const winnerTeam = match.winner_team_id === match.team_a.id
    ? match.team_a
    : match.winner_team_id === match.team_b.id
    ? match.team_b
    : null

  // Compute MVP
  const allPlayers = [...match.team_a.players, ...match.team_b.players]
  let mvpPlayer = allPlayers[0]
  let maxMvpScore = 0

  for (const player of allPlayers) {
    const inn1Batsman = inn1.batsmen.find(b => b.player.id === player.id)
    const inn2Batsman = inn2?.batsmen.find(b => b.player.id === player.id)
    const runs = (inn1Batsman?.runs || 0) + (inn2Batsman?.runs || 0)
    const balls = (inn1Batsman?.balls_faced || 0) + (inn2Batsman?.balls_faced || 0)
    const wickets = inn1.balls.filter(b => b.type === 'wicket' && b.bowler_id === player.id).length +
      (inn2?.balls.filter(b => b.type === 'wicket' && b.bowler_id === player.id).length || 0)
    const sr = balls > 0 ? (runs / balls) * 100 : 0
    const mvp = calculateMVPScore(runs, wickets, 0, sr, 0, 0)
    if (mvp > maxMvpScore) { maxMvpScore = mvp; mvpPlayer = player }
  }

  // Over-by-over run chart
  const inn1Overs = getOverSummaries(inn1.balls)
  const inn2Overs = getOverSummaries(inn2?.balls || [])
  const maxOvers = Math.max(inn1Overs.length, inn2Overs.length)
  const overChartData = Array.from({ length: maxOvers }, (_, i) => ({
    over: `O${i + 1}`,
    inn1: inn1Overs[i]?.runs ?? null,
    inn2: inn2Overs[i]?.runs ?? null,
  }))

  // Batting comparison
  const battingData = allPlayers
    .map(p => {
      const b1 = inn1.batsmen.find(b => b.player.id === p.id)
      const b2 = inn2?.batsmen.find(b => b.player.id === p.id)
      const runs = (b1?.runs || 0) + (b2?.runs || 0)
      return { name: p.name.split(' ')[0], runs }
    })
    .filter(d => d.runs > 0)
    .sort((a, b) => b.runs - a.runs)
    .slice(0, 8)

  const resultText = match.result === 'team_a_won'
    ? `${match.innings1.batting_team.name} won by ${inn1.score.runs - (inn2?.score.runs || 0)} runs`
    : match.result === 'team_b_won'
    ? `${inn2?.batting_team.name} won by ${(match.rules.max_players - 1) - (inn2?.score.wickets || 0)} wickets`
    : 'Match tied!'

  return (
    <div className="min-h-screen bg-surface-950 text-white">
      {/* Trophy header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-yellow-900/40 to-surface-950 px-4 pt-16 pb-8 text-center">
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="text-8xl mb-4"
        >
          🏆
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="font-display text-3xl font-bold mb-2"
        >
          {winnerTeam ? `${winnerTeam.name} wins!` : "It's a Tie!"}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-zinc-400"
        >
          {resultText}
        </motion.p>
      </div>

      <div className="px-4 pb-24 space-y-5">
        {/* Scorecard */}
        <div className="space-y-2">
          {[
            { team: inn1.batting_team, score: inn1.score, innings: 1 },
            ...(inn2 ? [{ team: inn2.batting_team, score: inn2.score, innings: 2 }] : []),
          ].map(({ team, score, innings }) => (
            <motion.div
              key={innings}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: innings * 0.1 }}
              className="p-4 rounded-2xl bg-white/5 border border-white/10"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-zinc-400 mb-1">{team.name}</p>
                  <div className="flex items-end gap-1">
                    <span className="font-display text-4xl font-bold">{score.runs}</span>
                    <span className="font-display text-2xl text-zinc-400 mb-0.5">/{score.wickets}</span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    ({formatOvers(score.legal_balls)} ov) • CRR: {computeCRR(score).toFixed(2)}
                  </p>
                </div>
                <div className="text-right text-xs text-zinc-500 space-y-1">
                  <p>4s: <span className="text-blue-400 font-semibold">{score.fours}</span></p>
                  <p>6s: <span className="text-pitch-400 font-semibold">{score.sixes}</span></p>
                  <p>Extras: {score.extras}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* MVP */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-4 rounded-2xl bg-gradient-to-br from-yellow-900/40 to-yellow-800/10 border border-yellow-700/30"
        >
          <p className="text-xs text-yellow-500 font-semibold uppercase tracking-wider mb-2">
            🌟 Player of the Match
          </p>
          <div className="flex items-center gap-3">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center font-display font-bold text-xl text-white"
              style={{ background: `hsl(${(mvpPlayer.name.charCodeAt(0) * 37) % 360}, 60%, 40%)` }}
            >
              {mvpPlayer.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="font-display font-bold text-xl">{mvpPlayer.name}</p>
              <p className="text-xs text-zinc-400">MVP Score: {maxMvpScore.toFixed(1)}</p>
            </div>
          </div>
        </motion.div>

        {/* Over chart */}
        {overChartData.length > 0 && (
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <h3 className="font-display font-semibold mb-4 text-zinc-200">Run Rate by Over</h3>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={overChartData}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                <XAxis dataKey="over" tick={{ fontSize: 10, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
                <Tooltip
                  contentStyle={{ background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
                  labelStyle={{ color: '#fff' }}
                />
                <Line type="monotone" dataKey="inn1" stroke="#22c55e" strokeWidth={2} dot={false} name="Inn 1" />
                {inn2 && <Line type="monotone" dataKey="inn2" stroke="#3b82f6" strokeWidth={2} dot={false} name="Inn 2" />}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top scorers chart */}
        {battingData.length > 0 && (
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <h3 className="font-display font-semibold mb-4 text-zinc-200">Top Scorers</h3>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={battingData} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10, fill: '#6b7280' }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#9ca3af' }} width={60} />
                <Tooltip
                  contentStyle={{ background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
                />
                <Bar dataKey="runs" fill="#22c55e" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={clearMatch}
              className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-display font-semibold flex items-center justify-center gap-2"
            >
              <Home size={18} />
              Home
            </motion.button>
          </Link>
          <Link href="/teams/generator">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={clearMatch}
              className="w-full py-4 rounded-2xl bg-pitch-600 text-white font-display font-semibold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.3)]"
            >
              <RotateCcw size={18} />
              New Match
            </motion.button>
          </Link>
        </div>
      </div>
    </div>
  )
}
