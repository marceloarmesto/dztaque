'use client'

import { useState, useTransition } from 'react'
import { toggleSave } from '@/app/(protected)/actions'

export default function SaveButton({
  pinId,
  initialSaved,
}: {
  pinId: string
  initialSaved: boolean
}) {
  const [saved, setSaved] = useState(initialSaved)
  const [, startTransition] = useTransition()

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    const prev = saved
    setSaved(!prev)
    startTransition(async () => {
      try {
        const res = await toggleSave(pinId)
        setSaved(res.saved)
      } catch {
        setSaved(prev)
      }
    })
  }

  return (
    <button
      data-tour="save-btn"
      onClick={handleClick}
      aria-label="Salvar"
      style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        color: saved ? 'var(--text)' : 'var(--text-muted)',
        display: 'flex', alignItems: 'center',
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24"
        fill={saved ? 'currentColor' : 'none'}
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
      </svg>
    </button>
  )
}
