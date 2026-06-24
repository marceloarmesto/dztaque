import { createClient } from '@/lib/supabase/server'

export type NotificationItem = {
  id: string
  type: 'mention' | 'like' | 'save'
  fromUserId: string
  fromName: string
  fromHandle: string
  fromInitials: string
  pinId: string
  pinTitle: string
  read: boolean
  createdAt: string
}

function initialsFrom(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

export function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  return new Date(isoString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

type NotifRow = {
  id: string
  type: 'mention' | 'like' | 'save'
  from_user_id: string
  pin_id: string
  read: boolean
  created_at: string
}

export async function getMyNotifications(userId: string): Promise<NotificationItem[]> {
  const supabase = await createClient()

  const { data: notifs, error } = await supabase
    .from('notifications')
    .select('id, type, from_user_id, pin_id, read, created_at')
    .eq('to_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw new Error(`getMyNotifications: ${error.message}`)
  if (!notifs?.length) return []

  const fromIds = Array.from(new Set((notifs as NotifRow[]).map((n) => n.from_user_id)))
  const pinIds = Array.from(new Set((notifs as NotifRow[]).map((n) => n.pin_id).filter(Boolean)))

  const [{ data: profiles }, { data: pins }] = await Promise.all([
    supabase.from('profiles').select('id, name, handle').in('id', fromIds),
    pinIds.length
      ? supabase.from('pins').select('id, title').in('id', pinIds)
      : Promise.resolve({ data: [] }),
  ])

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p as { id: string; name: string; handle: string }])
  )
  const pinMap = new Map(
    ((pins as { id: string; title: string }[] | null) ?? []).map((p) => [p.id, p])
  )

  return (notifs as NotifRow[]).map((n) => ({
    id: n.id,
    type: n.type,
    fromUserId: n.from_user_id,
    fromName: profileMap.get(n.from_user_id)?.name ?? '',
    fromHandle: profileMap.get(n.from_user_id)?.handle ?? '',
    fromInitials: initialsFrom(profileMap.get(n.from_user_id)?.name ?? ''),
    pinId: n.pin_id,
    pinTitle: pinMap.get(n.pin_id)?.title ?? '',
    read: n.read,
    createdAt: n.created_at,
  }))
}

export async function markAllRead(userId: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('to_user_id', userId)
    .eq('read', false)
}
