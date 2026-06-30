'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deletePin } from '@/app/(protected)/actions'

export default function DeleteConfirmModal({
  pinId,
  onClose,
}: {
  pinId: string
  onClose: () => void
}) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    setDeleting(true)
    setError('')
    const result = await deletePin(pinId)
    if (result.success) {
      router.push('/feed')
    } else {
      setDeleting(false)
      setError(result.error ?? 'Erro ao excluir')
    }
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100,
        }}
      />
      <div
        style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          background: 'var(--surface)', border: '1px solid var(--border)',
          padding: '24px', maxWidth: '360px', width: '90%', zIndex: 101,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="caption" style={{ marginBottom: '10px' }}>EXCLUIR PIN?</p>
        <p className="body-sm" style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
          Essa ação não pode ser desfeita.
        </p>
        {error && (
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '14px' }}>
            {error}
          </p>
        )}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="button" className="btn-ghost" onClick={onClose} disabled={deleting}>
            CANCELAR
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            style={{
              background: '#a33', border: 'none', color: '#fff',
              padding: '10px 16px', fontSize: '11px', fontWeight: 700,
              letterSpacing: '0.04em', cursor: 'pointer', flex: 1,
            }}
          >
            {deleting ? 'EXCLUINDO…' : 'EXCLUIR'}
          </button>
        </div>
      </div>
    </>
  )
}
