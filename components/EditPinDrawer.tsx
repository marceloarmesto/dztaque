'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { editPin } from '@/app/(protected)/actions'
import type { PinWithMeta } from '@/lib/pins'

export default function EditPinDrawer({
  pin,
  onClose,
}: {
  pin: PinWithMeta
  onClose: () => void
}) {
  const router = useRouter()

  const [title, setTitle] = useState(pin.title)
  const [collection, setCollection] = useState(pin.collection)
  const [tags, setTags] = useState<string[]>(pin.tags)
  const [tagInput, setTagInput] = useState('')
  const [sourceUrl, setSourceUrl] = useState(pin.sourceUrl ?? '')
  const [notes, setNotes] = useState(pin.notes ?? '')

  const [collectionSuggestions, setCollectionSuggestions] = useState<string[]>([])
  const [showCollectionDD, setShowCollectionDD] = useState(false)

  const [tagSuggestions, setTagSuggestions] = useState<string[]>([])
  const [showTagDD, setShowTagDD] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const panelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    requestAnimationFrame(() => {
      if (panelRef.current) panelRef.current.style.transform = 'translateX(0)'
    })
  }, [])

  useEffect(() => {
    fetch('/api/collections')
      .then((r) => r.json())
      .then((d) => { if (d.collections) setCollectionSuggestions(d.collections) })
      .catch(() => {})
    fetch('/api/tags')
      .then((r) => r.json())
      .then((d) => { if (d.tags) setTagSuggestions(d.tags) })
      .catch(() => {})
  }, [])

  function handleTagKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const val = tagInput.trim().toLowerCase().replace(/\s+/g, '-')
    if (val && !tags.includes(val)) setTags((t) => [...t, val])
    setTagInput('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setSubmitError('Título obrigatório'); return }
    if (!collection.trim()) { setSubmitError('Coleção obrigatória'); return }

    setSubmitting(true)
    setSubmitError('')

    const result = await editPin({
      pinId: pin.id,
      title: title.trim(),
      collection: collection.trim(),
      tags,
      sourceUrl: sourceUrl.trim()
        ? sourceUrl.trim().match(/^https?:\/\//) ? sourceUrl.trim() : `https://${sourceUrl.trim()}`
        : undefined,
      notes: notes.trim() || undefined,
    })

    setSubmitting(false)
    if (result.success) {
      onClose()
      router.refresh()
    } else {
      setSubmitError(result.error)
    }
  }

  const filteredCollections = collection
    ? collectionSuggestions.filter((c) => c.toLowerCase().includes(collection.toLowerCase()))
    : collectionSuggestions

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100,
        }}
      />

      <div
        ref={panelRef}
        style={{
          position: 'fixed', top: 0, right: 0, width: '400px', height: '100vh',
          background: 'var(--surface)', borderLeft: '1px solid var(--border)',
          zIndex: 101, transform: 'translateX(100%)', transition: 'transform 0.25s ease',
          display: 'flex', flexDirection: 'column', overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>

            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid var(--border)',
            }}>
              <span className="caption">EDITAR PIN</span>
              <button type="button" onClick={onClose} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', fontSize: '22px', lineHeight: 1, padding: 0,
              }} aria-label="Fechar">×</button>
            </div>

            <div className="field">
              <label className="field-label">URL de origem</label>
              <input
                type="text"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="ex: facebook.com ou https://..."
              />
            </div>

            <div className="field">
              <label className="field-label">Título *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="NOME DA REFERÊNCIA"
                style={{ textTransform: 'uppercase' }}
              />
            </div>

            <div className="field">
              <label className="field-label">Coleção *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={collection}
                  onChange={(e) => { setCollection(e.target.value); setShowCollectionDD(true) }}
                  onFocus={() => setShowCollectionDD(true)}
                  onBlur={() => setTimeout(() => setShowCollectionDD(false), 150)}
                  placeholder="nome da coleção"
                  autoComplete="off"
                />
                {showCollectionDD && filteredCollections.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, background: '#222',
                    border: '1px solid var(--border)', zIndex: 5, maxHeight: '160px', overflowY: 'auto',
                  }}>
                    {filteredCollections.map((c) => (
                      <div
                        key={c}
                        onMouseDown={() => { setCollection(c); setShowCollectionDD(false) }}
                        style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '11px', color: 'var(--text)' }}
                        onMouseOver={(e) => (e.currentTarget.style.background = '#333')}
                        onMouseOut={(e) => (e.currentTarget.style.background = '')}
                      >{c}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="field">
              <label className="field-label">Tags</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => { setTagInput(e.target.value); setShowTagDD(true) }}
                  onFocus={() => setShowTagDD(true)}
                  onBlur={() => setTimeout(() => setShowTagDD(false), 150)}
                  onKeyDown={handleTagKeyDown}
                  placeholder="digite e pressione Enter"
                  autoComplete="off"
                />
                {showTagDD && tagInput.trim() && (() => {
                  const q = tagInput.trim().toLowerCase()
                  const filtered = tagSuggestions.filter(
                    (t) => t.includes(q) && !tags.includes(t)
                  ).slice(0, 6)
                  return filtered.length > 0 ? (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, background: '#222',
                      border: '1px solid var(--border)', zIndex: 5, maxHeight: '140px', overflowY: 'auto',
                    }}>
                      {filtered.map((t) => (
                        <div
                          key={t}
                          onMouseDown={() => {
                            if (!tags.includes(t)) setTags((tg) => [...tg, t])
                            setTagInput('')
                            setShowTagDD(false)
                          }}
                          style={{ padding: '7px 12px', cursor: 'pointer', fontSize: '11px', color: 'var(--text)' }}
                          onMouseOver={(e) => (e.currentTarget.style.background = '#333')}
                          onMouseOut={(e) => (e.currentTarget.style.background = '')}
                        >{t}</div>
                      ))}
                    </div>
                  ) : null
                })()}
              </div>
              {tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '6px' }}>
                  {tags.map((t) => (
                    <span key={t} className="tag-pill">
                      {t}
                      <span
                        className="remove"
                        onClick={() => setTags((tg) => tg.filter((x) => x !== t))}
                      >×</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="field">
              <label className="field-label">Notas</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="contexto, por que essa referência é relevante..."
                rows={3}
              />
            </div>

          </div>

          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
            {submitError && (
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                {submitError}
              </p>
            )}
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'SALVANDO…' : 'SALVAR ALTERAÇÕES'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
