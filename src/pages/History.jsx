import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMatches, deleteMatch } from '../lib/supabase.js'
import { calcInningsScore } from '../lib/cricket.js'
import { saveToLocalStorage } from '../lib/matchStorage.js'

export default function History() {
  const navigate = useNavigate()
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    getMatches().then(({ data }) => {
      setMatches(data || [])
      setLoading(false)
    })
  }, [])

  const handleResumeMatch = (match) => {
    if (match.result !== 'in-progress') {
      alert('Only in-progress matches can be resumed')
      return
    }

    // Reconstruct the match state from Supabase data
    const setup = {
      teamA: match.team_a,
      teamB: match.team_b,
      overs: match.overs,
      // Can't easily reconstruct players from Supabase data
      playersA: [],
      playersB: [],
      batting: match.batting_team || match.team_a,
      bowling: match.bowling_team || match.team_b,
      startedAt: new Date(match.played_at).getTime(),
    }

    const state = {
      innings: match.innings_number || (match.innings2_balls?.length > 0 ? 2 : 1),
      inn1Balls: match.innings1_balls || [],
      inn2Balls: match.innings2_balls || [],
      inn1Score: match.innings1_runs ? { runs: match.innings1_runs, wickets: match.innings1_wickets } : null,
      batsmen: { striker: match.striker || '', nonStriker: match.non_striker || '' },
      bowler: match.bowler || '',
      done: match.result !== 'in-progress',
      result: match.result || '',
    }

    // Save to sessionStorage for navigation
    sessionStorage.setItem('matchSetup', JSON.stringify(setup))
    sessionStorage.setItem('matchState', JSON.stringify(state))
    
    // Save to localStorage
    saveToLocalStorage(state, setup)

    // Navigate to match
    navigate('/match')
  }

  const handleDeleteMatch = async (match, e) => {
    e.stopPropagation()
    if (!window.confirm(`Delete match: ${match.team_a} vs ${match.team_b}?`)) {
      return
    }
    try {
      const result = await deleteMatch(match.game_session_id)
      if (result.error) {
        alert(`Delete failed: ${result.error}. Make sure RLS delete policy is set in Supabase.`)
        return
      }
      // Remove from UI
      setMatches(matches.filter(m => m.id !== match.id))
      alert('Match deleted successfully')
    } catch (err) {
      console.error('Delete error:', err)
      alert(`Delete error: ${err.message}`)
    }
  }

  if (loading) return (
    <div className="page" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--text-dim)', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
        Loading matches...
      </div>
    </div>
  )

  const inProgress = matches.filter(m => m.result === 'in-progress')
  const completed = matches.filter(m => m.result !== 'in-progress')

  return (
    <div className="page" style={{ overflowY: 'auto' }}>
      <div className="topbar">
        <span className="topbar-title">📋 HISTORY</span>
        <span style={{ fontSize: 11, color: 'var(--green-lt)' }}>{matches.length} total</span>
      </div>

      <div style={{ padding: 16 }}>
        {/* In-progress matches */}
        {inProgress.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, color: 'var(--gold)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12, fontWeight: 600 }}>
              ⚡ In Progress ({inProgress.length})
            </div>
            {inProgress.map(m => {
              const isOpen = expanded === m.id
              const s1 = m.innings1_balls ? calcInningsScore(m.innings1_balls) : { runs: m.innings1_runs || 0, wickets: m.innings1_wickets || 0 }
              const s2 = m.innings2_balls ? calcInningsScore(m.innings2_balls) : { runs: m.innings2_runs || 0, wickets: m.innings2_wickets || 0 }

              return (
                <div key={m.id} className="card fade-in" style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'var(--font-disp)', fontSize: 16, color: 'var(--green-lt)', letterSpacing: 2 }}>
                        {m.team_a} vs {m.team_b}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                        {m.overs} ov · Ball {(m.innings1_balls?.length || 0) + (m.innings2_balls?.length || 0)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn-primary" style={{ padding: '8px 12px', fontSize: 11, marginBottom: 0, width: 'auto', minWidth: 80 }}
                        onClick={() => handleResumeMatch(m)}>
                        ▶ RESUME
                      </button>
                      <button style={{ padding: '8px 12px', fontSize: 11, marginBottom: 0, width: 'auto', borderRadius: 'var(--r)', border: '2px solid var(--wicket)', background: 'rgba(229, 62, 62, 0.1)', color: 'var(--wicket)', cursor: 'pointer', fontWeight: 600 }}
                        onClick={(e) => handleDeleteMatch(m, e)}>
                        🗑 DELETE
                      </button>
                    </div>
                  </div>

                  {/* Score preview */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, fontSize: 11 }}>
                    <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: 10, borderRadius: 'var(--r)', borderLeft: '3px solid var(--green)' }}>
                      <div style={{ color: 'var(--text-dim)', fontSize: 9, marginBottom: 4 }}>Inn 1</div>
                      <div style={{ fontFamily: 'var(--font-disp)', fontSize: 18, color: 'var(--green-lt)', fontWeight: 700 }}>
                        {s1.runs}/{s1.wickets}
                      </div>
                    </div>
                    <div style={{ background: 'rgba(132, 204, 22, 0.1)', padding: 10, borderRadius: 'var(--r)', borderLeft: '3px solid var(--green-lt)' }}>
                      <div style={{ color: 'var(--text-dim)', fontSize: 9, marginBottom: 4 }}>Inn 2</div>
                      <div style={{ fontFamily: 'var(--font-disp)', fontSize: 18, color: 'var(--accent)', fontWeight: 700 }}>
                        {s2.runs}/{s2.wickets}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Completed matches */}
        {completed.length > 0 && (
          <div>
            <div style={{ fontSize: 12, color: 'var(--green-lt)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12, fontWeight: 600 }}>
              ✓ Completed ({completed.length})
            </div>
            {completed.map(m => {
              const isOpen = expanded === m.id
              const s1 = m.innings1_balls ? calcInningsScore(m.innings1_balls) : { runs: m.innings1_runs, wickets: m.innings1_wickets }
              const s2 = m.innings2_balls ? calcInningsScore(m.innings2_balls) : { runs: m.innings2_runs, wickets: m.innings2_wickets }
              const date = new Date(m.played_at || m.created_at)

              return (
                <div key={m.id} className="card fade-in" style={{ cursor: 'pointer', marginBottom: 12 }}
                  onClick={() => setExpanded(isOpen ? null : m.id)}>
                  {/* Summary row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'var(--font-disp)', fontSize: 16, color: 'var(--accent)', letterSpacing: 1 }}>
                        {m.team_a} vs {m.team_b}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                        {m.overs} ov · {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                      <div style={{ fontSize: 11, color: 'var(--green-lt)', maxWidth: 140, fontWeight: 600 }}>
                        {m.result?.substring(0, 40)}...
                      </div>
                      <button style={{ padding: '6px 10px', fontSize: 10, marginBottom: 0, borderRadius: 'var(--r)', border: '2px solid var(--wicket)', background: 'rgba(229, 62, 62, 0.1)', color: 'var(--wicket)', cursor: 'pointer', fontWeight: 600 }}
                        onClick={(e) => handleDeleteMatch(m, e)}>
                        🗑 DELETE
                      </button>
                    </div>
                  </div>

                  {/* Expanded scorecard */}
                  {isOpen && (
                    <div className="fade-in" style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                      {[
                        { label: `🏏 ${m.team_a}`, s: s1 },
                        { label: `⚡ ${m.team_b}`, s: s2 },
                      ].map(({ label, s }) => (
                        <div key={label} style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 10, color: 'var(--green)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                          <div style={{ fontFamily: 'var(--font-disp)', fontSize: 28, color: 'var(--accent)' }}>
                            {s.runs}/{s.wickets}
                          </div>
                          {s.fullOvers !== undefined && (
                            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                              {s.fullOvers}.{s.remBalls} ov · {s.fours}×4 · {s.sixes}×6
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {matches.length === 0 && (
          <div className="achievement" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '2px solid var(--green)' }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>📋</div>
            <div style={{ color: 'var(--green-lt)', fontWeight: 600, marginBottom: 4 }}>No matches yet</div>
            <div style={{ fontSize: 12, color: 'var(--text-mid)' }}>Play a match to see it here!</div>
          </div>
        )}
      </div>
    </div>
  )
}
