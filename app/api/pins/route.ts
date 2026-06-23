import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getFeedPins } from '@/lib/pins'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const collection = searchParams.get('collection') ?? undefined
  const q = searchParams.get('q') ?? undefined
  const cursor = searchParams.get('cursor') ?? undefined

  const result = await getFeedPins({ collection, search: q, cursor })
  return NextResponse.json(result)
}
