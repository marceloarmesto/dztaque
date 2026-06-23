'use client'

import { useRouter } from 'next/navigation'

export default function BackButton() {
  const router = useRouter()
  return (
    <button className="btn-ghost" onClick={() => router.back()} style={{ gap: '6px', fontSize: '9px' }}>
      ← VOLTAR
    </button>
  )
}
