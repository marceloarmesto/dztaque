'use client'

import { useRouter } from 'next/navigation'
import type { CollectionGroup } from '@/lib/pins'

export default function CollectionCard({ group }: { group: CollectionGroup }) {
  const router = useRouter()
  const cells = Array.from({ length: 4 }, (_, i) => group.previewImages[i] ?? null)

  return (
    <div
      onClick={() => router.push(`/feed?collection=${encodeURIComponent(group.name)}`)}
      style={{
        border: '0.5px solid var(--border)', cursor: 'pointer', marginBottom: '6px',
        transition: 'border-color .15s',
      }}
      onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
      onMouseOut={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      {/* Grid 2x2 */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        height: '120px', gap: '1px', background: 'var(--border)',
      }}>
        {cells.map((imgUrl, i) => (
          <div key={i} style={{
            background: 'var(--surface-hover)', overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {imgUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imgUrl}
                alt=""
                style={{
                  width: '100%', height: '100%', objectFit: 'cover',
                  filter: 'grayscale(1) contrast(1.15)',
                }}
              />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="rgba(237,232,213,.15)" strokeWidth="1.5" aria-hidden>
                <rect x="3" y="3" width="18" height="18" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-5-5L5 21" />
              </svg>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        background: 'var(--surface)', padding: '8px 10px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      }}>
        <p style={{
          fontSize: '11px', fontWeight: 700, color: 'var(--text)', margin: 0,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1,
        }}>
          {group.name}
        </p>
        <p style={{
          fontSize: '9px', color: 'var(--text-muted)', margin: 0,
          flexShrink: 0, marginLeft: '8px',
        }}>
          {group.count} {group.count === 1 ? 'PIN' : 'PINS'}
        </p>
      </div>
    </div>
  )
}
