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
      onClick={handleClick}
      aria-label="Salvar"
      style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        color: saved ? 'var(--text)' : 'var(--text-muted)',
        fontSize: '14px', lineHeight: 1,
      }}
    >
      {saved ? '⊞' : '⊟'}
    </button>
  )
}
