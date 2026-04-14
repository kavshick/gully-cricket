import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { saveToLocalStorage, clearMatchStorage, clearGameSessionId } from '../lib/matchStorage.js'

const OVER_OPTIONS = [2, 3, 4, 5, 6, 8, 10, 15, 20]

export default function Setup() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0) // 0=teams 1=players 2=toss 3=players-select
  const [teamA, setTeamA] = useState('')
  const [teamB, setTeamB] = useState('')
  const [overs, setOvers] = useState(5)
  const [playersA, setPlayersA] = useState(['', '', '', '', ''])
  const [playersB, setPlayersB] = useState(['', '', '', '', ''])
  const [tossWinner, setTossWinner] = useState('')
  const [tossChoice, setTossChoice] = useState('bat')
  const [striker, setStriker] = useState('')
  const [nonStriker, setNonStriker] = useState('')
  const [bowler, setBowler] = useState('')

  const updatePlayer = (team, idx, val) => {
    if (team === 'A') setPlayersA(p => p.map((v, i) => i === idx ? val : v))
    else setPlayersB(p => p.map((v, i) => i === idx ? val : v))
  }

  const addPlayer = (team) => {
    if (team === 'A') setPlayersA(p => [...p, ''])
    else setPlayersB(p => [...p, ''])
  }

  const startMatch = () => {
    const batting = tossChoice === 'bat' ? tossWinner : (tossWinner === teamA ? teamB : teamA)
    const bowling = batting === teamA ? teamB : teamA

    const matchSetup = {
      teamA: teamA.trim() || 'Team A',
      teamB: teamB.trim() || 'Team B',
      overs,
      playersA: playersA.filter(Boolean),
      playersB: playersB.filter(Boolean),
      batting,
      bowling,
      startedAt: Date.now(),
    }

    // Save to both sessionStorage (for navigation) and localStorage (for refresh survival)
    sessionStorage.setItem('matchSetup', JSON.stringify(matchSetup))
    clearMatchStorage() // Clear old match state before starting new match
    clearGameSessionId() // Generate new session ID for this match
    sessionStorage.removeItem('matchState')
    
    // Initialize match state with selected players
    const initialState = {
      innings: 1,
      inn1Balls: [],
      inn2Balls: [],
      inn1Score: null,
      batsmen: { striker, nonStriker },
      bowler,
      done: false,
      result: '',
      outBatsmen: [],
      retiredBatsmen: [],
    }
    sessionStorage.setItem('matchState', JSON.stringify(initialState))
    
    navigate('/match')
  }

  const canProceed0 = teamA.trim().length > 0 && teamB.trim().length > 0
  const canProceed2 = tossWinner !== ''
  const canProceed3 = striker && nonStriker && bowler

  return (
    <div className="page fade-in" style={{ overflowY: 'auto' }}>
      <div className="topbar">
        <span className="topbar-title">NEW MATCH</span>
        <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Step {step + 1}/4</span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: 'var(--border)', margin: '0' }}>
        <div style={{ height: '100%', background: 'var(--green)', width: `${((step + 1) / 4) * 100}%`, transition: 'width 0.3s' }} />
      </div>

      <div style={{ padding: 16, flex: 1 }}>

        {/* ── Step 0: Teams & Overs ── */}
        {step === 0 && (
          <div className="fade-in">
            <div className="card">
              <span className="label">🏏 Team A</span>
              <input placeholder="Enter team name" value={teamA} onChange={e => setTeamA(e.target.value)} />
            </div>
            <div className="card">
              <span className="label">⚡ Team B</span>
              <input placeholder="Enter team name" value={teamB} onChange={e => setTeamB(e.target.value)} />
            </div>
            <div className="card">
              <span className="label">⏱ Overs per side</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                {OVER_OPTIONS.map(o => (
                  <button
                    key={o}
                    onClick={() => setOvers(o)}
                    style={{
                      padding: '10px 16px',
                      borderRadius: 'var(--r)',
                      border: `2px solid ${overs === o ? 'var(--green-lt)' : 'var(--border2)'}`,
                      background: overs === o 
                        ? 'linear-gradient(135deg, var(--green-dim), var(--green-dim))' 
                        : 'var(--bg3)',
                      color: overs === o ? 'var(--green-lt)' : 'var(--text-mid)',
                      fontSize: 13, 
                      fontFamily: 'var(--font-disp)',
                      fontWeight: 700,
                      letterSpacing: 1,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: overs === o ? '0 0 20px rgba(132, 204, 22, 0.3)' : 'none',
                    }}
                  >{o}</button>
                ))}
              </div>
            </div>

            <div className="card" style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
              <span className="label">📜 Gully Rules Active</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--text-mid)' }}>
                <span>🏠 Roof catch (1 hand) → OUT</span>
                <span>🎯 Direct straight → SIX</span>
                <span>↩️ Indirect / wall → FOUR</span>
                <span>🧤 Edge behind stumps (no bounce, in wide) → OUT</span>
                <span>❌ No LBW</span>
              </div>
            </div>

            <button className="btn-primary" disabled={!canProceed0} onClick={() => setStep(1)}>
              NEXT → PLAYERS
            </button>
          </div>
        )}

        {/* ── Step 1: Players ── */}
        {step === 1 && (
          <div className="fade-in">
            <div className="card">
              <span className="label">🏏 {teamA || 'Team A'} Players</span>
              {playersA.map((p, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <input
                    placeholder={`Player ${i + 1}`}
                    value={p}
                    onChange={e => updatePlayer('A', i, e.target.value)}
                  />
                </div>
              ))}
              {playersA.length < 11 && (
                <button className="btn-ghost" style={{ marginTop: 4, width: '100%', textAlign: 'center' }} onClick={() => addPlayer('A')}>
                  + Add Player
                </button>
              )}
            </div>

            <div className="card">
              <span className="label">⚡ {teamB || 'Team B'} Players</span>
              {playersB.map((p, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <input
                    placeholder={`Player ${i + 1}`}
                    value={p}
                    onChange={e => updatePlayer('B', i, e.target.value)}
                  />
                </div>
              ))}
              {playersB.length < 11 && (
                <button className="btn-ghost" style={{ marginTop: 4, width: '100%', textAlign: 'center' }} onClick={() => addPlayer('B')}>
                  + Add Player
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setStep(0)}>← Back</button>
              <button className="btn-primary" style={{ flex: 2 }} onClick={() => setStep(2)}>NEXT → TOSS</button>
            </div>
          </div>
        )}

        {/* ── Step 2: Toss ── */}
        {step === 2 && (
          <div className="fade-in">
            <div className="card" style={{ textAlign: 'center', padding: 24 }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>🪙</div>
              <span className="label" style={{ justifyContent: 'center', display: 'block' }}>Toss Winner</span>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                {[teamA || 'Team A', teamB || 'Team B'].map(t => (
                  <button
                    key={t}
                    onClick={() => setTossWinner(t)}
                    style={{
                      flex: 1, padding: '12px 0', borderRadius: 10,
                      border: `2px solid ${tossWinner === t ? 'var(--green)' : 'var(--border2)'}`,
                      background: tossWinner === t ? 'var(--green-dim)' : 'var(--bg3)',
                      color: tossWinner === t ? 'var(--accent)' : 'var(--text-dim)',
                      fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 600,
                    }}
                  >{t}</button>
                ))}
              </div>
            </div>

            {tossWinner && (
              <div className="card fade-in">
                <span className="label">{tossWinner} chose to...</span>
                <div style={{ display: 'flex', gap: 10 }}>
                  {['bat', 'bowl'].map(c => (
                    <button
                      key={c}
                      onClick={() => setTossChoice(c)}
                      style={{
                        flex: 1, padding: '14px 0', borderRadius: 10,
                        border: `2px solid ${tossChoice === c ? 'var(--six)' : 'var(--border2)'}`,
                        background: tossChoice === c ? '#3a2e00' : 'var(--bg3)',
                        color: tossChoice === c ? 'var(--six)' : 'var(--text-dim)',
                        fontSize: 15, fontFamily: 'var(--font-mono)', fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: 2,
                      }}
                    >{c === 'bat' ? '🏏 BAT' : '⚡ BOWL'}</button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setStep(1)}>← Back</button>
              <button
                className="btn-primary"
                style={{ flex: 2 }}
                disabled={!canProceed2}
                onClick={() => setStep(3)}
              >
                NEXT → PLAYERS
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Select Striker, Non-striker, Bowler ── */}
        {step === 3 && (
          <div className="fade-in">
            <div className="card">
              <span className="label">🏏 STRIKER (Batting Team)</span>
              <select
                value={striker}
                onChange={e => setStriker(e.target.value)}
                style={{
                  width: '100%', padding: '12px', borderRadius: 'var(--r)',
                  border: `2px solid ${striker ? 'var(--accent)' : 'var(--border2)'}`,
                  background: striker ? 'rgba(132, 204, 22, 0.1)' : 'var(--bg3)',
                  color: striker ? 'var(--accent)' : 'var(--text-mid)',
                  fontSize: 14, fontFamily: 'var(--font-mono)', cursor: 'pointer',
                }}
              >
                <option value="">-- Select Striker --</option>
                {(
                  (tossChoice === 'bat' ? tossWinner : (tossWinner === teamA ? teamB : teamA)) === teamA
                    ? playersA.filter(Boolean)
                    : playersB.filter(Boolean)
                ).map(p => (
                  <option key={p} value={p}>★ {p}</option>
                ))}
              </select>
            </div>

            <div className="card">
              <span className="label">↻ NON-STRIKER (Batting Team)</span>
              <select
                value={nonStriker}
                onChange={e => setNonStriker(e.target.value)}
                style={{
                  width: '100%', padding: '12px', borderRadius: 'var(--r)',
                  border: `2px solid ${nonStriker ? 'var(--green-lt)' : 'var(--border2)'}`,
                  background: nonStriker ? 'rgba(34, 197, 94, 0.1)' : 'var(--bg3)',
                  color: nonStriker ? 'var(--green-lt)' : 'var(--text-mid)',
                  fontSize: 14, fontFamily: 'var(--font-mono)', cursor: 'pointer',
                }}
              >
                <option value="">-- Select Non-Striker --</option>
                {(
                  (tossChoice === 'bat' ? tossWinner : (tossWinner === teamA ? teamB : teamA)) === teamA
                    ? playersA.filter(p => p !== striker && Boolean(p))
                    : playersB.filter(p => p !== striker && Boolean(p))
                ).map(p => (
                  <option key={p} value={p}>↻ {p}</option>
                ))}
              </select>
            </div>

            <div className="card">
              <span className="label">⚡ BOWLER (Bowling Team)</span>
              <select
                value={bowler}
                onChange={e => setBowler(e.target.value)}
                style={{
                  width: '100%', padding: '12px', borderRadius: 'var(--r)',
                  border: `2px solid ${bowler ? 'var(--green)' : 'var(--border2)'}`,
                  background: bowler ? 'rgba(34, 197, 94, 0.15)' : 'var(--bg3)',
                  color: bowler ? 'var(--green)' : 'var(--text-mid)',
                  fontSize: 14, fontFamily: 'var(--font-mono)', cursor: 'pointer',
                }}
              >
                <option value="">-- Select Bowler --</option>
                {(
                  (tossChoice === 'bat' ? tossWinner : (tossWinner === teamA ? teamB : teamA)) === teamA
                    ? playersB.filter(Boolean)
                    : playersA.filter(Boolean)
                ).map(p => (
                  <option key={p} value={p}>⚡ {p}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setStep(2)}>← Back</button>
              <button
                className="btn-primary"
                style={{ flex: 2 }}
                disabled={!canProceed3}
                onClick={startMatch}
              >
                🏏 START MATCH
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
