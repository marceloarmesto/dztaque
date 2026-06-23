import { createClient } from '@/lib/supabase/server'

const PAGE_SIZE = 30

export type PinWithMeta = {
  id: string
  authorId: string
  authorName: string
  authorHandle: string
  authorInitials: string
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
