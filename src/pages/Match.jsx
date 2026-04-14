import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  OUTCOMES, WICKET_TYPES, calcInningsScore, groupByOvers,
  isInningsComplete, calcRequiredRR, calcCRR, ballDisplay, buildMatchRecord
} from '../lib/cricket.js'
import { saveMatch, upsertPlayerStats } from '../lib/supabase.js'
import { saveToLocalStorage, loadFromLocalStorage, clearMatchStorage, validateLocalState, generateBallsChecksum, validateCloudSync, getOrCreateGameSessionId } from '../lib/matchStorage.js'

const TABS = ['Score', 'Overs', 'Batting']

export default function Match() {
  const navigate = useNavigate()

  // Load from sessionStorage first (for when navigating from Setup), fallback to localStorage (page refresh)
  const sessionSetup = JSON.parse(sessionStorage.getItem('matchSetup') || 'null')
  const sessionState = JSON.parse(sessionStorage.getItem('matchState') || 'null')
  const { state: storageState, setup: storageSetup } = loadFromLocalStorage()
  
  const setup = sessionSetup || storageSetup
  const savedState = sessionState || storageState

  const initState = savedState || {
    innings: 1,
    inn1Balls: [],
    inn2Balls: [],
    inn1Score: null,
    batsmen: { striker: setup?.playersA?.[0] || '', nonStriker: setup?.playersA?.[1] || '' },
    bowler: setup?.playersB?.[0] || '',
    done: false,
    result: '',
    outBatsmen: [], // Names of batsmen who were OUT (wicket)
    retiredBatsmen: [], // Names of batsmen voluntarily retired (can play again)
  }

  const [state, setState] = useState(initState)
  const [tab, setTab] = useState(0)
  const [showWicketOutModal, setShowWicketOutModal] = useState(false) // Ask WHO is out first
  const [wicketGetter, setWicketGetter] = useState('') // 'striker' or 'nonStriker'
  const [showWicketModal, setShowWicketModal] = useState(false) // Then ask HOW
  const [wicketType, setWicketType] = useState('')
  const [showPlayerModal, setShowPlayerModal] = useState(false) // 'striker'|'nonStriker'|'bowler'|'nextBatsman'|null
  const [playerInput, setPlayerInput] = useState('')
  const [pendingNextBatsmen, setPendingNextBatsmen] = useState('striker') // 'striker'|'nonStriker'
  const [showBowlerModal, setShowBowlerModal] = useState(false)
  const [pendingBowlerModal, setPendingBowlerModal] = useState(false) // Show bowler modal after next batsman selection
  const [bounceMode, setBounceMode] = useState(false) // Bounce modifier mode for adding runs to bounce
  const [validationStatus, setValidationStatus] = useState({ valid: true, message: '', checksum: '' })
  
  // Track refs for optimization
  const supabaseSaveTimerRef = useRef(null)
  const cloudRecordRef = useRef(null)
  const prevValidationRef = useRef(null)

  const { innings, inn1Balls, inn2Balls, batsmen, bowler, done, result } = state
  const balls = innings === 1 ? inn1Balls : inn2Balls
  const setBalls = (newBalls) => {
    setState(s => ({
      ...s,
      [innings === 1 ? 'inn1Balls' : 'inn2Balls']: newBalls
    }))
  }

  const score = calcInningsScore(balls)
  const crr = calcCRR(balls)
  const target = state.inn1Score ? state.inn1Score.runs + 1 : null
  const rrr = innings === 2 && target ? calcRequiredRR(target, balls, setup?.overs || 5) : null

  // ── Effect 1: Save to localStorage (minimal deps) ──
  useEffect(() => {
    saveToLocalStorage(state, setup)
  }, [state, setup])

  // ── Effect 2: Validate local state (runs when balls change) ──
  useEffect(() => {
    const localValidation = validateLocalState(state)
    let newStatus = prevValidationRef.current
    
    if (!localValidation.valid) {
      newStatus = {
        valid: false,
        message: `Data integrity issue: ${localValidation.errors[0]}`,
        checksum: generateBallsChecksum([...inn1Balls, ...inn2Balls]),
      }
      console.error('❌ Local state validation FAILED:', localValidation.errors)
    } else {
      const checksum = generateBallsChecksum(inn1Balls) + '|' + generateBallsChecksum(inn2Balls)
      newStatus = {
        valid: true,
        message: `Local: ${inn1Balls.length + inn2Balls.length} balls`,
        checksum,
      }
      console.log(`✅ Local state valid | Balls: ${inn1Balls.length}+${inn2Balls.length} | Checksum: ${checksum}`)
    }

    // Only update if validation result changed
    if (JSON.stringify(newStatus) !== JSON.stringify(prevValidationRef.current)) {
      setValidationStatus(newStatus)
      prevValidationRef.current = newStatus
    }
  }, [inn1Balls, inn2Balls, state])

  // ── Effect 3: Debounced Supabase cloud backup ──
  useEffect(() => {
    clearTimeout(supabaseSaveTimerRef.current)
    supabaseSaveTimerRef.current = setTimeout(() => {
      if (setup && !done) {
        const gameSessionId = getOrCreateGameSessionId()
        const rec = buildMatchRecord(
          setup,
          { balls: inn1Balls },
          { balls: inn2Balls },
          'in-progress',
          gameSessionId,
          {
            innings,
            battingTeam: innings === 1 ? setup.batting : setup.bowling,
            bowlingTeam: innings === 1 ? setup.bowling : setup.batting,
            striker: batsmen.striker,
            nonStriker: batsmen.nonStriker,
            bowler,
          }
        )
        
        cloudRecordRef.current = rec
        
        saveMatch(rec)
          .then(() => {
            const syncValidation = validateCloudSync(state, rec)
            if (!syncValidation.synced) {
              console.warn('⚠️ Cloud sync issues detected:', syncValidation.issues)
              console.warn('Local checksum:', syncValidation.localChecksum)
              console.warn('Cloud checksum:', syncValidation.cloudChecksum)
            } else {
              console.log('✅ Cloud sync validated | Checksums match')
            }
          })
          .catch(err => {
            console.warn('❌ Supabase backup save failed:', err)
          })
      }
    }, 2000)

    return () => clearTimeout(supabaseSaveTimerRef.current)
  }, [state, setup, done, inn1Balls, inn2Balls])

  if (!setup) {
    return (
      <div className="page" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ padding: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏏</div>
          <div style={{ color: 'var(--text-dim)', marginBottom: 24 }}>No match in progress</div>
          <button className="btn-primary" onClick={() => navigate('/')}>Setup New Match</button>
        </div>
      </div>
    )
  }

  const battingTeam = innings === 1 ? setup.batting : setup.bowling
  const bowlingTeam = innings === 1 ? setup.bowling : setup.batting
  let battingPlayers = battingTeam === setup.teamA ? setup.playersA : setup.playersB
  let bowlingPlayers = bowlingTeam === setup.teamA ? setup.playersA : setup.playersB

  // If resuming from history, reconstruct player lists from balls
  if (!bowlingPlayers?.length && balls.length > 0) {
    const uniqueBowlers = [...new Set(balls.map(b => b.bowler).filter(Boolean))]
    bowlingPlayers = uniqueBowlers
  }
  if (!battingPlayers?.length && balls.length > 0) {
    const battingSet = new Set()
    balls.forEach(b => {
      if (b.striker) battingSet.add(b.striker)
      if (b.nonStriker) battingSet.add(b.nonStriker)
    })
    battingPlayers = [...battingSet]
  }

  // ── Helper: Extract current over balls ────────────────────────
  const getCurrentOverBalls = (ballsList) => {
    // Legal balls count: normal deliveries + bounces, exclude only wide/no-ball
    const legalCount = ballsList.filter(b => b.type !== 'wide' && b.type !== 'no_ball').length
    const fullOvers = Math.floor(legalCount / 6)
    let overBalls = []
    let legal = 0
    for (let i = ballsList.length - 1; i >= 0; i--) {
      const b = ballsList[i]
      if (b.type !== 'wide' && b.type !== 'no_ball') legal++
      if (Math.floor((legalCount - legal) / 6) === fullOvers) {
        overBalls.unshift(b)
      } else break
    }
    return overBalls
  }

  // ── Ball commit ────────────────────────────────────────────
  const commitBall = useCallback((ball) => {
    let finalBall = { ...ball }
    
    // Handle bounce: if this is 2nd bounce in over, convert to wide but preserve runs
    if (ball.type === 'bounce') {
      const newBallsList = [...balls, { ...ball, bowler, striker: batsmen.striker, nonStriker: batsmen.nonStriker }]
      const currentOver = getCurrentOverBalls(newBallsList)
      const bounceCount = currentOver.filter(b => b.type === 'bounce').length
      if (bounceCount > 1) {
        // Second+ bounce: convert to wide but keep the runs from this bounce
        finalBall = { type: 'wide', runs: ball.runs || 1, isSecondBounce: true }
      } else {
        // First bounce: keep type as bounce, preserve runs from ball
        finalBall = { type: 'bounce', runs: ball.runs || 0 }
      }
    }
    
    // Add player tracking to each ball
    const ballWithPlayers = {
      ...finalBall,
      bowler,
      striker: batsmen.striker,
      nonStriker: batsmen.nonStriker
    }
    const newBalls = [...balls, ballWithPlayers]
    const complete = isInningsComplete(newBalls, setup.overs)

    if (complete && innings === 1) {
      const s1 = calcInningsScore(newBalls)
      setState(s => ({
        ...s,
        inn1Balls: newBalls,
        inn1Score: s1,
        innings: 2,
        batsmen: { striker: setup.playersB?.[0] || '', nonStriker: setup.playersB?.[1] || '' },
        bowler: setup.playersA?.[0] || '',
      }))
    } else if (complete && innings === 2) {
      const s1 = state.inn1Score
      const s2 = calcInningsScore(newBalls)
      let res = ''
      if (s2.runs > s1.runs) res = `${bowlingTeam} won by ${10 - s2.wickets} wickets 🏆`
      else if (s1.runs > s2.runs) res = `${battingTeam === setup.batting ? setup.bowling : setup.batting} won by ${s1.runs - s2.runs} runs 🏆`
      else res = 'Match Tied! 🤝'

      setState(s => ({ ...s, inn2Balls: newBalls, done: true, result: res }))

      // Save to Supabase
      const gameSessionId = getOrCreateGameSessionId()
      const rec = buildMatchRecord(setup, { balls: inn1Balls }, { balls: newBalls }, res, gameSessionId, {
        innings: 2,
        battingTeam: innings === 1 ? setup.bowling : setup.batting,
        bowlingTeam: innings === 1 ? setup.batting : setup.bowling,
        striker: batsmen.striker,
        nonStriker: batsmen.nonStriker,
        bowler,
      })
      saveMatch(rec)
    } else {
      setBalls(newBalls)
      
      // Check if an over is complete: count legal balls (include 1st bounce, exclude wide/no-ball)
      const prevLegalBalls = balls.filter(b => b.type !== 'wide' && b.type !== 'no_ball')
      const currLegalBalls = newBalls.filter(b => b.type !== 'wide' && b.type !== 'no_ball')
      const isOverComplete = currLegalBalls.length > 0 && currLegalBalls.length % 6 === 0 && prevLegalBalls.length % 6 !== 0
      
      // If over is complete
      if (isOverComplete) {
        // Check if the completing ball is a wicket - if so, defer bowler modal until after next batsman
        if (ballWithPlayers.type === 'wicket') {
          setPendingBowlerModal(true) // Will be triggered after next batsman is selected
        } else {
          setTimeout(() => setShowBowlerModal(true), 500)
        }
      }
      
      // Rotate strike on odd runs (legal deliveries except wide/no-ball, but bounces CAN rotate)
      const isLegalDelivery = ballWithPlayers.type !== 'wide' && ballWithPlayers.type !== 'no_ball'
      if (isLegalDelivery && ballWithPlayers.runs % 2 === 1) {
        setState(s => ({ ...s, batsmen: { striker: s.batsmen.nonStriker, nonStriker: s.batsmen.striker } }))
      }
    }
  }, [balls, innings, setup, state, inn1Balls, battingTeam, bowlingTeam])

  const handleOutcome = (outcome) => {
    // In bounce mode: run buttons add runs to bounce
    if (bounceMode && outcome.id !== 'bounce' && outcome.id !== 'wicket') {
      // Commit bounce with these runs
      commitBall({ runs: outcome.runs, type: 'bounce' })
      setBounceMode(false)
      return
    }
    
    // Bounce button: toggle mode or commit clean bounce
    if (outcome.id === 'bounce') {
      if (bounceMode) {
        // Already in bounce mode, click B again = commit clean bounce (0 runs)
        commitBall({ runs: 0, type: 'bounce' })
        setBounceMode(false)
      } else {
        // Enter bounce mode
        setBounceMode(true)
      }
      return
    }
    
    // Wicket: 2-step flow (WHO → HOW)
    if (outcome.id === 'wicket') {
      setWicketType('')
      setWicketGetter('')
      setShowWicketOutModal(true) // First: ask WHO is out
      return
    }
    
    // Regular outcomes (dot, run, four, six, wide, noball)
    commitBall({ runs: outcome.runs, type: outcome.type })
  }

  const confirmWicketGetter = (role) => {
    setWicketGetter(role)
    setShowWicketOutModal(false)
    setShowWicketModal(true) // Then: ask HOW (wicket type)
  }

  const confirmWicket = () => {
    // Mark the selected batsman as out
    const outBatsman = wicketGetter === 'striker' ? state.batsmen.striker : state.batsmen.nonStriker
    setState(s => ({
      ...s,
      outBatsmen: [...(s.outBatsmen || []), outBatsman].filter(Boolean)
    }))
    commitBall({ runs: 0, type: 'wicket', wicketType })
    setShowWicketModal(false)
    // Show new batsman selector for the position that got out
    setPendingNextBatsmen(wicketGetter)
    setShowPlayerModal('nextBatsman')
    setPlayerInput('')
    setWicketGetter('')
  }

  const retireBatsman = (role) => {
    // Retire current batsman voluntarily (not a wicket, can play again)
    const retiredName = role === 'striker' ? state.batsmen.striker : state.batsmen.nonStriker
    if (!retiredName) return

    setState(s => ({
      ...s,
      retiredBatsmen: [...(s.retiredBatsmen || []), retiredName].filter(Boolean)
    }))
    setPendingNextBatsmen(role)
    setShowPlayerModal('nextBatsman')
    setPlayerInput('')
  }

  const confirmPlayer = (role) => {
    if (role === 'nextBatsman') {
      // Selecting next batsman after wicket or retirement
      setState(s => ({
        ...s,
        batsmen: pendingNextBatsmen === 'striker'
          ? { ...s.batsmen, striker: playerInput }
          : { ...s.batsmen, nonStriker: playerInput }
      }))
      setShowPlayerModal(false)
      setPlayerInput('')
      
      // If bowler modal is pending (wicket on last ball), show it now
      if (pendingBowlerModal) {
        setTimeout(() => {
          setShowBowlerModal(true)
          setPendingBowlerModal(false)
        }, 500)
      }
    } else {
      // Regular player selection (striker, nonStriker, bowler)
      setState(s => ({
        ...s,
        batsmen: role === 'striker'
          ? { ...s.batsmen, striker: playerInput }
          : role === 'nonStriker'
          ? { ...s.batsmen, nonStriker: playerInput }
          : s.batsmen,
        bowler: role === 'bowler' ? playerInput : s.bowler,
      }))
    }
    setShowPlayerModal(false)
    setPlayerInput('')
  }

  const confirmBowler = (newBowler) => {
    setState(s => ({ ...s, bowler: newBowler }))
    setShowBowlerModal(false)
  }

  const undoBall = () => {
    if (!balls.length) return
    setBalls(balls.slice(0, -1))
  }

  // ── Result screen ──────────────────────────────────────────
  if (done) {
    const s1 = calcInningsScore(inn1Balls)
    const s2 = calcInningsScore(inn2Balls)
    const winner = s2.runs > s1.runs ? bowlingTeam : (s1.runs > s2.runs ? (battingTeam === setup.batting ? setup.bowling : setup.batting) : 'tie')
    
    return (
      <div className="page fade-in" style={{ overflowY: 'auto' }}>
        <div className="topbar" style={{ justifyContent: 'center' }}>
          <span className="topbar-title" style={{ textAlign: 'center', flex: 1 }}>
            ⚡ MATCH OVER ⚡
          </span>
        </div>
        <div style={{ padding: 16, textAlign: 'center' }}>
          {/* Trophy celebration */}
          <div className="achievement" style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 64, animation: 'bounce 0.6s ease infinite' }}>🏆</div>
            <div style={{ fontFamily: 'var(--font-disp)', fontSize: 24, color: 'var(--gold)', letterSpacing: 2, marginBottom: 8 }}>
              {result}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-mid)', letterSpacing: 1 }}>
              {winner === 'tie' ? '🤝 DRAWN BATTLE' : `🎯 ${winner ? winner.toUpperCase() : ''} VICTORY`}
            </div>
          </div>

          {/* Innings scorecards */}
          <div className="stats-grid" style={{ marginBottom: 20 }}>
            {[
              { label: `1️⃣  ${setup.batting}`, sc: s1, balls: inn1Balls },
              { label: `2️⃣  ${setup.bowling}`, sc: s2, balls: inn2Balls },
            ].map(({ label, sc }) => (
              <div key={label} className="scorecard" style={{ gridColumn: 'span 1', textAlign: 'center', padding: 16 }}>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: 1, marginBottom: 8 }}>
                  {label}
                </div>
                <div style={{ fontFamily: 'var(--font-disp)', fontSize: 40, color: 'var(--green-lt)', lineHeight: 1, marginBottom: 6 }}>
                  {sc.runs}
                  <span style={{ fontSize: 20, color: 'var(--text-dim)' }}>/{sc.wickets}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-mid)', marginBottom: 12 }}>
                  {sc.fullOvers}.{sc.remBalls} ov
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', fontSize: 9, color: 'var(--text-mid)' }}>
                  <span>🔷 {sc.fours}</span>
                  <span>🟡 {sc.sixes}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Match summary */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="label" style={{ textAlign: 'center' }}>📊 MATCH STATS</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, fontSize: 12 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'var(--green-lt)', fontWeight: 700, fontSize: 16 }}>{Math.max(s1.runs, s2.runs)}</div>
                <div style={{ color: 'var(--text-dim)', fontSize: 10 }}>Highest Score</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'var(--gold)', fontWeight: 700, fontSize: 16 }}>{Math.max(s1.sixes, s2.sixes)}</div>
                <div style={{ color: 'var(--text-dim)', fontSize: 10 }}>Max Sixes</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'var(--four)', fontWeight: 700, fontSize: 16 }}>{s1.fours + s2.fours}</div>
                <div style={{ color: 'var(--text-dim)', fontSize: 10 }}>Total Fours</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'var(--wicket)', fontWeight: 700, fontSize: 16 }}>{s1.wickets + s2.wickets}</div>
                <div style={{ color: 'var(--text-dim)', fontSize: 10 }}>Wickets Lost</div>
              </div>
            </div>
          </div>

          <button className="btn-primary" onClick={() => {
            clearMatchStorage()
            sessionStorage.removeItem('matchSetup')
            sessionStorage.removeItem('matchState')
            navigate('/')
          }} style={{ marginBottom: 16 }}>
            🏏 NEW MATCH
          </button>
          <button className="btn-ghost" onClick={() => navigate('/stats')} style={{ width: '100%' }}>
            📊 VIEW STATS
          </button>
        </div>
      </div>
    )
  }

  const overs = groupByOvers(balls)
  const curOverBalls = overs[overs.length - 1] || []
  const maxOvers = setup.overs

  // Helper to get batsman status badge
  const getBatmanStatus = (name) => {
    if (!name) return ''
    if (state.outBatsmen?.includes(name)) return '🔴 OUT'
    if (state.retiredBatsmen?.includes(name)) return '🟡 RETIRED'
    return '✅'
  }

  return (
    <div className="page" style={{ overflowY: 'auto' }}>
      {/* ── Topbar ── */}
      <div className="topbar">
        <button className="btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => navigate('/')}>
          ✕
        </button>
        <span className="topbar-title" style={{ fontSize: 16, letterSpacing: 2 }}>
          {innings === 1 ? '1ST INNINGS' : '2ND INNINGS'}
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Validation Status Badge */}
          <div title={validationStatus.message} style={{
            padding: '4px 8px',
            borderRadius: 6,
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            background: validationStatus.valid ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            color: validationStatus.valid ? 'var(--green)' : 'var(--wicket)',
            border: `1px solid ${validationStatus.valid ? 'var(--green)' : 'var(--wicket)'}`,
          }}>
            {validationStatus.valid ? '✓' : '⚠'} {validationStatus.message?.split('|')[0]?.slice(0, 15)}
          </div>
          <button className="btn-ghost" style={{ padding: '6px 10px', fontSize: 11 }} onClick={undoBall}>
            ↩ UNDO
          </button>
        </div>
      </div>

      {/* ── Scoreboard ── */}
      <div className="scorecard" style={{ margin: '16px', marginBottom: 12, padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: 'var(--green)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6, fontWeight: 600 }}>
              🏏 {battingTeam}
            </div>
            <div style={{ fontFamily: 'var(--font-disp)', fontSize: 56, lineHeight: 1, color: 'var(--green-lt)', marginBottom: 4 }}>
              {score.runs}
              <span style={{ fontSize: 32, color: 'var(--text-dim)', marginLeft: 6 }}>/{score.wickets}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-mid)', letterSpacing: 1 }}>
              {score.fullOvers}.{score.remBalls} / {maxOvers} ov
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {innings === 2 && rrr && (
              <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '2px solid var(--gold)', borderRadius: 'var(--r)', padding: '12px', minWidth: 120 }}>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: 1, marginBottom: 4 }}>🎯 TARGET</div>
                <div style={{ fontFamily: 'var(--font-disp)', fontSize: 28, color: 'var(--gold)', fontWeight: 700 }}>{target}</div>
                <div style={{ fontSize: 10, color: rrr.rr > 12 ? 'var(--wicket)' : 'var(--green)', fontWeight: 600 }}>RRR {rrr.rr}</div>
              </div>
            )}
            {innings === 1 && (
              <div style={{ background: 'rgba(132, 204, 22, 0.1)', border: '2px solid var(--green-lt)', borderRadius: 'var(--r)', padding: '12px', minWidth: 100 }}>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: 1, marginBottom: 4 }}>CRR</div>
                <div style={{ fontFamily: 'var(--font-disp)', fontSize: 28, color: 'var(--green-lt)', fontWeight: 700 }}>{crr}</div>
              </div>
            )}
          </div>
        </div>

        {/* Current over display */}
        <div style={{ background: 'rgba(0, 0, 0, 0.2)', borderRadius: 'var(--r)', padding: '10px 12px', marginBottom: 12 }}>
          <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>THIS OVER</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-start' }}>
            {curOverBalls.map((b, i) => {
              const d = ballDisplay(b)
              return (
                <div key={i} className="event-badge" style={{
                  background: d.bg + '40',
                  borderColor: d.bg,
                  color: d.bg,
                  borderRadius: '50%',
                  width: 42,
                  height: 42,
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  fontWeight: 700,
                  fontSize: 9,
                  lineHeight: 1.1,
                  letterSpacing: '-0.5px',
                  whiteSpace: 'pre-line'
                }}>{d.label}</div>
              )
            })}
            {curOverBalls.length === 0 && <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Starting over...</span>}
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          <div className="stat-box" style={{ textAlign: 'center' }}>
            <div className="stat-value" style={{ color: 'var(--four)' }}>{score.fours}</div>
            <div className="stat-label">Fours</div>
          </div>
          <div className="stat-box" style={{ textAlign: 'center' }}>
            <div className="stat-value" style={{ color: 'var(--six)' }}>{score.sixes}</div>
            <div className="stat-label">Sixes</div>
          </div>
          <div className="stat-box" style={{ textAlign: 'center' }}>
            <div className="stat-value" style={{ color: 'var(--text-dim)' }}>{score.dots}</div>
            <div className="stat-label">Dots</div>
          </div>
          <div className="stat-box" style={{ textAlign: 'center' }}>
            <div className="stat-value" style={{ color: 'var(--wide)' }}>{score.extras}</div>
            <div className="stat-label">Extras</div>
          </div>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)} style={{
            flex: 1, padding: '10px 0', background: 'none', border: 'none',
            borderBottom: tab === i ? '2px solid var(--green)' : '2px solid transparent',
            color: tab === i ? 'var(--green-lt)' : 'var(--text-dim)',
            fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600,
            letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer',
          }}>{t}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>

        {/* ── Tab 0: Score + Ball Input ── */}
        {tab === 0 && (
          <div className="fade-in">
            {/* ── BATSMEN SECTION ── */}
            <div className="card">
              <span className="label" style={{ margin: 0, marginBottom: 12 }}>🏏 BATTING</span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10 }}>
                <button onClick={() => { setShowPlayerModal('striker'); setPlayerInput(batsmen.striker) }}
                  style={{ color: 'var(--accent)', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-disp)', textAlign: 'left', flex: 1, fontWeight: 700, letterSpacing: 1 }}>
                  ★ {batsmen.striker || 'Set Striker'}
                </button>
                {batsmen.striker && (
                  <>
                    <span style={{ fontSize: 10, color: state.outBatsmen?.includes(batsmen.striker) ? 'var(--wicket)' : 'var(--green)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      {getBatmanStatus(batsmen.striker)}
                    </span>
                    {!state.outBatsmen?.includes(batsmen.striker) && (
                      <button onClick={() => retireBatsman('striker')}
                        style={{ fontSize: 11, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--accent)', background: 'rgba(132, 204, 22, 0.1)', color: 'var(--accent)', cursor: 'pointer', fontFamily: 'var(--font-mono)', transition: 'all 0.2s' }}>
                        Retire
                      </button>
                    )}
                  </>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button onClick={() => { setShowPlayerModal('nonStriker'); setPlayerInput(batsmen.nonStriker) }}
                  style={{ color: 'var(--text-mid)', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', textAlign: 'left', flex: 1 }}>
                  ↻ {batsmen.nonStriker || 'Set Non-striker'}
                </button>
                {batsmen.nonStriker && (
                  <>
                    <span style={{ fontSize: 10, color: state.outBatsmen?.includes(batsmen.nonStriker) ? 'var(--wicket)' : 'var(--green)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      {getBatmanStatus(batsmen.nonStriker)}
                    </span>
                    {!state.outBatsmen?.includes(batsmen.nonStriker) && (
                      <button onClick={() => retireBatsman('nonStriker')}
                        style={{ fontSize: 11, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--text-dim)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-dim)', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>
                        Retire
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* ── BOWLING SECTION ── */}
            <div className="card">
              <span className="label" style={{ margin: 0, marginBottom: 12 }}>⚡ BOWLING</span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 12 }}>
                <button onClick={() => { setShowPlayerModal('bowler'); setPlayerInput(bowler) }}
                  style={{ color: 'var(--green-lt)', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-disp)', textAlign: 'left', flex: 1, fontWeight: 700, letterSpacing: 1 }}>
                  {bowler || 'Set Bowler'}
                </button>
                {bowler && (
                  <button onClick={() => { setShowPlayerModal('bowler'); setPlayerInput(bowler) }}
                    style={{ fontSize: 11, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--green-lt)', background: 'rgba(34, 197, 94, 0.1)', color: 'var(--green-lt)', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>
                    Edit
                  </button>
                )}
              </div>

              {/* Bowler stats */}
              {(() => {
                if (!bowler) return null
                const allBalls = [...inn1Balls, ...inn2Balls]
                const bowlerBalls = allBalls.filter(b => b.bowler === bowler)
                const bowlerWickets = bowlerBalls.filter(b => b.type === 'wicket').length
                const bowlerExtras = bowlerBalls.filter(b => b.type === 'wide' || b.type === 'no_ball').length
                const bowlerRuns = bowlerBalls.reduce((sum, b) => sum + b.runs, 0)
                
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    <div className="stat-box" style={{ textAlign: 'center', padding: '8px' }}>
                      <div className="stat-value" style={{ fontSize: 18, color: 'var(--green-lt)' }}>{bowlerBalls.length}</div>
                      <div className="stat-label">Balls</div>
                    </div>
                    <div className="stat-box" style={{ textAlign: 'center', padding: '8px' }}>
                      <div className="stat-value" style={{ fontSize: 18, color: 'var(--wicket)' }}>{bowlerWickets}</div>
                      <div className="stat-label">Wickets</div>
                    </div>
                    <div className="stat-box" style={{ textAlign: 'center', padding: '8px' }}>
                      <div className="stat-value" style={{ fontSize: 18, color: 'var(--wide)' }}>{bowlerExtras}</div>
                      <div className="stat-label">Extras</div>
                    </div>
                  </div>
                )
              })()}
            </div>

            {/* Bounce mode indicator */}
            {bounceMode && (
              <div style={{ fontSize: 12, color: 'var(--green)', marginBottom: 12, padding: '10px 12px', background: 'rgba(72, 187, 120, 0.1)', borderRadius: 8, textAlign: 'center', fontWeight: 600 }}>
                ↻ BOUNCE MODE: Click run button to add runs to bounce, or click B again for clean bounce
              </div>
            )}

            {/* Ball buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
              {OUTCOMES.map(o => (
                <button
                  key={o.id}
                  onClick={() => handleOutcome(o)}
                  style={{
                    padding: '20px 12px',
                    borderRadius: 'var(--r-lg)',
                    border: `3px solid ${bounceMode && o.id === 'bounce' ? '#48bb78' : o.color}`,
                    background: bounceMode && o.id === 'bounce' 
                      ? 'linear-gradient(135deg, #48bb7850, #48bb7835)' 
                      : `linear-gradient(135deg, ${o.color}30, ${o.color}15)`,
                    color: bounceMode && o.id === 'bounce' ? '#48bb78' : o.color,
                    fontFamily: 'var(--font-disp)',
                    fontSize: 32,
                    letterSpacing: 2,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    WebkitTapHighlightColor: 'transparent',
                    boxShadow: bounceMode && o.id === 'bounce' ? `0 0 20px #48bb7870` : `0 4px 12px ${o.color}30`,
                    position: 'relative',
                    overflow: 'hidden',
                    opacity: bounceMode && o.id !== 'bounce' && o.id !== 'wicket' && o.id !== 'wide' && o.id !== 'noball' ? 0.3 : 1,
                  }}
                  onPointerDown={e => {
                    e.currentTarget.style.transform = 'scale(0.92)'
                    e.currentTarget.style.boxShadow = bounceMode && o.id === 'bounce' ? `0 0 20px #48bb7880` : `0 0 20px ${o.color}70`
                  }}
                  onPointerUp={e => {
                    e.currentTarget.style.transform = 'scale(1)'
                    e.currentTarget.style.boxShadow = bounceMode && o.id === 'bounce' ? `0 0 20px #48bb7870` : `0 4px 12px ${o.color}30`
                  }}
                  onPointerLeave={e => {
                    e.currentTarget.style.transform = 'scale(1)'
                    e.currentTarget.style.boxShadow = bounceMode && o.id === 'bounce' ? `0 0 20px #48bb7870` : `0 4px 12px ${o.color}30`
                  }}
                >
                  {bounceMode && o.id === 'bounce' ? '✓ B' : o.label}
                </button>
              ))}
            </div>

            {/* Stats bar */}
            <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
              {[
                { label: '4s', val: score.fours, color: 'var(--four)' },
                { label: '6s', val: score.sixes, color: 'var(--six)' },
                { label: 'Dots', val: score.dots, color: 'var(--text-dim)' },
                { label: 'Extras', val: score.extras, color: 'var(--wide)' },
              ].map(s => (
                <div key={s.label} className="card" style={{ flex: 1, textAlign: 'center', padding: '10px 8px', margin: 0 }}>
                  <div style={{ fontFamily: 'var(--font-disp)', fontSize: 22, color: s.color }}>{s.val}</div>
                  <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: 1 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Tab 1: Over by over ── */}
        {tab === 1 && (
          <div className="fade-in">
            {overs.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 32 }}>No balls bowled yet</div>
            )}
            {overs.map((ov, i) => {
              const ovScore = ov.reduce((a, b) => a + b.runs, 0)
              return (
                <div key={i} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span className="label" style={{ margin: 0 }}>Over {i + 1}</span>
                    <span style={{ fontSize: 13, color: 'var(--accent)', fontFamily: 'var(--font-disp)', letterSpacing: 1 }}>
                      {ovScore} runs
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {ov.map((b, j) => {
                      const d = ballDisplay(b)
                      return (
                        <div key={j} style={{
                          width: 32, height: 32, borderRadius: '50%', background: d.bg, color: d.fg,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-mono)'
                        }}>{d.label}</div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Tab 2: Batting card ── */}
        {tab === 2 && (
          <div className="fade-in">
            <div className="card">
              <span className="label">Batting — {battingTeam}</span>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-dim)', letterSpacing: 1, marginBottom: 8, borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
                <span>PLAYER</span>
                <span>STATUS</span>
              </div>
              {(battingPlayers.length ? battingPlayers : ['Striker', 'Non-striker']).map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 13, color: p === batsmen.striker ? 'var(--accent)' : p === batsmen.nonStriker ? 'var(--text-mid)' : 'var(--text-dim)' }}>
                    {p === batsmen.striker ? '★ ' : ''}{p || `Player ${i + 1}`}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--green)' }}>
                    {p === batsmen.striker ? 'Batting*' : p === batsmen.nonStriker ? 'Batting' : '—'}
                  </span>
                </div>
              ))}
            </div>

            <div className="card">
              <span className="label">Bowling — {bowlingTeam}</span>
              <div style={{ fontSize: 13, color: 'var(--green-lt)' }}>⚡ {bowler || 'Not set'}</div>
            </div>
          </div>
        )}
      </div>

      {/* ── WHO Got Out Modal ── */}
      {showWicketOutModal && (
        <div className="modal-overlay" onClick={() => setShowWicketOutModal(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: 'var(--font-disp)', fontSize: 22, color: 'var(--wicket)', letterSpacing: 2, marginBottom: 16 }}>
              🔴 WHO IS OUT?
            </div>
            <button
              onClick={() => confirmWicketGetter('striker')}
              style={{
                display: 'block', width: '100%', textAlign: 'center',
                padding: '16px', marginBottom: 12, borderRadius: 10,
                border: '2px solid var(--accent)',
                background: 'rgba(190, 242, 100, 0.1)',
                color: 'var(--accent)',
                fontSize: 16, fontFamily: 'var(--font-disp)', fontWeight: 700, cursor: 'pointer',
                letterSpacing: 1,
              }}
            >
              ★ STRIKER ({batsmen.striker || '?'})
            </button>
            <button
              onClick={() => confirmWicketGetter('nonStriker')}
              style={{
                display: 'block', width: '100%', textAlign: 'center',
                padding: '16px', marginBottom: 12, borderRadius: 10,
                border: '2px solid var(--green-lt)',
                background: 'rgba(52, 211, 153, 0.1)',
                color: 'var(--green-lt)',
                fontSize: 16, fontFamily: 'var(--font-disp)', fontWeight: 700, cursor: 'pointer',
                letterSpacing: 1,
              }}
            >
              ↻ NON-STRIKER ({batsmen.nonStriker || '?'})
            </button>
          </div>
        </div>
      )}

      {/* ── Wicket Modal ── */}
      {showWicketModal && (
        <div className="modal-overlay" onClick={() => setShowWicketModal(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: 'var(--font-disp)', fontSize: 22, color: 'var(--wicket)', letterSpacing: 2, marginBottom: 16 }}>
              🚨 HOW OUT? ({wicketGetter === 'striker' ? '★ STRIKER' : '↻ NON-STRIKER'})
            </div>
            {(() => {
              // Non-striker can ONLY be run out
              if (wicketGetter === 'nonStriker') {
                return (
                  <button
                    onClick={() => setWicketType(WICKET_TYPES.RUN_OUT)}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '12px 14px', marginBottom: 8, borderRadius: 10,
                      border: `1px solid ${wicketType === WICKET_TYPES.RUN_OUT ? 'var(--wicket)' : 'var(--border2)'}`,
                      background: wicketType === WICKET_TYPES.RUN_OUT ? '#3a0000' : 'var(--bg3)',
                      color: wicketType === WICKET_TYPES.RUN_OUT ? 'var(--wicket)' : 'var(--text-mid)',
                      fontSize: 14, fontFamily: 'var(--font-mono)', cursor: 'pointer',
                    }}
                  >{WICKET_TYPES.RUN_OUT}</button>
                )
              }
              // Striker can be any wicket type
              return Object.values(WICKET_TYPES).map(w => (
                <button
                  key={w}
                  onClick={() => setWicketType(w)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '12px 14px', marginBottom: 8, borderRadius: 10,
                    border: `1px solid ${wicketType === w ? 'var(--wicket)' : 'var(--border2)'}`,
                    background: wicketType === w ? '#3a0000' : 'var(--bg3)',
                    color: wicketType === w ? 'var(--wicket)' : 'var(--text-mid)',
                    fontSize: 14, fontFamily: 'var(--font-mono)', cursor: 'pointer',
                  }}
                >{w}</button>
              ))
            })()}
            <button
              className="btn-primary"
              style={{ marginTop: 8, background: 'linear-gradient(135deg,#7f1d1d,#450a0a)', borderColor: 'var(--wicket)', color: 'var(--wicket)' }}
              disabled={!wicketType}
              onClick={confirmWicket}
            >
              CONFIRM OUT
            </button>
          </div>
        </div>
      )}

      {/* ── Player name modal ── */}
      {showPlayerModal && (
        <div className="modal-overlay" onClick={() => setShowPlayerModal(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: 'var(--font-disp)', fontSize: 20, color: 'var(--accent)', letterSpacing: 2, marginBottom: 16 }}>
              {showPlayerModal === 'nextBatsman' 
                ? `🏏 NEXT BATSMAN (${pendingNextBatsmen === 'striker' ? 'Striker' : 'Non-Striker'})`
                : showPlayerModal === 'striker' ? '🏏 EDIT STRIKER' 
                : showPlayerModal === 'bowler' ? '⚡ BOWLER' 
                : '🏏 EDIT NON-STRIKER'}
            </div>
            
            {showPlayerModal === 'nextBatsman' && (
              <div style={{ fontSize: 12, color: 'var(--text-mid)', marginBottom: 12, padding: 10, background: 'rgba(52, 211, 153, 0.1)', borderRadius: 8, borderLeft: '2px solid var(--green)' }}>
                ℹ️ Click on <strong>✅ AVAILABLE</strong> player to select
              </div>
            )}
            
            {/* Show all batsmen with their status when selecting next batsman */}
            {showPlayerModal === 'nextBatsman' && (
              <div style={{ marginBottom: 12, maxHeight: '300px', overflowY: 'auto' }}>
                {battingPlayers.filter(Boolean).map(p => {
                  const isOut = state.outBatsmen?.includes(p)
                  const isRetired = state.retiredBatsmen?.includes(p)
                  const isUsed = [state.batsmen.striker, state.batsmen.nonStriker].filter(Boolean).includes(p)
                  const isSelectable = !isOut && !isUsed
                  
                  return (
                    <button
                      key={p}
                      onClick={() => {
                        if (isSelectable) {
                          setPlayerInput(p)
                          confirmPlayer('nextBatsman')
                        }
                      }}
                      disabled={!isSelectable}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        width: '100%', textAlign: 'left',
                        padding: '12px 14px', marginBottom: 8, borderRadius: 10,
                        border: `2px solid ${isOut ? 'var(--wicket)' : isRetired ? 'var(--gold)' : isSelectable ? 'var(--green)' : 'var(--border2)'}`,
                        background: isSelectable ? 'rgba(34, 197, 94, 0.1)' : 'rgba(0,0,0,0.3)',
                        color: isOut ? 'var(--wicket)' : isSelectable ? 'var(--green)' : 'var(--text-dim)',
                        fontSize: 14, fontFamily: 'var(--font-mono)', cursor: isSelectable ? 'pointer' : 'not-allowed',
                        opacity: isSelectable ? 1 : 0.5,
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{p}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, marginLeft: 8 }}>
                        {isOut ? '🔴 OUT' : isRetired ? '🟡 RETIRED' : '✅ AVAILABLE'}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
            
            {/* For other modals (striker, non-striker, bowler) - show buttons without input */}
            {showPlayerModal !== 'nextBatsman' && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 0 }}>
                {(() => {
                  let players = showPlayerModal === 'bowler' ? bowlingPlayers : battingPlayers
                  
                  return players.filter(Boolean).map(p => (
                    <button key={p} onClick={() => {
                      setPlayerInput(p)
                      confirmPlayer(showPlayerModal)
                    }} style={{
                      padding: '12px 16px', borderRadius: 'var(--r)', 
                      border: '2px solid var(--green-lt)',
                      background: 'rgba(34, 197, 94, 0.1)',
                      color: 'var(--green-lt)',
                      fontSize: 13, fontFamily: 'var(--font-mono)', cursor: 'pointer',
                      fontWeight: 600,
                    }}>
                      {p}
                    </button>
                  ))
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Bowler selection modal (at start of each over) ── */}
      {showBowlerModal && (
        <div className="modal-overlay" onClick={() => setShowBowlerModal(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontFamily: 'var(--font-disp)', fontSize: 22, color: 'var(--green-lt)', letterSpacing: 2 }}>
                ⚡ NEXT BOWLER
              </div>
              <div style={{ fontSize: 11, padding: '4px 8px', background: 'rgba(34, 197, 94, 0.2)', borderRadius: 6, color: 'var(--green-lt)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                Over {overs.length + 1} of {setup.overs} ✓
              </div>
            </div>
            
            <div style={{ fontSize: 12, color: 'var(--text-mid)', marginBottom: 12, padding: 10, background: 'rgba(34, 197, 94, 0.1)', borderRadius: 8, borderLeft: '2px solid var(--green-lt)' }}>
              📺 Over complete - Select bowler for next over
            </div>
            
            {/* Quick pick from bowling team */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {bowlingPlayers.filter(Boolean).map(p => (
                <button key={p} onClick={() => confirmBowler(p)} style={{
                  padding: '12px 16px', borderRadius: 'var(--r)', 
                  border: `2px solid ${bowler === p ? 'var(--green-lt)' : 'var(--border2)'}`,
                  background: bowler === p ? 'rgba(34, 197, 94, 0.2)' : 'var(--bg3)',
                  color: bowler === p ? 'var(--green-lt)' : 'var(--text-mid)',
                  fontSize: 13, fontFamily: 'var(--font-mono)', cursor: 'pointer', textAlign: 'center',
                  minWidth: 80,
                }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
