import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.warn('Supabase env vars missing — running in offline mode')
}

export const supabase = url && key ? createClient(url, key, {
  auth: { persistSession: true },
  realtime: { params: { eventsPerSecond: 2 } } // battery: limit realtime events
}) : null

// ── Match helpers ──────────────────────────────────────────────
/**
 * Save or update a match (upsert - insert if new, update if exists)
 * Prevents duplicate entries for the same match session
 */
export async function saveMatch(matchData) {
  if (!supabase) return { data: null, error: 'offline' }
  
  // Use upsert with game_session_id as the unique key
  // This prevents duplicate records for the same match
  return supabase
    .from('matches')
    .upsert(matchData, { 
      onConflict: 'game_session_id',
      ignoreDuplicates: false 
    })
    .select()
    .single()
}

export async function updateMatch(id, updates) {
  if (!supabase) return { data: null, error: 'offline' }
  return supabase.from('matches').update(updates).eq('id', id)
}

export async function getMatches() {
  if (!supabase) return { data: [], error: null }
  // Get unique matches (latest update per game_session_id)
  return supabase
    .from('matches')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(50)
}

export async function getMatchById(gameSessionId) {
  if (!supabase) return { data: null, error: 'offline' }
  // Get by game_session_id instead of id for resume functionality
  return supabase
    .from('matches')
    .select('*')
    .eq('game_session_id', gameSessionId)
    .single()
}

// ── Player stat helpers ────────────────────────────────────────
export async function upsertPlayerStats(stats) {
  if (!supabase) return { data: null, error: 'offline' }
  return supabase.from('player_stats').upsert(stats, { onConflict: 'player_name,team_name' })
}

export async function deleteMatch(gameSessionId) {
  if (!supabase) return { error: 'offline' }
  return supabase.from('matches').delete().eq('game_session_id', gameSessionId)
}

export async function getPlayerStats() {
  if (!supabase) return { data: [], error: null }
  return supabase.from('player_stats').select('*').order('runs', { ascending: false })
}
