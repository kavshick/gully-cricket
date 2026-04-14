import { useState, useRef, useEffect, useCallback } from 'react'

const DECISIONS = ['NOT OUT ✅', 'OUT ❌', 'INCONCLUSIVE 🟡']

export default function Umpire() {
  const videoRef   = useRef(null)
  const reviewRef  = useRef(null)
  const mediaRef   = useRef(null)
  const chunksRef  = useRef([])

  const [state, setState]       = useState('idle')   // idle|preview|recording|review|decision
  const [clips, setClips]       = useState([])
  const [activeClip, setActiveClip] = useState(null)
  const [decision, setDecision] = useState('')
  const [playRate, setPlayRate] = useState(1)
  const [cameraError, setCameraError] = useState('')
  const [stream, setStream]     = useState(null)

  // Battery: release camera when not recording
  useEffect(() => {
    return () => stopStream()
  }, [])

  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop())
      setStream(null)
    }
  }, [stream])

  const startCamera = async () => {
    try {
      setCameraError('')
      // Request wide-angle / rear camera, battery-efficient resolution
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },   // rear camera
          width:  { ideal: 1280, max: 1920 },
          height: { ideal: 720,  max: 1080 },
          frameRate: { ideal: 30, max: 60 },      // cap fps for battery
        },
        audio: false,                               // no audio = less battery
      }
      const s = await navigator.mediaDevices.getUserMedia(constraints)
      setStream(s)
      if (videoRef.current) {
        videoRef.current.srcObject = s
        videoRef.current.play()
      }
      setState('preview')
    } catch (e) {
      setCameraError('Camera access denied. Allow camera permission and retry.')
    }
  }

  const startRecording = () => {
    if (!stream) return
    chunksRef.current = []
    const options = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 2_000_000 }
      : { mimeType: 'video/webm', videoBitsPerSecond: 2_000_000 }

    const mr = new MediaRecorder(stream, options)
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' })
      const url  = URL.createObjectURL(blob)
      const clip = { url, id: Date.now(), label: `Clip ${clips.length + 1}`, decision: '' }
      setClips(c => [clip, ...c])
      setActiveClip(clip)
      setState('review')
      // release live camera to save battery
      stopStream()
    }
    mr.start(100) // collect every 100ms
    mediaRef.current = mr
    setState('recording')
  }

  const stopRecording = () => {
    mediaRef.current?.stop()
  }

  const openClip = (clip) => {
    setActiveClip(clip)
    setDecision(clip.decision || '')
    setPlayRate(1)
    setState('review')
  }

  const confirmDecision = () => {
    if (!decision || !activeClip) return
    const updated = clips.map(c => c.id === activeClip.id ? { ...c, decision } : c)
    setClips(updated)
    setActiveClip({ ...activeClip, decision })
    setState('decision')
  }

  const reset = () => {
    setDecision('')
    setPlayRate(1)
    setState('idle')
    stopStream()
  }

  return (
    <div className="page" style={{ overflowY: 'auto' }}>
      <div className="topbar">
        <span className="topbar-title">THIRD UMPIRE</span>
        {state !== 'idle' && (
          <button className="btn-ghost" style={{ padding: '6px 10px', fontSize: 11 }} onClick={reset}>
            RESET
          </button>
        )}
      </div>

      <div style={{ padding: 16 }}>

        {/* ── Idle ── */}
        {state === 'idle' && (
          <div className="fade-in">
            <div className="card" style={{ textAlign: 'center', padding: 32 }}>
              <div style={{ fontSize: 52, marginBottom: 12 }}>📹</div>
              <div style={{ fontFamily: 'var(--font-disp)', fontSize: 20, color: 'var(--accent)', letterSpacing: 2, marginBottom: 8 }}>
                THIRD UMPIRE CAM
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 24, lineHeight: 1.6 }}>
                Wide-angle rear camera · Position at stumps end · Use slow-mo review to decide OUT / NOT OUT
              </div>
              {cameraError && (
                <div style={{ color: 'var(--wicket)', fontSize: 12, marginBottom: 16, background: '#3a0000', padding: 10, borderRadius: 8 }}>
                  {cameraError}
                </div>
              )}
              <button className="btn-primary" onClick={startCamera}>
                📷 START CAMERA
              </button>
            </div>

            {/* Past clips */}
            {clips.length > 0 && (
              <div>
                <span className="label">📼 Recorded Clips</span>
                {clips.map(clip => (
                  <div key={clip.id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                    onClick={() => openClip(clip)}>
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--text)' }}>{clip.label}</div>
                      {clip.decision && (
                        <div style={{ fontSize: 11, marginTop: 2, color: clip.decision.includes('NOT OUT') ? 'var(--green)' : clip.decision.includes('OUT') ? 'var(--wicket)' : 'var(--six)' }}>
                          {clip.decision}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: 18 }}>▶</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Camera Preview ── */}
        {(state === 'preview' || state === 'recording') && (
          <div className="fade-in">
            <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', marginBottom: 16, background: '#000', aspectRatio: '16/9' }}>
              <video
                ref={videoRef}
                muted
                playsInline
                autoPlay
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              {state === 'recording' && (
                <div style={{
                  position: 'absolute', top: 12, right: 12,
                  background: 'var(--wicket)', borderRadius: 20,
                  padding: '4px 10px', fontSize: 11, color: '#fff', letterSpacing: 1,
                  display: 'flex', alignItems: 'center', gap: 6,
                  animation: 'pulse 1s infinite',
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', display: 'inline-block' }} />
                  REC
                </div>
              )}
              {/* Pitch overlay guides */}
              <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                border: '1px solid rgba(56,161,105,0.3)',
                backgroundImage: 'linear-gradient(rgba(56,161,105,0.05) 1px, transparent 1px)',
                backgroundSize: '100% 25%',
              }} />
            </div>

            <div style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'center', marginBottom: 16 }}>
              📍 Position camera wide-angle facing pitch from stumps end
            </div>

            {state === 'preview' && (
              <button className="btn-primary" style={{ background: 'linear-gradient(135deg,#7f1d1d,#450a0a)', borderColor: 'var(--wicket)', color: 'var(--wicket)' }}
                onClick={startRecording}>
                ⏺ START RECORDING
              </button>
            )}
            {state === 'recording' && (
              <button className="btn-primary" onClick={stopRecording}>
                ⏹ STOP & REVIEW
              </button>
            )}
          </div>
        )}

        {/* ── Review ── */}
        {state === 'review' && activeClip && (
          <div className="fade-in">
            <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 12, background: '#000', aspectRatio: '16/9' }}>
              <video
                ref={reviewRef}
                src={activeClip.url}
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                controls
                playsInline
                onLoadedMetadata={() => {
                  if (reviewRef.current) reviewRef.current.playbackRate = playRate
                }}
              />
            </div>

            {/* Playback speed */}
            <div className="card">
              <span className="label">Playback Speed</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[0.1, 0.25, 0.5, 1].map(r => (
                  <button
                    key={r}
                    onClick={() => {
                      setPlayRate(r)
                      if (reviewRef.current) reviewRef.current.playbackRate = r
                    }}
                    style={{
                      padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
                      border: `1px solid ${playRate === r ? 'var(--six)' : 'var(--border2)'}`,
                      background: playRate === r ? '#3a2e00' : 'var(--bg3)',
                      color: playRate === r ? 'var(--six)' : 'var(--text-dim)',
                      fontSize: 12, fontFamily: 'var(--font-mono)',
                    }}
                  >{r === 1 ? '1x Normal' : `${r}x Slow`}</button>
                ))}
              </div>
            </div>

            {/* Decision */}
            <div className="card">
              <span className="label">🚨 Third Umpire Decision</span>
              {DECISIONS.map(d => (
                <button key={d} onClick={() => setDecision(d)} style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '12px 14px', marginBottom: 8, borderRadius: 10, cursor: 'pointer',
                  border: `1px solid ${decision === d ? (d.includes('NOT OUT') ? 'var(--green)' : d.includes('OUT') ? 'var(--wicket)' : 'var(--six)') : 'var(--border2)'}`,
                  background: decision === d ? (d.includes('NOT OUT') ? '#0a2a0a' : d.includes('OUT') ? '#3a0000' : '#2a1e00') : 'var(--bg3)',
                  color: d.includes('NOT OUT') ? 'var(--green-lt)' : d.includes('INCON') ? 'var(--six)' : 'var(--wicket)',
                  fontSize: 15, fontFamily: 'var(--font-disp)', letterSpacing: 2,
                }}>{d}</button>
              ))}
              <button className="btn-primary" disabled={!decision} onClick={confirmDecision}
                style={{ marginTop: 4 }}>
                CONFIRM DECISION
              </button>
            </div>

            <button className="btn-ghost" style={{ width: '100%', textAlign: 'center', marginTop: 4 }}
              onClick={() => { setState('idle'); stopStream() }}>
              ← Back to Clips
            </button>
          </div>
        )}

        {/* ── Decision screen ── */}
        {state === 'decision' && (
          <div className="fade-in" style={{ textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: 60, marginBottom: 16 }}>
              {decision.includes('NOT OUT') ? '✅' : decision.includes('INCON') ? '🟡' : '❌'}
            </div>
            <div style={{
              fontFamily: 'var(--font-disp)', fontSize: 28, letterSpacing: 4,
              color: decision.includes('NOT OUT') ? 'var(--green-lt)' : decision.includes('INCON') ? 'var(--six)' : 'var(--wicket)',
              marginBottom: 24,
            }}>
              {decision}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setState('review')}>
                ← Review Again
              </button>
              <button className="btn-primary" style={{ flex: 2 }} onClick={() => {
                setDecision('')
                setState('idle')
              }}>
                DONE
              </button>
            </div>
          </div>
        )}

      </div>

      <style>{`
        @keyframes pulse {
          0%,100% { opacity:1 }
          50% { opacity:0.4 }
        }
      `}</style>
    </div>
  )
}
