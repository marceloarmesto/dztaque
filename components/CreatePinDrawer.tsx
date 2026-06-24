'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createPin } from '@/app/(protected)/actions'

type Profile = { id: string; name: string; handle: string }

export default function CreatePinDrawer({ onClose }: { onClose: () => void }) {
  const router = useRouter()

  // Imagem
  const [imageMode, setImageMode] = useState<'upload' | 'url' | null>(null)
  const [imageUrl, setImageUrl] = useState('')
  const [imagePreview, setImagePreview] = useState('')
  const [aspect, setAspect] = useState(1.0)
  const [uploading, setUploading] = useState(false)
  const [urlLoading, setUrlLoading] = useState(false)

  // Campos
  const [title, setTitle] = useState('')
  const [collection, setCollection] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [notes, setNotes] = useState('')

  // Coleção autocomplete
  const [collectionSuggestions, setCollectionSuggestions] = useState<string[]>([])
  const [showCollectionDD, setShowCollectionDD] = useState(false)

  // Tags autocomplete
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([])
  const [showTagDD, setShowTagDD] = useState(false)

  // @Menção
  const [mentionInput, setMentionInput] = useState('')
  const [mentionSuggestions, setMentionSuggestions] = useState<Profile[]>([])
  const [mentionedUsers, setMentionedUsers] = useState<Profile[]>([])

  // Submit
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Slide-in ao montar
  const panelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    requestAnimationFrame(() => {
      if (panelRef.current) panelRef.current.style.transform = 'translateX(0)'
    })
  }, [])

  // Carregar coleções e tags da DZ ao abrir
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

  // ── Upload Cloudinary ──────────────────────────────────────
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageMode('upload')
    setUploading(true)
    setSubmitError('')
    try {
      const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
      const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
      const form = new FormData()
      form.append('file', file)
      form.append('upload_preset', preset!)
      form.append('folder', 'dztaque/pins')
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
        method: 'POST', body: form,
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message)
      setImageUrl(json.secure_url)
      setImagePreview(json.secure_url)
      setAspect(json.height / json.width)
    } catch (err) {
      setSubmitError('Erro no upload: ' + (err instanceof Error ? err.message : 'tente novamente'))
      setImageMode(null)
    } finally {
      setUploading(false)
    }
  }

  // ── URL externa ────────────────────────────────────────────
  async function handleUseUrl() {
    if (!sourceUrl.trim()) return
    setImageMode('url')
    setUrlLoading(true)
    setImageUrl(sourceUrl.trim())
    setImagePreview(sourceUrl.trim())
    try {
      const res = await fetch(`/api/image-info?url=${encodeURIComponent(sourceUrl.trim())}`)
      const { width, height } = await res.json()
      setAspect(height / width)
    } catch {}
    setUrlLoading(false)
  }

  // ── Tags ───────────────────────────────────────────────────
  function handleTagKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const val = tagInput.trim().toLowerCase().replace(/\s+/g, '-')
    if (val && !tags.includes(val)) setTags((t) => [...t, val])
    setTagInput('')
  }

  // ── @Menção ────────────────────────────────────────────────
  async function handleMentionInput(val: string) {
    setMentionInput(val)
    const q = val.replace('@', '').trim()
    if (!q) { setMentionSuggestions([]); return }
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select('id, name, handle')
      .or(`name.ilike.%${q}%,handle.ilike.%${q}%`)
      .limit(6)
    setMentionSuggestions((data ?? []) as Profile[])
  }

  function selectMention(p: Profile) {
    if (!mentionedUsers.find((u) => u.id === p.id)) {
      setMentionedUsers((u) => [...u, p])
    }
    setMentionInput('')
    setMentionSuggestions([])
  }

  // ── Submit ─────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setSubmitError('Título obrigatório'); return }
    if (!collection.trim()) { setSubmitError('Coleção obrigatória'); return }
    if (!imageUrl) { setSubmitError('Imagem obrigatória'); return }

    setSubmitting(true)
    setSubmitError('')

    const result = await createPin({
      title: title.trim(),
      collection: collection.trim(),
      tags,
      imageUrl,
      aspect,
      sourceUrl: sourceUrl.trim()
        ? sourceUrl.trim().match(/^https?:\/\//) ? sourceUrl.trim() : `https://${sourceUrl.trim()}`
        : undefined,
      notes: notes.trim() || undefined,
      mentionedUserIds: mentionedUsers.map((u) => u.id),
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
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100,
        }}
      />

      {/* Painel */}
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

            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid var(--border)',
            }}>
              <span className="caption">NOVO PIN</span>
              <button type="button" onClick={onClose} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', fontSize: '22px', lineHeight: 1, padding: 0,
              }} aria-label="Fechar">×</button>
            </div>

            {/* Imagem */}
            <div className="field">
              <label className="field-label">Imagem *</label>

              {/* Upload area */}
              {imageMode !== 'url' && !imagePreview && (
                <div
                  onClick={() => document.getElementById('pin-file-input')?.click()}
                  style={{
                    border: '1px dashed var(--border-strong)', padding: '24px',
                    textAlign: 'center', cursor: 'pointer',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--text)')}
                  onMouseOut={(e) => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
                >
                  <p className="caption" style={{ color: 'var(--text-muted)' }}>
                    {uploading ? 'ENVIANDO…' : 'CLIQUE PARA ENVIAR'}
                  </p>
                  <p className="body-sm" style={{ color: 'var(--text-faint)', marginTop: '4px' }}>
                    JPG · PNG · GIF · WebP
                  </p>
                </div>
              )}
              <input
                id="pin-file-input"
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
                disabled={uploading}
              />

              {/* Preview */}
              {imagePreview && (
                <div style={{ position: 'relative' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="preview"
                    style={{
                      width: '100%', maxHeight: '200px', objectFit: 'cover',
                      display: 'block', filter: 'grayscale(1) contrast(1.15)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => { setImageMode(null); setImageUrl(''); setImagePreview(''); setAspect(1.0) }}
                    style={{
                      position: 'absolute', top: '6px', right: '6px', background: 'rgba(0,0,0,0.6)',
                      border: 'none', color: 'var(--text)', cursor: 'pointer',
                      fontSize: '14px', padding: '2px 6px',
                    }}
                  >×</button>
                </div>
              )}
            </div>

            {/* URL de origem + usar como imagem */}
            <div className="field">
              <label className="field-label">URL de origem</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="ex: facebook.com ou https://..."
                  style={{ flex: 1 }}
                />
                {sourceUrl && !imagePreview && (
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={handleUseUrl}
                    disabled={urlLoading}
                    style={{ whiteSpace: 'nowrap', fontSize: '8px' }}
                  >
                    {urlLoading ? '…' : 'USAR COMO IMAGEM'}
                  </button>
                )}
              </div>
            </div>

            {/* Título */}
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

            {/* Coleção */}
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

            {/* Tags */}
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

            {/* @Menção */}
            <div className="field">
              <label className="field-label">Mencionar alguém</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={mentionInput}
                  onChange={(e) => handleMentionInput(e.target.value)}
                  placeholder="@nome"
                />
                {mentionSuggestions.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, background: '#222',
                    border: '1px solid var(--border)', zIndex: 5, maxHeight: '140px', overflowY: 'auto',
                  }}>
                    {mentionSuggestions.map((p) => (
                      <div
                        key={p.id}
                        onMouseDown={() => selectMention(p)}
                        style={{
                          padding: '8px 12px', cursor: 'pointer', fontSize: '11px',
                          display: 'flex', alignItems: 'center', gap: '8px',
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.background = '#333')}
                        onMouseOut={(e) => (e.currentTarget.style.background = '')}
                      >
                        <span className="avatar" style={{ width: '18px', height: '18px', fontSize: '7px' }}>
                          {p.name.split(' ').slice(0, 2).map((w) => w[0].toUpperCase()).join('')}
                        </span>
                        <span>@{p.handle}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{p.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {mentionedUsers.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '6px' }}>
                  {mentionedUsers.map((u) => (
                    <span key={u.id} className="tag-pill">
                      @{u.handle}
                      <span
                        className="remove"
                        onClick={() => setMentionedUsers((us) => us.filter((x) => x.id !== u.id))}
                      >×</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Notas */}
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

          {/* Footer */}
          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
            {submitError && (
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                {submitError}
              </p>
            )}
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'PUBLICANDO…' : 'PUBLICAR PIN'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
