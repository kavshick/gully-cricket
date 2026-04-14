/**
 * Match state persistence utilities
 * - localStorage: instant restore on page refresh (survives tab close)
 * - Supabase: cloud backup (sync across devices, permanent record)
 * - gameSessionId: unique identifier for upsert operations
 */

const MATCH_STORAGE_KEY = 'gully_matchState'
const MATCH_SETUP_KEY = 'gully_matchSetup'
const MATCH_SESSION_KEY = 'gully_matchSessionId'

/**
 * Generate or retrieve a unique session ID for this match
 * Ensures upserts update the same record instead of creating duplicates
 */
export function getOrCreateGameSessionId() {
  let sessionId = localStorage.getItem(MATCH_SESSION_KEY)
  if (!sessionId) {
    // Generate new session ID: timestamp + random
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem(MATCH_SESSION_KEY, sessionId)
  }
  return sessionId
}

/**
 * Clear session ID when starting a new match
 */
export function clearGameSessionId() {
  localStorage.removeItem(MATCH_SESSION_KEY)
}

// ── Storage Helpers ────────────────────────────────────────
// Save to localStorage (instant, survives refresh)
export function saveToLocalStorage(state, setup) {
  try {
    localStorage.setItem(MATCH_STORAGE_KEY, JSON.stringify(state))
    localStorage.setItem(MATCH_SETUP_KEY, JSON.stringify(setup))
  } catch (err) {
    console.error('localStorage save failed:', err)
  }
}

// Restore from localStorage
export function loadFromLocalStorage() {
  try {
    const state = localStorage.getItem(MATCH_STORAGE_KEY)
    const setup = localStorage.getItem(MATCH_SETUP_KEY)
    return {
      state: state ? JSON.parse(state) : null,
      setup: setup ? JSON.parse(setup) : null,
    }
  } catch (err) {
    console.error('localStorage load failed:', err)
    return { state: null, setup: null }
  }
}

// Clear saved match
export function clearMatchStorage() {
  try {
    localStorage.removeItem(MATCH_STORAGE_KEY)
    localStorage.removeItem(MATCH_SETUP_KEY)
  } catch (err) {
    console.error('localStorage clear failed:', err)
  }
}

// ── Data Validation ──────────────────────────────────────────
/**
 * Validate local state structure and data integrity
 * Returns: { valid: bool, errors: string[] }
 */
export function validateLocalState(state) {
  const errors = []

  if (!state || typeof state !== 'object') {
    errors.push('State is missing or invalid')
    return { valid: false, errors }
  }

  // Check required fields
  if (!Array.isArray(state.inn1Balls)) errors.push('inn1Balls is not an array')
  if (!Array.isArray(state.inn2Balls)) errors.push('inn2Balls is not an array')
  if (state.innings !== 1 && state.innings !== 2) errors.push('innings must be 1 or 2')
  if (state.done !== true && state.done !== false) errors.push('done must be boolean')

  // Check ball integrity (each ball should have runs and type)
  const balls = state.innings === 1 ? state.inn1Balls : state.inn2Balls
  for (let i = 0; i < balls.length; i++) {
    const ball = balls[i]
    if (typeof ball.runs !== 'number' || ball.runs < 0) {
      errors.push(`Ball ${i}: runs must be non-negative number`)
    }
    if (!ball.type || typeof ball.type !== 'string') {
      errors.push(`Ball ${i}: type is missing or invalid`)
    }
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Generate checksum of ball data for integrity checking
 * Returns a simple hash to detect if balls changed
 */
export function generateBallsChecksum(balls) {
  if (!balls || !Array.isArray(balls)) return '0'
  let checksum = 0
  for (const ball of balls) {
    checksum += (ball.runs || 0) + (ball.type?.charCodeAt(0) || 0)
  }
  return `${balls.length}_${checksum}`
}

/**
 * Compare local vs cloud state for sync validation
 * Returns: { synced: bool, issues: string[], localChecksum, cloudChecksum }
 */
export function validateCloudSync(localState, cloudRecord) {
  const issues = []

  if (!localState || !cloudRecord) {
    issues.push('Missing local or cloud state')
    return { synced: false, issues }
  }

  // Compare ball counts (should match after sync)
  const localInn1Size = localState.inn1Balls?.length || 0
  const localInn2Size = localState.inn2Balls?.length || 0
  
  // Cloud record should have matching ball counts
  const cloudInn1Size = cloudRecord.inn1?.balls?.length || 0
  const cloudInn2Size = cloudRecord.inn2?.balls?.length || 0

  if (localInn1Size !== cloudInn1Size) {
    issues.push(`Innings 1 mismatch: local has ${localInn1Size} balls, cloud has ${cloudInn1Size}`)
  }
  if (localInn2Size !== cloudInn2Size && localState.innings === 2) {
    issues.push(`Innings 2 mismatch: local has ${localInn2Size} balls, cloud has ${cloudInn2Size}`)
  }

  // Compare current batting/bowling players
  if (localState.batsmen?.striker !== cloudRecord.strikerName) {
    issues.push(`Striker mismatch: local="${localState.batsmen?.striker}" cloud="${cloudRecord.strikerName}"`)
  }
  if (localState.bowler !== cloudRecord.bowlerName) {
    issues.push(`Bowler mismatch: local="${localState.bowler}" cloud="${cloudRecord.bowlerName}"`)
  }

  // Compare innings number
  if (localState.innings !== cloudRecord.inningsNumber) {
    issues.push(`Innings mismatch: local=${localState.innings} cloud=${cloudRecord.inningsNumber}`)
  }

  const localChecksum = generateBallsChecksum(localState.inn1Balls) + '_' + generateBallsChecksum(localState.inn2Balls)
  const cloudChecksum = generateBallsChecksum(cloudRecord.inn1?.balls) + '_' + generateBallsChecksum(cloudRecord.inn2?.balls)

  return {
    synced: issues.length === 0,
    issues,
    localChecksum,
    cloudChecksum,
  }
}
