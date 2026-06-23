'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { PinWithMeta } from '@/lib/pins'
import PinCard from './PinCard'

export default function FeedGrid({
  initialPins,
  nextCursor,
  collection,
  q,
}: {
  initialPins: PinWithMeta[]
  nextCursor: string | null
  collection: string
  q: string
}) {
  const [pins, setPins] = useState<PinWithMeta[]>(initialPins)
  const [cursor, setCursor] = useState<string | null>(nextCursor)
  const [loading, setLoading] = useState(false)
  const sentinel = useRef<HTMLDivElement | null>(null)

  // Reset quando filtros mudam (nova carga vinda do server)
  useEffect(() => {
    setPins(initialPins)
    setCursor(nextCursor)
  }, [initialPins, nextCursor])

  const loadMore = useCallback(async () => {
    if (loading || !cursor) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (collection && collection !== 'TODOS') params.set('collection', collection)
      if (q) params.set('q', q)
      params.set('cursor', cursor)
      const res = await fetch(`/api/pins?${params.toString()}`)
      if (res.ok) {
        const data = (await res.json()) as { pins: PinWithMeta[]; nextCursor: string | null }
        setPins((prev) => [...prev, ...data.pins])
        setCursor(data.nextCursor)
      }
    } finally {
      setLoading(false)
    }
  }, [loading, cursor, collection, q])

  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore() },
      { rootMargin: '600px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [loadMore])

  if (pins.length === 0) {
    return (
      <p className="caption" style={{ textAlign: 'center', color: 'var(--text-faint)', padding: '64px' }}>
        NENHUMA REFERÊNCIA ENCONTRADA
      </p>
    )
  }

  const cols: PinWithMeta[][] = [[], [], []]
  pins.forEach((pin, i) => cols[i % 3].push(pin))

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
        {cols.map((col, idx) => (
          <div key={idx}>
            {col.map((pin) => <PinCard key={pin.id} pin={pin} />)}
          </div>
        ))}
      </div>
      <div ref={sentinel} style={{ height: '1px' }} />
      {loading && (
        <p className="caption" style={{ textAlign: 'center', color: 'var(--text-faint)', padding: '24px' }}>
          CARREGANDO…
        </p>
      )}
    </>
  )
}
