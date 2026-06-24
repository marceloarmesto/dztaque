import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const url = request.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ width: 1, height: 1 })

  // Previne SSRF: só permite buscar dimensões de domínios públicos conhecidos
  const ALLOWED_FETCH_HOSTS = [
    'res.cloudinary.com',
    'images.unsplash.com',
    'i.imgur.com',
    'pbs.twimg.com',
    'cdn.dribbble.com',
    'images.squarespace-cdn.com',
  ]
  try {
    const parsed = new URL(url)
    if (!ALLOWED_FETCH_HOSTS.some((h) => parsed.hostname === h || parsed.hostname.endsWith('.' + h))) {
      return NextResponse.json({ width: 1, height: 1 })
    }
  } catch {
    return NextResponse.json({ width: 1, height: 1 })
  }

  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  if (!cloud) return NextResponse.json({ width: 1, height: 1 })

  try {
    // Cloudinary fl_getinfo retorna metadados sem fazer download completo
    const fetchUrl = `https://res.cloudinary.com/${cloud}/image/fetch/fl_getinfo/${encodeURIComponent(url)}`
    const res = await fetch(fetchUrl, { signal: AbortSignal.timeout(3000) })
    if (res.ok) {
      const json = await res.json() as { input?: { width?: number; height?: number } }
      const w = json.input?.width ?? 1
      const h = json.input?.height ?? 1
      if (w > 0 && h > 0) return NextResponse.json({ width: w, height: h })
    }
  } catch {
    // timeout ou erro de rede — retorna fallback
  }

  return NextResponse.json({ width: 1, height: 1 })
}
