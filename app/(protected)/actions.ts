'use server'

import { createClient } from '@/lib/supabase/server'

export async function toggleLike(pinId: string): Promise<{ liked: boolean; count: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data: existing } = await supabase
    .from('likes')
    .select('pin_id')
    .eq('pin_id', pinId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    await supabase.from('likes').delete().eq('pin_id', pinId).eq('user_id', user.id)
  } else {
    await supabase.from('likes').insert({ pin_id: pinId, user_id: user.id })
  }

  const { count } = await supabase
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('pin_id', pinId)

  return { liked: !existing, count: count ?? 0 }
}

export async function toggleSave(pinId: string): Promise<{ saved: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data: existing } = await supabase
    .from('saves')
    .select('pin_id')
    .eq('pin_id', pinId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    await supabase.from('saves').delete().eq('pin_id', pinId).eq('user_id', user.id)
  } else {
    await supabase.from('saves').insert({ pin_id: pinId, user_id: user.id })
  }

  return { saved: !existing }
}
