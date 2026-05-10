import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/supabase/server'

const DEFAULT_PLAYERS = [
  { name: 'Darshan', nickname: null },
  { name: 'Kavshick', nickname: null },
  { name: 'Sai', nickname: null },
  { name: 'Satvik', nickname: null },
  { name: 'Jayan', nickname: null },
  { name: 'Rathish', nickname: null },
  { name: 'Prasanna', nickname: null },
  { name: 'Hari', nickname: null },
  { name: 'Gopi', nickname: null },
  { name: 'Vishnu', nickname: null },
  { name: 'Sanjai', nickname: 'Tall' },
  { name: 'Sanjai', nickname: 'Short' },
  { name: 'Vishal', nickname: null },
  { name: 'Siva', nickname: null },
  { name: 'Venkat', nickname: null },
  { name: 'Manish', nickname: null },
  { name: 'Sriram', nickname: null },
]

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw error
    if (data && data.length > 0) return NextResponse.json(data)

    const seedRows = DEFAULT_PLAYERS.map((player) => ({
      user_id: null,
      name: player.name,
      nickname: player.nickname,
      preferred_role: 'allrounder',
      batting_skill: 5,
      bowling_skill: 5,
      fielding_skill: 5,
    }))

    const { data: inserted, error: insertError } = await supabase
      .from('players')
      .insert(seedRows)
      .select('*')
      .order('name', { ascending: true })

    if (insertError) throw insertError

    return NextResponse.json(inserted ?? [])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()

    const body = await request.json()

    const { data, error } = await supabase
      .from('players')
      .insert({
        ...body,
        user_id: null,
        matches_played: 0,
        total_runs: 0,
        total_wickets: 0,
        strike_rate: 0,
        economy: 0,
        catches: 0,
        run_outs: 0,
        mvps: 0,
        wins: 0,
        losses: 0,
        ai_balance_score: (body.batting_skill + body.bowling_skill + body.fielding_skill) / 3,
        form_trend: 'stable',
        clutch_factor: 5.0,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
