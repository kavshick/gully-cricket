import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/supabase/server'
import { generateBalancedTeams } from '@/balancing/engine'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()

    const { player_ids, team_a_name, team_b_name } = await request.json()

    if (!player_ids || player_ids.length < 2) {
      return NextResponse.json({ error: 'Need at least 2 players' }, { status: 400 })
    }

    // Fetch players from DB
    const { data: players, error } = await supabase
      .from('players')
      .select('*')
      .in('id', player_ids)

    if (error) throw error
    if (!players?.length) return NextResponse.json({ error: 'No players found' }, { status: 404 })

    const randomCommonPlayerId =
      players.length % 2 !== 0
        ? players[Math.floor(Math.random() * players.length)]?.id
        : undefined

    const balance = generateBalancedTeams(
      players,
      randomCommonPlayerId,
      team_a_name || 'Team A',
      team_b_name || 'Team B'
    )

    return NextResponse.json(balance)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
