import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('player_analytics')
      .select('*')
      .order('total_runs', { ascending: false })

    if (error) throw error

    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, nickname')

    if (playersError) throw playersError

    const nicknameById = new Map((players ?? []).map((p: any) => [p.id, p.nickname]))
    const withNickname = (data ?? []).map((row: any) => ({
      ...row,
      nickname: row.nickname ?? nicknameById.get(row.player_id) ?? null,
    }))

    return NextResponse.json(withNickname)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
