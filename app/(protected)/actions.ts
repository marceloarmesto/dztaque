'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'

// Helper interno: busca o autor de um pin
async function getPinAuthorId(pinId: string, supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase.from('pins').select('author_id').eq('id', pinId).single()
  return (data as { author_id: string } | null)?.author_id ?? null
}

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
    // Notificação: 1ª vez, sem self-notification
    const authorId = await getPinAuthorId(pinId, supabase)
    if (authorId && authorId !== user.id) {
      const { data: existingNotif } = await supabase
        .from('notifications')
        .select('id')
        .eq('type', 'like')
        .eq('from_user_id', user.id)
        .eq('pin_id', pinId)
        .maybeSingle()
      if (!existingNotif) {
        await supabase.from('notifications').insert({
          type: 'like',
          from_user_id: user.id,
          to_user_id: authorId,
          pin_id: pinId,
        })
      }
    }
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
    // Notificação: 1ª vez, sem self-notification
    const authorId = await getPinAuthorId(pinId, supabase)
    if (authorId && authorId !== user.id) {
      const { data: existingNotif } = await supabase
        .from('notifications')
        .select('id')
        .eq('type', 'save')
        .eq('from_user_id', user.id)
        .eq('pin_id', pinId)
        .maybeSingle()
      if (!existingNotif) {
        await supabase.from('notifications').insert({
          type: 'save',
          from_user_id: user.id,
          to_user_id: authorId,
          pin_id: pinId,
        })
      }
    }
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

  // Valida que a imagem vem de domínio permitido (Cloudinary ou Unsplash para seeds)
  const ALLOWED_IMAGE_HOSTS = ['res.cloudinary.com', 'images.unsplash.com']
  try {
    const parsed = new URL(data.imageUrl)
    if (!ALLOWED_IMAGE_HOSTS.includes(parsed.hostname)) {
      return { success: false, error: 'Origem de imagem não permitida' }
    }
  } catch {
    return { success: false, error: 'URL de imagem inválida' }
  }

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

export async function markNotificationsRead(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('to_user_id', user.id)
    .eq('read', false)
}

type EditPinData = {
  pinId: string
  title: string
  collection: string
  tags: string[]
  sourceUrl?: string
  notes?: string
}

type EditPinResult = { success: true } | { success: false; error: string }

export async function editPin(data: EditPinData): Promise<EditPinResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado' }

  if (!data.title.trim()) return { success: false, error: 'Título obrigatório' }
  if (!data.collection.trim()) return { success: false, error: 'Coleção obrigatória' }

  const { error } = await supabase
    .from('pins')
    .update({
      title: data.title.trim().toUpperCase(),
      collection: data.collection.trim(),
      tags: data.tags,
      source_url: data.sourceUrl?.trim() || null,
      notes: data.notes?.trim() || null,
    })
    .eq('id', data.pinId)
    .eq('author_id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/feed')
  revalidatePath(`/pin/${data.pinId}`)
  return { success: true }
}

export async function deletePin(pinId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado' }

  const { error } = await supabase
    .from('pins')
    .delete()
    .eq('id', pinId)
    .eq('author_id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/feed')
  return { success: true }
}
