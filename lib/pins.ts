import { createClient } from '@/lib/supabase/server'

const PAGE_SIZE = 30

export type PinWithMeta = {
  id: string
  authorId: string
  authorName: string
  authorHandle: string
  authorInitials: string
  authorAvatarUrl: string | null
  title: string
  collection: string
  tags: string[]
  imageUrl: string
  aspect: number
  sourceUrl: string | null
  notes: string | null
  createdAt: string
  likeCount: number
  likedByMe: boolean
  savedByMe: boolean
}

export type FeedResult = { pins: PinWithMeta[]; nextCursor: string | null }

type FeedRow = {
  id: string
  author_id: string
  author_name: string
  author_handle: string
  author_avatar_url: string | null
  title: string
  collection: string
  tags: string[]
  image_url: string
  aspect: number
  source_url: string | null
  notes: string | null
  created_at: string
  like_count: number
  liked_by_me: boolean
  saved_by_me: boolean
}

function initialsFrom(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

function mapRow(r: FeedRow): PinWithMeta {
  return {
    id: r.id,
    authorId: r.author_id,
    authorName: r.author_name,
    authorHandle: r.author_handle,
    authorInitials: initialsFrom(r.author_name),
    authorAvatarUrl: r.author_avatar_url,
    title: r.title,
    collection: r.collection,
    tags: r.tags ?? [],
    imageUrl: r.image_url,
    aspect: Number(r.aspect),
    sourceUrl: r.source_url,
    notes: r.notes,
    createdAt: r.created_at,
    likeCount: Number(r.like_count),
    likedByMe: r.liked_by_me,
    savedByMe: r.saved_by_me,
  }
}

async function currentUserId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function getFeedPins(opts: {
  collection?: string
  search?: string
  cursor?: string
}): Promise<FeedResult> {
  const supabase = await createClient()
  const uid = await currentUserId()
  const { data, error } = await supabase.rpc('get_feed_pins', {
    p_user_id: uid,
    p_collection: opts.collection && opts.collection !== 'TODOS' ? opts.collection : null,
    p_search: opts.search ?? null,
    p_cursor: opts.cursor ?? null,
    p_limit: PAGE_SIZE,
  })
  if (error) throw new Error(`getFeedPins: ${error.message}`)
  const rows = (data ?? []) as FeedRow[]
  const pins = rows.map(mapRow)
  const nextCursor = pins.length === PAGE_SIZE ? pins[pins.length - 1].createdAt : null
  return { pins, nextCursor }
}

export async function getPinById(id: string): Promise<PinWithMeta | null> {
  const supabase = await createClient()
  const uid = await currentUserId()
  const { data, error } = await supabase.rpc('get_feed_pins', {
    p_user_id: uid,
    p_collection: null,
    p_search: null,
    p_cursor: null,
    p_limit: 1000,
  })
  if (error) throw new Error(`getPinById: ${error.message}`)
  const row = ((data ?? []) as FeedRow[]).find((r) => r.id === id)
  return row ? mapRow(row) : null
}

export async function getRelatedPins(pin: PinWithMeta): Promise<PinWithMeta[]> {
  const { pins } = await getFeedPins({ collection: pin.collection })
  return pins.filter((p) => p.id !== pin.id)
}

export async function getRecentCollections(limit = 3): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pins')
    .select('collection, created_at')
    .order('created_at', { ascending: false })
    .limit(300)
  if (error) throw new Error(`getRecentCollections: ${error.message}`)
  const seen = new Set<string>()
  const result: string[] = []
  for (const row of (data ?? []) as { collection: string }[]) {
    if (!seen.has(row.collection)) {
      seen.add(row.collection)
      result.push(row.collection)
      if (result.length === limit) break
    }
  }
  return result
}

export async function getUserCollections(userId: string): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pins')
    .select('collection, created_at')
    .eq('author_id', userId)
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw new Error(`getUserCollections: ${error.message}`)
  const seen = new Set<string>()
  const result: string[] = []
  for (const row of (data ?? []) as { collection: string }[]) {
    if (!seen.has(row.collection)) {
      seen.add(row.collection)
      result.push(row.collection)
    }
  }
  return result
}

// Todas as coleções únicas de toda a DZ, ordenadas por mais recente
export async function getAllCollections(): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pins')
    .select('collection, created_at')
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) throw new Error(`getAllCollections: ${error.message}`)
  const seen = new Set<string>()
  const result: string[] = []
  for (const row of (data ?? []) as { collection: string }[]) {
    if (!seen.has(row.collection)) {
      seen.add(row.collection)
      result.push(row.collection)
    }
  }
  return result
}

