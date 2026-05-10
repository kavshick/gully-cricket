import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const { data, error } = await supabase
      .from('players')
      .insert({
        ...body,
        user_id: user.id,
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
