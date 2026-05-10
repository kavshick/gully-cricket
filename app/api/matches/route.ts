import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabase
      .from('matches')
      .select('id, status, team_a_name, team_b_name, winner_team, total_overs, created_at, completed_at')
      .order('created_at', { ascending: false })
      .limit(50)

    if (status) query = query.eq('status', status)

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()

    const body = await request.json()
    const { match } = body

    const { data, error } = await supabase
      .from('matches')
      .insert({
        user_id: null,
        state: match,
        status: match.status,
        team_a_name: match.team_a?.name,
        team_b_name: match.team_b?.name,
        total_overs: match.rules?.max_overs,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabase.from('matches').delete()
    if (status) query = query.eq('status', status)

    const { error } = await query
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
