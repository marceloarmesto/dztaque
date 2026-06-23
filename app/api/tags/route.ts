import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getExistingTags } from '@/lib/pins'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const tags = await getExistingTags()
  return NextResponse.json({ tags })
}
