import { useState, useEffect } from 'react'
import { getMatches } from '../lib/supabase.js'
import { calcInningsScore, BALL_TYPES } from '../lib/cricket.js'

function buildStatsFromMatches(matches) {
  const stats = {}

  const ensure = (name, team) => {
    const key = `${name}__${team}`
    if (!stats[key]) stats[key] = { name, team, runs: 0, balls: 0, fours: 0, sixes: 0, innings: 0, wickets: 0, matches: 0 }
    return stats[key]
  }

  for (const m of matches) {
    const { team_a, team_b, innings1_balls = [], innings2_balls = [] } = m

    const processInnings = (balls, battingTeam) => {
      for (const b of balls) {
        if (!b.batsmanName) continue
        const s = ensure(b.batsmanName, battingTeam)
        s.balls++
        s.runs += b.runs || 0
        if (b.type === BALL_TYPES.FOUR) s.fours++
        if (b.type === BALL_TYPES.SIX) s.sixes++
        if (b.type === BALL_TYPES.WICKET) s.innings++
      }
    }

    processInnings(innings1_balls, team_a)
    processInnings(innings2_balls, team_b)
  }

  return Object.values(stats).sort((a, b) => b.runs - a.runs)
}

export default function Stats() {
  const [statsData, setStatsData] = useState([])
  const [loading, setLoading]   = useState(true)
  const [view, setView]         = useState('batting') // batting | bowling

  useEffect(() => {
    getMatches().then(({ data }) => {
      const s = buildStatsFromMatches(data || [])
      setStatsData(s)
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div className="page" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--text-dim)', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
        Loading stats...
      </div>
    </div>
  )

  const col = (label, val, color = 'var(--text)') => ({ label, val, color })

  return (
    <div className="page" style={{ overflowY: 'auto' }}>
      <div className="topbar">
        <span className="topbar-title">PLAYER STATS</span>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
        {['batting', 'bowling'].map(v => (
          <button key={v} onClick={() => setView(v)} style={{
            flex: 1, padding: '10px 0', background: 'none', border: 'none',
            borderBottom: view === v ? '2px solid var(--green)' : '2px solid transparent',
            color: view === v ? 'var(--green-lt)' : 'var(--text-dim)',
            fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600,
            letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer',
          }}>{v}</button>
        ))}
      </div>

      <div style={{ padding: 16 }}>
        {statsData.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📊</div>
            <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>
              No stats available yet.<br />Stats build up as you play matches with named players.
            </div>
          </div>
        )}

        {statsData.length > 0 && (
          <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: 1, flex: 2 }}>PLAYER</span>
              {view === 'batting'
                ? <>
                    <span style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: 1, width: 40, textAlign: 'right' }}>RUNS</span>
                    <span style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: 1, width: 40, textAlign: 'right' }}>SR</span>
                    <span style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: 1, width: 30, textAlign: 'right' }}>4s</span>
                    <span style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: 1, width: 30, textAlign: 'right' }}>6s</span>
                  </>
                : <>
                    <span style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: 1, width: 40, textAlign: 'right' }}>WKT</span>
                    <span style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: 1, width: 50, textAlign: 'right' }}>RUNS</span>
                  </>
              }
            </div>

            {statsData.map((p, i) => {
              const sr = p.balls > 0 ? ((p.runs / p.balls) * 100).toFixed(0) : 0
              return (
                <div key={`${p.name}${p.team}`} className="card fade-in" style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', marginBottom: 8 }}>
                  <div style={{ flex: 2 }}>
                    <div style={{ fontSize: 14, color: i < 3 ? 'var(--accent)' : 'var(--text)', fontWeight: 500 }}>
                      {i === 0 ? '🥇 ' : i === 1 ? '🥈 ' : i === 2 ? '🥉 ' : ''}{p.name}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>{p.team}</div>
                  </div>
                  {view === 'batting'
                    ? <>
                        <div style={{ width: 40, textAlign: 'right', fontFamily: 'var(--font-disp)', fontSize: 18, color: 'var(--accent)' }}>{p.runs}</div>
                        <div style={{ width: 40, textAlign: 'right', fontSize: 12, color: 'var(--green)' }}>{sr}</div>
                        <div style={{ width: 30, textAlign: 'right', fontSize: 12, color: 'var(--four)' }}>{p.fours}</div>
                        <div style={{ width: 30, textAlign: 'right', fontSize: 12, color: 'var(--six)' }}>{p.sixes}</div>
                      </>
                    : <>
                        <div style={{ width: 40, textAlign: 'right', fontFamily: 'var(--font-disp)', fontSize: 18, color: 'var(--wicket)' }}>{p.wickets}</div>
                        <div style={{ width: 50, textAlign: 'right', fontSize: 12, color: 'var(--text-dim)' }}>{p.runs} given</div>
                      </>
                  }
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
