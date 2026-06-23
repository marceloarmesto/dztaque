'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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

type CreatePinData = {
  title: string
  collection: string
  tags: string[]
  imageUrl: string
  aspect: number
  sourceUrl?: string
  notes?: string
  mentionedUserIds: string[]
}

type CreatePinResult = { success: true; pinId: string } | { success: false; error: string }

export async function createPin(data: CreatePinData): Promise<CreatePinResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado' }

  if (!data.title.trim()) return { success: false, error: 'Título obrigatório' }
  if (!data.collection.trim()) return { success: false, error: 'Coleção obrigatória' }
  if (!data.imageUrl.trim()) return { success: false, error: 'Imagem obrigatória' }

  const { data: pin, error: pinError } = await supabase
    .from('pins')
    .insert({
      title: data.title.trim().toUpperCase(),
      collection: data.collection.trim(),
      tags: data.tags,
      image_url: data.imageUrl,
      aspect: data.aspect,
      source_url: data.sourceUrl?.trim() || null,
      notes: data.notes?.trim() || null,
      author_id: user.id,
    })
    .select('id')
    .single()

  if (pinError) return { success: false, error: pinError.message }

  if (data.mentionedUserIds.length > 0) {
    await supabase.from('notifications').insert(
      data.mentionedUserIds.map((toUserId) => ({
        type: 'mention' as const,
        from_user_id: user.id,
        to_user_id: toUserId,
        pin_id: pin.id,
      }))
    )
  }

  revalidatePath('/feed')
  return { success: true, pinId: pin.id }
}