// Todas as tags únicas já usadas na DZ, ordenadas alfabeticamente
export async function getExistingTags(): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pins')
    .select('tags')
    .limit(500)
  if (error) throw new Error(`getExistingTags: ${error.message}`)
  const seen = new Set<string>()
  for (const row of (data ?? []) as { tags: string[] }[]) {
    for (const tag of row.tags ?? []) seen.add(tag)
  }
  return Array.from(seen).sort()
}

// ── Tipos de perfil ───────────────────────────────────────────
export type ProfileWithStats = {
  id: string
  name: string
  handle: string
  avatarUrl: string | null
  createdAt: string
  pinsCount: number
  collectionsCount: number
  likesReceived: number
}

export type CollectionGroup = {
  name: string
  count: number
  previewImages: string[]  // até 4 imageUrl dos pins mais recentes
}

// ── Perfil com stats ──────────────────────────────────────────
export async function getProfileWithStats(handle: string): Promise<ProfileWithStats | null> {
  const supabase = await createClient()

  const { data: profile, error: pe } = await supabase
    .from('profiles')
    .select('id, name, handle, avatar_url, created_at')
    .eq('handle', handle)
    .single()
  if (pe || !profile) return null

  const { data: authorPins } = await supabase
    .from('pins')
    .select('id, collection')
    .eq('author_id', profile.id)

  const pins = (authorPins ?? []) as { id: string; collection: string }[]
  const pinIds = pins.map((p) => p.id)

  const pinsCount = pins.length
  const collectionsCount = new Set(pins.map((p) => p.collection)).size

  let likesReceived = 0
  if (pinIds.length > 0) {
    const { count } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .in('pin_id', pinIds)
    likesReceived = count ?? 0
  }

  return {
    id: profile.id,
    name: profile.name,
    handle: profile.handle,
    avatarUrl: profile.avatar_url,
    createdAt: profile.created_at,
    pinsCount,
    collectionsCount,
    likesReceived,
  }
}

// ── Pins de um autor (com metadados de like/save) ─────────────
export async function getAuthorPins(authorId: string): Promise<PinWithMeta[]> {
  const supabase = await createClient()
  const uid = await currentUserId()
  const { data, error } = await supabase.rpc('get_feed_pins', {
    p_user_id: uid,
    p_collection: null,
    p_search: null,
    p_cursor: null,
    p_limit: 1000,
    p_author_id: authorId,
  })
  if (error) throw new Error(`getAuthorPins: ${error.message}`)
  return ((data ?? []) as FeedRow[]).map(mapRow)
}

// ── Pins salvos por um usuário (com metadados de like/save) ───
// Carrega todos os pins e filtra pelos IDs salvos — aceitável para escala atual da DZ.
export async function getSavedPins(userId: string): Promise<PinWithMeta[]> {
  const supabase = await createClient()
  const uid = await currentUserId()

  const { data: saves } = await supabase
    .from('saves')
    .select('pin_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  const pinIds = ((saves ?? []) as { pin_id: string }[]).map((s) => s.pin_id)
  if (pinIds.length === 0) return []

  const { data, error } = await supabase.rpc('get_feed_pins', {
    p_user_id: uid,
    p_collection: null,
    p_search: null,
    p_cursor: null,
    p_limit: 2000,
    p_author_id: null,
  })
  if (error) throw new Error(`getSavedPins: ${error.message}`)

  const all = new Map(((data ?? []) as FeedRow[]).map((r) => [r.id, mapRow(r)]))
  return pinIds.map((id) => all.get(id)).filter(Boolean) as PinWithMeta[]
}

// ── Coleções derivadas de um conjunto de pins ─────────────────
// Mantém a ordem de primeira aparição (pins já vêm por created_at DESC).
export function groupByCollection(pins: PinWithMeta[]): CollectionGroup[] {
  const map = new Map<string, PinWithMeta[]>()
  for (const pin of pins) {
    if (!map.has(pin.collection)) map.set(pin.collection, [])
    map.get(pin.collection)!.push(pin)
  }
  return Array.from(map.entries()).map(([name, colPins]) => ({
    name,
    count: colPins.length,
    previewImages: colPins.slice(0, 4).map((p) => p.imageUrl),
  }))
}
