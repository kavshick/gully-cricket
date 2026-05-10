import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/supabase/server'
import { updatePlayerAIScore } from '@/balancing/engine'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { match } = await request.json()

    // Upsert match state
    const { data, error } = await supabase
      .from('matches')
      .upsert({
        id: match.id,
        user_id: user.id,
        state: match,
        status: match.status,
        team_a_name: match.team_a?.name,
        team_b_name: match.team_b?.name,
        winner_team: match.winner_team_id,
        total_overs: match.rules?.max_overs,
        completed_at: match.completed_at,
      })
      .select()
      .single()

    if (error) throw error

    // If match completed, update player stats
    if (match.status === 'completed') {
      await updatePlayerStatsAfterMatch(supabase, match, user.id)
    }

    return NextResponse.json({ success: true, match_id: data.id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function updatePlayerStatsAfterMatch(supabase: any, match: any, userId: string) {
  try {
    const allPlayers = [
      ...match.team_a.players,
      ...match.team_b.players,
    ]

    for (const player of allPlayers) {
      // Aggregate stats from both innings
      const innings1 = match.innings1
      const innings2 = match.innings2

      let runsScored = 0
      let wicketsTaken = 0
      let catches = 0

      // Count from innings1
      if (innings1) {
        const battingEntry = innings1.batsmen?.find((b: any) => b.player.id === player.id)
        if (battingEntry) runsScored += battingEntry.runs || 0
        innings1.balls
          ?.filter((b: any) => b.bowler_id === player.id && b.type === 'wicket')
          .forEach(() => wicketsTaken++)
      }

      // Count from innings2
      if (innings2) {
        const battingEntry = innings2.batsmen?.find((b: any) => b.player.id === player.id)
        if (battingEntry) runsScored += battingEntry.runs || 0
        innings2.balls
          ?.filter((b: any) => b.bowler_id === player.id && b.type === 'wicket')
          .forEach(() => wicketsTaken++)
      }

      const won = match.winner_team_id === match.team_a.id
        ? match.team_a.players.some((p: any) => p.id === player.id)
        : match.team_b.players.some((p: any) => p.id === player.id)

      // Upsert player stats
      await supabase
        .from('players')
        .update({
          total_runs: supabase.rpc ? undefined : undefined, // Updated below
          matches_played: player.matches_played + 1,
          total_runs: player.total_runs + runsScored,
          total_wickets: player.total_wickets + wicketsTaken,
          wins: player.wins + (won ? 1 : 0),
          losses: player.losses + (won ? 0 : 1),
        })
        .eq('id', player.id)
        .eq('user_id', userId)
    }
  } catch (err) {
    console.error('Failed to update player stats:', err)
  }
}
