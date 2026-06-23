'use client'

import Link from 'next/link'
import type { PinWithMeta } from '@/lib/pins'
import LikeButton from './LikeButton'
import SaveButton from './SaveButton'

export default function PinCard({ pin }: { pin: PinWithMeta }) {
  const imgH = Math.round(180 * pin.aspect)
  return (
    <Link
      href={`/pin/${pin.id}`}
      style={{
        display: 'block', textDecoration: 'none', color: 'inherit',
        border: '0.5px solid var(--border)', marginBottom: '6px',
      }}
    >
      <div style={{ position: 'relative', height: `${imgH}px`, overflow: 'hidden', background: 'var(--surface-hover)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={pin.imageUrl}
          alt={pin.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
        <span style={{
          position: 'absolute', top: '6px', right: '6px', fontSize: '7px', fontWeight: 700,
          letterSpacing: '.08em', background: 'rgba(0,0,0,.55)', color: 'var(--text)',
          padding: '2px 6px', maxWidth: '120px', whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {pin.collection}
        </span>
      </div>
      <div style={{ background: 'var(--surface)', padding: '7px 8px' }}>
        <p style={{
          fontSize: '10px', fontWeight: 700, color: 'var(--text)', margin: '0 0 5px',
          textTransform: 'uppercase', letterSpacing: '.02em',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {pin.title}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a
            href={`/profile/${pin.authorHandle}`}
            onClick={(e) => e.stopPropagation()}
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            <span className="avatar" style={{ width: '16px', height: '16px', fontSize: '6px' }}>
              {pin.authorInitials}
            </span>
            <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>@{pin.authorHandle}</span>
          </a>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LikeButton pinId={pin.id} initialLiked={pin.likedByMe} initialCount={pin.likeCount} />
            <SaveButton pinId={pin.id} initialSaved={pin.savedByMe} />
          </span>
        </div>
      </div>
    </Link>
  )
}
