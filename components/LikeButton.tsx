'use client'

import { useState, useTransition } from 'react'
import { toggleLike } from '@/app/(protected)/actions'

export default function LikeButton({
  pinId,
  initialLiked,
  initialCount,
  showCount = true,
}: {
  pinId: string
  initialLiked: boolean
  initialCount: number
  showCount?: boolean
}) {
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [, startTransition] = useTransition()

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    const nextLiked = !liked
    setLiked(nextLiked)
    setCount((c) => c + (nextLiked ? 1 : -1))
    startTransition(async () => {
      try {
        const res = await toggleLike(pinId)
        setLiked(res.liked)
        setCount(res.count)
      } catch {
        setLiked(liked)
        setCount(count)
      }
    })
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
      {showCount && (
        <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>{count}</span>
      )}
      <button
        data-tour="like-btn"
        onClick={handleClick}
        aria-label="Curtir"
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          color: liked ? 'var(--text)' : 'var(--text-muted)',
          fontSize: '15px', lineHeight: 1,
        }}
      >
        {liked ? '♥' : '♡'}
      </button>
    </span>
  )
}
