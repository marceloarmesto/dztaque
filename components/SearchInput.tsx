'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

export default function SearchInput() {
  const router = useRouter()
  const params = useSearchParams()
  const [value, setValue] = useState(params.get('q') ?? '')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const q = value.trim()
    router.push(q ? `/feed?q=${encodeURIComponent(q)}` : '/feed')
  }

  return (
    <form onSubmit={submit} style={{
      flex: 1, maxWidth: '340px', margin: '0 24px', display: 'flex',
      alignItems: 'center', gap: '8px', background: 'rgba(237,232,213,.07)',
      border: '1px solid var(--border)', padding: '6px 12px',
    }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="2.5" style={{ opacity: .35, flexShrink: 0 }} aria-hidden>
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="buscar referências..."
        style={{ border: 'none', background: 'transparent', padding: 0, width: '100%', fontSize: '11px' }}
      />
    </form>
  )
}
