import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/supabase/server'
import { generateBalancedTeams } from '@/balancing/engine'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { player_ids, common_player_id, team_a_name, team_b_name } = await request.json()

    if (!player_ids || player_ids.length < 2) {
      return NextResponse.json({ error: 'Need at least 2 players' }, { status: 400 })
    }

    // Fetch players from DB
    const { data: players, error } = await supabase
      .from('players')
      .select('*')
      .in('id', player_ids)
      .eq('user_id', user.id)

    if (error) throw error
    if (!players?.length) return NextResponse.json({ error: 'No players found' }, { status: 404 })

    const balance = generateBalancedTeams(
      players,
      common_player_id,
      team_a_name || 'Team A',
      team_b_name || 'Team B'
    )

    return NextResponse.json(balance)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
